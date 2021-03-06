const { signatures, historyUsersActions, attack, file, param, externalReferences, vulnDataExtra, webServer, users, signatureStatusHistory } = require('../models');
const sequelize = require('../config/database');
require('./sendEmail');
require('./XML/exportXML');
require('./XML/importXml');
require('./Text/exportFile');

const { signatureValidation, external_referenceValidation, fileValidation, web_serverValidation
    , attackValidation, permessionValidation, parameterValidation, vuln_data_extraValidation } = require('../middleware/validations');


const { signatureCreation, signatureUpdate } = require('../middleware/validations');
const Op = require('sequelize').Op;

// const findStatus = async() =>{
//     sequelize.define('model', {
//         status: {
//           type:   Sequelize.ENUM,
//           values: ['in progress','in test','in QA','published','suspended','deleted']
//         }
//       })
// }


// const sigByAttack = async () => {
//     try {
//         const signaturesByAttack = await signatures.findAll({

//             include:[{model:attack, attributes:['name']}],
//             group: ['attack_id'],
//             attributes: ['attack_id', [sequelize.fn('COUNT', 'attack_id'), 'SigCount']],
//         }) 
//         console.log(signaturesByAttack);
//         return signaturesByAttack;
//     } catch (error) {
//         throw new Error(`Cant get signatures: ${error.message}`);
//     }
// }
const sigBySeverity = async (userId) => {
    try {
        const signaturesBySeverity = await attack.findAll({
            attributes: ['name'],
            include: [{ model: signatures, attributes: ['severity', [sequelize.fn('COUNT', 'severity'), 'attackSevCount'],] }],
            group: ['attack_id', 'severity'],
        })
        historyUsersActions.create({
            user_id: userId, action_name: "search",
            description: "Search signature by severity",
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()
        });
        return signaturesBySeverity;
    } catch (error) {
        throw new Error(`Cant get signatures: ${error.message}`);
    }
}

const sigByReference = async (query, userId) => {

    try {
        let result = [], serialArray = [], signaturesCveid = [], count
        if (query.serial) {

            const referenceArray = await sequelize.query(`select SignatureId from external_references where type = "cveid" and reference like "%${query.year}-${query.serial}%"`, { type: sequelize.QueryTypes.SELECT })

            for (i = 0; i < referenceArray.length; i++) {

                const signaturesByCveId = await signatures.findOne({
                    attributes: ['id',
                        ['pattern_id', 'patternId'],
                        'description',
                        'status'],
                    where: { id: referenceArray[i].SignatureId }
                })

                signaturesCveid.push(signaturesByCveId)
            }
            historyUsersActions.create({
                userId, action_name: "report",
                description: "View signature reports by year and serial number",
                time: new Date().toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: "numeric",
                    minute: "numeric"
                }), date: new Date()
            });
            return signaturesCveid

        }

        else {

            const referencesArray = await sequelize.query(`select reference from external_references where type = "cveid" and reference like "%${query.year}-%"`, { type: sequelize.QueryTypes.SELECT })

            for (i = 0; i < referencesArray.length; i++) {
                count = 0
                serialNumber = referencesArray[i].reference.slice(referencesArray[i].reference.length - 4)
                if (!serialExist(serialArray, serialNumber)) {
                    serialArray.push(serialNumber)
                    for (j = i; j < referencesArray.length; j++) {
                        if (serialNumber === referencesArray[j].reference.slice(referencesArray[j].reference.length - 4))
                            count++
                    }

                    var temp = { cveid: `${query.year}-${serialNumber}`, quantity: count }
                    result.push(temp)
                }
            }

            historyUsersActions.create({
                userId, action_name: "report",
                description: "View signature reports by year",
                time: new Date().toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: "numeric",
                    minute: "numeric"
                }), date: new Date()
            });

            return result
        }


    } catch (error) {
        throw new Error(`${error.message}`)
    }
}

const serialExist = (arr, serial) => {
    for (let i of arr) {
        if (i == serial)
            return true
    }
    return false
}

/// history 
const copySignature = async (id, userId) => {

    try {
        signatures.addHook('afterCreate', (copiedSignature, options) => {

            signatures.update({
                pattern_id: copiedSignature.id
            }, { where: { id: copiedSignature.id } })
        })


       


        const currentSignature = await signatures.findByPk(id,{
            // where: { id: id },
            include: [
            { model: param },
            { model: externalReferences },
            { model: vulnDataExtra },
            { model: webServer },
            ]
            // include: [{ all: true }]
        });


        console.log('sssssssssssssssssssssssss')
        console.log(currentSignature.dataValues.id)



        const copiedSignature = await signatures.create({
            attack_id: currentSignature.attack_id,
            type: currentSignature.type,
            creation_time: currentSignature.creation_time,
            creation_date: currentSignature.creation_date,
            status: currentSignature.status,
            in_qa_internal_status_manual: currentSignature.in_qa_internal_status_manual,
            in_qa_internal_status_performance: currentSignature.in_qa_internal_status_performance,
            in_qa_internal_status_automation: currentSignature.in_qa_internal_status_automation,
            vuln_data: currentSignature.vuln_data,
            keep_order: currentSignature.keep_order,
            start_break: currentSignature.start_break,
            end_break: currentSignature.end_break,
            right_index: currentSignature.right_index,
            left_index: currentSignature.left_index,
            scan_uri: currentSignature.scan_uri,
            scan_header: currentSignature.scan_header,
            scan_body: currentSignature.scan_body,
            scan_parameters: currentSignature.scan_parameters,
            scan_file_name: currentSignature.scan_file_name,
            severity: currentSignature.severity,
            description: currentSignature.description,
            test_data: currentSignature.test_data,
            attack_id: currentSignature.attackId,
            user_id: currentSignature.userId,
            limit: currentSignature.limit
        });

      
                ///feach external reference data
                
                currentSignature.external_references.map(externalRef => {
                    externalReferences.create({
                        // id: externalRef.id,
                        type: externalRef.type,
                        reference: externalRef.reference,
                        signatureId: copiedSignature.id
                    });
                })
                ///feach web server data
                currentSignature.web_servers.map(webServ => {
                    webServer.create({
                        // id: webServ.id,
        
                        web: webServ.web,
                        signatureId: copiedSignature.id
                    });
                })
        
                ///feach vuln_data_extras data 
                currentSignature.vuln_data_extras.map(vlunData => {
                    vulnDataExtra.create({
                        // id: vlunData.id,
                        signatureId: copiedSignature.id,
                        description: vlunData.description
                    });
                });
                /// feach parameters data 
                currentSignature.parameters.map(params => {
                    param.create({
                        // id: params.id,
                        parameter: params.parameter,
                        signatureId: copiedSignature.id,
                    });
                });

        historyUsersActions.create({
            userId, action_name: "add_signature",
            description: "Copy signature " + id,
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()
        });

        return copiedSignature
    } catch (error) {
        throw new Error(`Can't copy signature ${error.message}`)
    }
}

/// history 
const exportTestDataFile = async id => {
    try {
        const signatureData = await signatures.findAll({
            where: {
                id
            },
        });
        /// func to write 
        exportTestData(signatureData);
    } catch (error) {
        throw new Error(`cant get signatures: ${error.message}`)
    }
}

/// history 
const exportAllTestDataFile = async () => {


    try {
        const signatureData = await signatures.findAll();
        exportTestData(signatureData);
    } catch (error) {
        throw new Error(`cant get signatures: ${error.message}`)
    }
}



const findAll = async () => {
    try {
        const signatureData = await signatures.findAll();
        sendMail('<h1>find all success </h1>');
        return signatureData;
    } catch (error) {
        throw new Error(`Cant get signatures: ${error.message}`);
    }
}

// const importFile = async () => {
//     try {
//         await importSignatures();
//         return 'imported';
//     } catch (error) {
//         throw new Error(`cant get signatures: ${error.message}`)
//     }
// }



const importFile = async (path) => {
    try {
        await importSignatures(path);
        return 'imported';
    } catch (error) {
        throw new Error(`cant get signatures: ${error.message}`)
    }
}

const exportFile = async id => {
    try {
        const signatureData = await signatures.findAll({
            where: {
                id
            },
            include: [
                { model: attack },
                { model: param },
                { model: externalReferences },
                { model: vulnDataExtra },
                { model: webServer },
                { model: param }
            ]
        });
        routeByType(signatureData);
    } catch (error) {
        throw new Error(`cant get signatures: ${error.message}`)
    }
}

const exportAllFile = async (query) => {
    let firstStatus, secStatus;

    if (query === 'Git') {
        firstStatus = 'published';
        secStatus = 'published';
    }
    if (query === 'Testing') {
        firstStatus = 'published';
        secStatus = 'in_test';
    }
    if (query === 'QA') {
        firstStatus = 'published';
        secStatus = 'in_qa';
    }

    try {
        const signatureData = await signatures.findAll({
            where: {
                status: {
                    [Op.or]: [firstStatus, secStatus]
                }
            },
            include: [
                { model: attack },
                { model: param },
                { model: externalReferences },
                { model: vulnDataExtra },
                { model: webServer }
            ]
        });
        routeByType(signatureData);
    } catch (error) {
        throw new Error(`cant get signatures: ${error.message}`)
    }
}



const loadSignaturesToExport = async (query) => {
    try {
        let signatureData, lastExportedSignatureDateByStatus, firstStatus, secStatus, checkDateOf, signatureDataToXML;

        if (query.exportTo === 'Git') {
            firstStatus = 'published';
            secStatus = 'published';
            checkDateOf = 'export_for_git';
        }
        if (query.exportTo === 'Testing') {
            firstStatus = 'published';
            secStatus = 'in_test';
            checkDateOf = 'export_for_testing';
        }
        if (query.exportTo === 'QA') {
            firstStatus = 'published';
            secStatus = 'in_qa';
            checkDateOf = 'export_for_qa';

        }
        lastExportedSignatureDateByStatus = await historyUsersActions.findAll({
            attributes: ['date'],
            where: {
                action_name: checkDateOf
            },
            order:
                [
                    ['date', 'desc']
                ],
            limit: 1,
        });
        let date = lastExportedSignatureDateByStatus.length ? lastExportedSignatureDateByStatus[0].date : new Date();

        signatureData = await signatures.findAll({
            attributes: ['id', 'pattern_id', 'description', 'test_data'],
            where: {
                status: {
                    [Op.or]: [firstStatus, secStatus]
                }
            },
            order:
                [
                    [query.sortBy, query.orderBy]
                ],
            offset: (parseInt(query.page) - 1) * parseInt(query.size),
            limit: parseInt(query.size) + 1
        });

        
        let hasNext = false, hasPrev = false;
        if(query.size < signatureData.length)
            hasNext = true;

        signatureData = signatureData.slice(0, -1)
        
        if (query.page != 1) {
            hasPrev = true;
        }


        signatureData.map((signature) => {
            if (signature.test_data == ("" || null)) {
                signature.test_data = false;
            } else {
                signature.test_data = true;
            }
        });
        if (secStatus === 'in_qa') {
            secStatus = 'In QA';
        }
        if (secStatus === 'in_test') {
            secStatus = 'In Test';
        }
        let status = [firstStatus] + ", " + [secStatus];
        if (firstStatus === secStatus) {
            secStatus = undefined;
            status = [firstStatus];
        }
        return {
            signatureData,
            date,
            hasNext,
            hasPrev,
            status
        };
    } catch (error) {
        throw new Error(`Cant get signatures: ${error.message}`);
    }
}
const sigByAttack = async (user) => {
    try {
        const signaturesByAttack = await signatures.findAll({

            include: [{ model: attack, attributes: ['name'] }],
            group: ['attack_id'],
            attributes: ['attack_id', [sequelize.fn('COUNT', 'attack_id'), 'SigCount']],
        })
        historyUsersActions.create({
            userId: user.id, action_name: "search",
            description: "Search signature by attacks ",
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()
        });
        return signaturesByAttack;
    } catch (error) {
        throw new Error(`Cant get signatures: ${error.message}`);
    }
}

const sigPerSeverity = async (user) => {
    try {
        const sigPerSeverity = await signatures.findAll({
            group: ['severity'],
            attributes: ['severity', [sequelize.fn('COUNT', 'severity'), 'SigSevCount']],
        })
        historyUsersActions.create({
            userId: user.id, action_name: "search",
            description: "Search signature per severity ",
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()
        });
        return sigPerSeverity;
    } catch (error) {
        throw new Error(`Cant get signatures: ${error.message}`);
    }
}

const loadSignatures = async (query) => {
    try {
        let signatureData, signaturesCountByStatus, hasMore;
        if (query.status === 'all') {

            signatureData = await signatures.findAll({
                attributes: ['id', 'pattern_id', 'description'],
                order:
                    [
                        [query.sortBy, query.orderBy], ['creation_time', query.orderBy]
                    ],

                offset: (parseInt(query.page) - 1) * parseInt(query.size),
                limit: parseInt(query.size),
            });

            hasMore = await signatures.findAll({
                attributes: ['id'],
                order:
                    [
                        [query.sortBy, query.orderBy]
                    ],

                offset: (parseInt(query.page) - 1) * parseInt(query.size),
                limit: parseInt(query.size + 1),
            });
        } else {

            signatureData = await signatures.findAll({
                attributes: ['id', 'pattern_id', 'description'],
                where: {
                    status: query.status
                },
                order:
                    [
                        [query.sortBy, query.orderBy], ['creation_time', query.orderBy]
                    ],

                offset: (parseInt(query.page) - 1) * parseInt(query.size),

                limit: parseInt(query.size),
            });

            hasMore = await signatures.findAll({
                attributes: ['id', 'pattern_id', 'description'],
                where: {
                    status: query.status
                },
                order:
                    [
                        [query.sortBy, query.orderBy]
                    ],

                offset: (parseInt(query.page) - 1) * parseInt(query.size),

                limit: parseInt(query.size + 1),
            });

        }
        signaturesCountByStatus = [{ status: "published", Count: 0 },
        { status: "in_progress", Count: 0 },
        { status: "in_test", Count: 0 },
        { status: "in_qa", Count: 0 }, 
        { status: "suspended", Count: 0 },
        { status: "deleted", Count: 0 }
        ]

        const statuses = await signatures.findAll({
            group: ['status'],
            attributes: ['status', [sequelize.fn('COUNT', 'status'), 'Count']],
        });


        statuses.map(sts => {
            signaturesCountByStatus.map(sig => {
                if(sts.status == sig.status)
                    sig.Count = sts.dataValues.Count
            })
        })


        let hasNext = false, hasPrev = false;
        if (hasMore.length > query.size)
            hasNext = true;

        if (query.page != 1) {
            hasPrev = true;
        }

        return {
            signatureData,
            signaturesCountByStatus,
            hasNext,
            hasPrev,

        };
    } catch (error) {

        throw new Error(`Cant get signatures: ${error.message}`);
    }
}



const create = async (signatureData, userId) => {
    // let result = await Joi.validate(signatureData, signatureValidation);
    // if (!result) {
    //     return result;
    // }


    signatures.addHook('afterCreate', (signatureDataCreate, options) => {

        signatures.update({
            pattern_id: signatureDataCreate.id
        }, { where: { id: signatureDataCreate.id } })
    });
    try {
        const signatureDataCreate = await signatures.create({
            
            attack_id: signatureData.attack_id,
            type: signatureData.type,
            creation_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }),
            creation_date: new Date(),
            status: signatureData.status,
            vuln_data: signatureData.vuln_data,
            keep_order: signatureData.keep_order,
            start_break: signatureData.start_break,
            end_break: signatureData.end_break,
            right_index: signatureData.right_index,
            left_index: signatureData.left_index,
            scan_uri: signatureData.scan_uri,
            scan_header: signatureData.scan_header,
            scan_body: signatureData.scan_body,
            scan_parameters: signatureData.scan_parameters,
            scan_file_name: signatureData.scan_file_name,
            severity: signatureData.severity,
            description: signatureData.description,
            test_data: signatureData.test_data,
            user_id: userId,
            limit: signatureData.limit
        });

    
        ///feach external reference data
        signatureData.external_references.map(externalRef => {
            externalReferences.create({
                // id: externalRef.id,
                type: externalRef.type,
                reference: externalRef.reference,
                signatureId: signatureDataCreate.id
            });
        })
        ///feach web server data
        signatureData.web_servers.map(webServ => {
            webServer.create({
                // id: webServ.id,

                web: webServ.web,
                signatureId: signatureDataCreate.id
            });
        })

        ///feach vuln_data_extras data 
        signatureData.vuln_data_extras.map(vlunData => {
            vulnDataExtra.create({
                // id: vlunData.id,
                signatureId: signatureDataCreate.id,
                description: vlunData.description
            });
        });
        /// feach parameters data 
        signatureData.parameters.map(params => {
            param.create({
                // id: params.id,
                parameter: params.parameter,
                signatureId: signatureDataCreate.id,
            });
        });

        historyUsersActions.create({
            userId, action_name: "add_signature",
            description: "add signature: " + signatureDataCreate.id,
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()
        });

        signatureStatusHistory.create({
            user_id: userId, signature_id: signatureDataCreate.id,
            status: signatureDataCreate.status,
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()
        })

        return signatureDataCreate;
    } catch (error) {

        throw new Error(`Cant create signatures: ${error.message}`);
    }

}

const searchSignature = async (search, userId) => {
    try {
        const signatureData = await signatures.findAll(search);
        historyUsersActions.create({
            userId, action_name: "search",
            description: "search signatures",
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()
        });
        return signatureData;
    } catch (error) {
        throw new Error(`Can't get signatures: ${error.message}`);
    }
}

const findById = async (id, userId) => {
    try {
        const signatureData = await signatures.findAll({
            where: { id: id },
            include: [{ model: file },
            { model: attack },
            { model: param },
            { model: externalReferences },
            { model: vulnDataExtra },
            { model: webServer },
            { model: signatureStatusHistory }
            ]
            // include: [{ all: true }]
        });
        historyUsersActions.create({
            userId, action_name: "search",
            description: "search signature by id " + id,
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()
        });

        return signatureData;
    } catch (error) {
        throw new Error(`Cant get signatures: ${error.message}`);
    }
}

const update = async (DataToUpdate, id, userId) => {
    // let result = await Joi.validate(signatureData, signatureValidation);
    // if (!result) {
    //     return result;
    // }
    const sigStatus = await signatures.findOne({ attributes: ['status'], where: { id: id } })
    if (sigStatus.status === 'suspended' || sigStatus.status === 'deleted') {
        return "Can't update signature, signature is in suspended or deleted status."
    }

    if (DataToUpdate.status === 'in_qa' && sigStatus.status != 'in_qa') {
        DataToUpdate.in_qa_internal_status_manual = 'init'
        DataToUpdate.in_qa_internal_status_performance = 'init'
        DataToUpdate.in_qa_internal_status_automation = 'init'
    }
    try {
        const updatedSignature = signatures.update({
            type: DataToUpdate.type,
            status: DataToUpdate.status,
            in_qa_internal_status_manual: DataToUpdate.in_qa_internal_status_manual,
            in_qa_internal_status_performance: DataToUpdate.in_qa_internal_status_performance,
            in_qa_internal_status_automation: DataToUpdate.in_qa_internal_status_automation,
            vuln_data: DataToUpdate.vuln_data,
            keep_order: DataToUpdate.keep_order,
            start_break: DataToUpdate.start_break,
            end_break: DataToUpdate.end_break,
            right_index: DataToUpdate.right_index,
            scan_uri: DataToUpdate.scan_uri,
            scan_header: DataToUpdate.scan_header,
            scan_body: DataToUpdate.scan_body,
            scan_parameters: DataToUpdate.scan_parameters,
            scan_file_name: DataToUpdate.scan_file_name,
            severity: DataToUpdate.severity,
            description: DataToUpdate.description,
            test_data: DataToUpdate.test_data,
            attack_id: DataToUpdate.attack_id,
            limit: DataToUpdate.limit
        }, { returning: true, where: { id: id } });
        
        webServer.destroy(
            { where: { signatureId: id } })       

        DataToUpdate.web_servers.map(webServ =>
            webServer.create({
                signatureId: id,
                web: webServ.web
            })
        );
        
        vulnDataExtra.destroy(
            { where: { signatureId: id } })        

        DataToUpdate.vuln_data_extras.map((vuln) =>
            vulnDataExtra.create({
                signatureId: id, description: vuln.description
            })
        );
       
        param.destroy(
            { where: { signatureId: id } })       

        DataToUpdate.parameters.map(paramNode =>
            param.create({
                signatureId: id, parameter: paramNode.parameter
            })
        );


        // file.destroy(
        //     { where: { signatureId: id } })


        // DataToUpdate.files.map(fileNode =>
        //     file.create({
        //         signatureId: id, file: fileNode.file
        //     })
        // );


        externalReferences.destroy(
            { where: { signatureId: id } })

        DataToUpdate.external_references.map(ref =>
            externalReferences.create({
                signatureId: id, reference: ref.reference, type: ref.type
            })
        );


        historyUsersActions.create({
            userId, action_name: "edit_signature",
            description: "edit signature " + id,
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()
        });
        // console.log(DataToUpdate.status)

        signatureStatusHistory.create({
            user_id: userId, signature_id: id,
            status: DataToUpdate.status,
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()

        })

        return updatedSignature;
    } catch (error) {

        throw new Error(`Cant update signatures: ${error.message}`);
    }
}

const Delete = async (id, userId) => {
    try {
        const result = signatures.destroy({
            where: { id: id }
        })
        historyUsersActions.create({
            userId, action_name: "delete_signature",
            description: "delete signature " + id,
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()
        });
        return result;
    } catch (error) {
        throw new Error(`Cant get signatures: ${error.message}`);
    }
}


module.exports = {
    findAll,
    findById,
    create,
    update,
    Delete,
    searchSignature,
    loadSignatures,
    loadSignaturesToExport,
    exportFile,
    sigByAttack,
    sigPerSeverity,
    importFile,
    sigBySeverity,
    //findStatus
    exportAllFile,
    sigByReference,
    copySignature,
    exportTestDataFile,
    exportAllTestDataFile

};