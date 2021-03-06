var fs = require('fs');
var convert = require('xml-js');
const { roles_users, users, signatures, externalReferences, webServer, attack, vulnDataExtra, historyUsersActions } = require('../../models');
const { findById } = require('../../controllers/signature');
var SignatureController = require('../../controllers/signature');
addSignatureToDataTable = async (signatureData, userId) => {
  userId = await roles_users.findOne({
    attributes: ['user_id'],
    where: { role_id: 2 },
  });
  userId = userId.dataValues.user_id;
  try {

    let attackData = await attack.findOne({
      where: {
        name: signatureData.AttackName
      },
    });
    //   // /// attack data 
    if (!attackData.dataValues.id) {
      attackData = await attack.create({
        name: signatureData.AttackName
      });
    }


    const signatureDataCreate = await signatures.create({
      user_id: userId,
      pattern_id: signatureData.PatternID,
      attack_id: parseInt(attackData.dataValues.id),
      type: signatureData.type,
      creation_time: signatureData.creation_time,
      creation_date: signatureData.creation_date,
      status: signatureData.status,
      in_qa_internal_status_manual: 'init',
      in_qa_internal_status_performance: 'init',
      in_qa_internal_status_automation: 'init',
      vuln_data: signatureData.VulnData || 'fake data',
      keep_order: signatureData.KeepOrder,
      start_break: null,
      end_break: null,
      right_index: signatureData.RightIndex,
      left_index: signatureData.LeftIndex,
      scan_uri: signatureData.ScanUri,
      scan_header: signatureData.ScanHeader,
      scan_body: signatureData.ScanBody,
      scan_parameters: signatureData.ScanParameters,
      scan_file_name: signatureData.scan_file_name,
      severity: signatureData.Severity,
      description: signatureData.Description || null,
      test_data: null,
      limit: signatureData.limit || null
    });
    //// feach file data 
    // signatureData.files.map(FileData => {
    //     file.create({
    //         // id: FileData.id,
    //         signatureId: signatureDataCreate.id,
    //         file: FileData.file
    //     });
    // })


    //     // ///feach external reference data
    signatureData.external_references.map(externalRef => {
      externalReferences.create({
        type: externalRef.type || null,
        reference: externalRef.reference || null,
        signatureId: signatureDataCreate.id
      });
    })
    try {
      // ///feach web server data
      signatureData.web_servers.map(webServ => {
        webServer.create({
          web: webServ,
          signatureId: signatureDataCreate.id
        });
      })
    } catch (error) {
      //throw new Error(`${error.message}`);
    }
    try {
      ///feach vuln_data_extras data 
      signatureData.vuln_data_ex.map(vulnData => {
        vulnDataExtra.create({
          // id: vlunData.id,
          signatureId: signatureDataCreate.id,
          description: vulnData
        });
      });
    } catch (error) {
      //throw new Error(`${error.message}`);
    }
    // /// feach parameters data 
    signatureData.Params.map(params => {
      param.create({
        parameter: params,
        signatureId: signatureDataCreate.id,
      });
    });
  } catch (error) {
    historyUsersActions.create({
      userId, action_name: "add_signature",
      description: "failed to import ",
      time: new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: "numeric",
        minute: "numeric"
      }), date: new Date()
    });
    //throw new Error(`Cant create signatures: ${error.message}`);
  }
}
// With parser
importSignatures = async (path) => {
  dirname = path;

  fs.readFile(dirname, function (err, data) {
    const signaturesToImport = JSON.parse(convert.xml2json(data, { compact: false, spaces: 4 }));
    console.log(signaturesToImport)
    signaturesToImport.elements[1].elements.map(signature => {
      try {
        let typeOfData;
        if (signature.name === 'VulnEx') { typeOfData = 'vuln_ex' };
        if (signature.name === 'Vuln') { typeOfData = 'vuln' };
        if (signature.name === 'VulnRegEx') { typeOfData = 'vuln_reg_ex' };
        let signatureOfXml = {
          user_id: "id", attack_id: null, type: typeOfData, creation_time: new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: "numeric",
            minute: "numeric"
          }), creation_date: new Date(), status: 'published'
        };
        let signatureCopy = {};
        signature.elements.map(element => {
          try {
            Object.assign(signatureOfXml, {
              [element.name]: element.elements[0].text || null,
            });
            Object.assign(signatureCopy, {
              [element.name]: element.elements || null,
            });
          } catch (error) {
            //throw new Error(`${error.message}`);
          }
        })
        let fragments = signature.elements[1].elements[0].elements;
        let vuln_data = []
        fragments.map(element => {
          //  console.log(element.name);
          //  console.log(element.elements);
          let data = element.elements || null;
          // console.log('fragment error-doesnt work-----------'+[element.name]);
          try {
            Object.assign(signatureOfXml, {
              [element.name]: data[0].text
            });
            if ([element.name] == 'VulnDataEx') {
              vuln_data.push(data[0].text || null);
            }
          } catch (error) {
            //throw new Error(`${error.message}`);
          }
        });

        let externalReferences = [];
        try {
          signatureCopy.RelatedInfo.map(refer => {
            // console.log(refer.elements[0].text);
            let reference = refer.elements[0].text.split('=');
            externalReferences.push({ type: reference[0], reference: reference[1] });
          })
        } catch (error) {
          //throw new Error(`${error.message}`);
        }
        //}
        try {
          Object.assign(signatureOfXml, {
            external_references: externalReferences
          });
        } catch{
          //err => console.log("assign reference doesn't work"); 
        }
        //----------------------------------------------------------------------------//
        //}
        try {
          Object.assign(signatureOfXml, {
            vuln_data_ex: vuln_data
          });
        } catch (error) {
          //    throw new Error(`${error.message}`);
        }
        //----------------------------------------------------------------------------//
        let web_servers = [];
        try {
          signatureCopy.WebServers.map(webServer => {
            web_servers.push(webServer);
          })
        } catch (error) {
          //    throw new Error(`${error.message}`);
        }

        try {
          Object.assign(signatureOfXml, {
            web_servers: web_servers
          });
        } catch (error) {
          //      throw new Error(`${error.message}`);
        }
        try {
          Object.assign(signatureOfXml, {
            VulnData: signatureOfXml.VulnDataEx
          });
        } catch (error) {
          //        throw new Error(`${error.message}`);
        }
        addSignatureToDataTable(signatureOfXml, 1);
      } catch (error) {
        //        throw new Error(`${error.message}`);
      }
    });
  });
}
module.exports = { importSignatures }




// var fs = require('fs');
// var convert = require('xml-js');

// const { roles_users, users, signatures, externalReferences, webServer, attack, vulnDataExtra, historyUsersActions } = require('../../models');
// const { findById } = require('../../controllers/signature');
// var SignatureController = require('../../controllers/signature');



// addSignatureToDataTable = async (signatureData,userId) => {
//   userId = await roles_users.findOne({
//     attributes: ['user_id'],
//     where: { role_id: 2 },

//   });
//   userId = userId.dataValues.user_id;
//   try {

//   let attackData = await attack.findOne({
//     where: {
//       name: signatureData.AttackName
//     },
// });
// //   // /// attack data 
// if(!attackData.dataValues.id){
//   attackData = await attack.create({
//     name: signatureData.AttackName
//   });
// }




//     const signatureDataCreate = await signatures.create({
//       user_id: userId,
//       pattern_id: signatureData.PatternID,
//       attack_id: parseInt(attackData.dataValues.id),
//       type: signatureData.type,
//       creation_time: signatureData.creation_time,
//       creation_date: signatureData.creation_date,
//       status: signatureData.status,
//       in_qa_internal_status_manual: 'init',
//       in_qa_internal_status_performance: 'init',
//       in_qa_internal_status_automation: 'init',
//       vuln_data: signatureData.VulnData || 'fake data',
//       keep_order: signatureData.KeepOrder,
//       start_break: null,
//       end_break: null,
//       right_index: signatureData.RightIndex,
//       left_index: signatureData.LeftIndex,
//       scan_uri: signatureData.ScanUri,
//       scan_header: signatureData.ScanHeader,
//       scan_body: signatureData.ScanBody,
//       scan_parameters: signatureData.ScanParameters,
//       scan_file_name: signatureData.scan_file_name,
//       severity: signatureData.Severity,
//       description: signatureData.Description || null,
//       test_data: null,
//       limit: signatureData.limit || null
//     });
//     //// feach file data 
//     // signatureData.files.map(FileData => {

//     //     file.create({
//     //         // id: FileData.id,
//     //         signatureId: signatureDataCreate.id,
//     //         file: FileData.file
//     //     });

//     // })


//     //     // ///feach external reference data
//     signatureData.external_references.map(externalRef => {
//       externalReferences.create({
//         type: externalRef.type || null,
//         reference: externalRef.reference || null,
//         signatureId: signatureDataCreate.id
//       });
//     })
//     try{
//     // ///feach web server data
//     signatureData.web_servers.map(webServ => {
//         webServer.create({
//             web: webServ,
//             signatureId: signatureDataCreate.id
//         });
//     })
//   }catch{ err => console.log(err);}

//   try{
//     ///feach vuln_data_extras data 
//     signatureData.vuln_data_ex.map(vulnData => {
//         vulnDataExtra.create({
//             // id: vlunData.id,
//             signatureId: signatureDataCreate.id,
//             description: vulnData
//         });
//     });
//   }catch{}
//     // /// feach parameters data 
//     signatureData.Params.map(params => {
//         param.create({
//             parameter: params,
//             signatureId: signatureDataCreate.id,
//         });
//     });

//   } catch (error) {
//     historyUsersActions.create({
//       userId , action_name: "add_signature",
//       description: "failed to import ",
//       time: new Date().toLocaleTimeString('en-US', {
//           hour12: false,
//           hour: "numeric",
//           minute: "numeric"
//       }), date: new Date()
//   });
//     throw new Error(`Cant create signatures: ${error.message}`);
//   }

// }
// // With parser
// importSignatures = async () => {
//   dirname = '../radware-server/vuln-example-signatures.xml';


//   fs.readFile(dirname, function (err, data) {
//     const signaturesToImport = JSON.parse(convert.xml2json(data, { compact: false, spaces: 4 }));
//     signaturesToImport.elements[1].elements.map(signature => {

//       try {
//         let typeOfData;
//         if (signature.name === 'VulnEx') { typeOfData = 'vuln_ex' };
//         if (signature.name === 'Vuln') { typeOfData = 'vuln' };
//         if (signature.name === 'VulnRegEx') { typeOfData = 'vuln_reg_ex' };


//         let signatureOfXml = {
//           user_id: "id", attack_id: null, type: typeOfData, creation_time: new Date().toLocaleTimeString('en-US', {
//             hour12: false,
//             hour: "numeric",
//             minute: "numeric"
//           }), creation_date: new Date(), status: 'published'
//         };
//         let signatureCopy = {};
//         signature.elements.map(element => {
//           try {
//             Object.assign(signatureOfXml, {
//               [element.name]: element.elements[0].text || null,
//             });
//             Object.assign(signatureCopy, {
//               [element.name]: element.elements || null,
//             });

//           } catch{ err => console.log(err); }


//         })


//         let fragments = signature.elements[1].elements[0].elements;
//         let vuln_data=[]

//         fragments.map(element => {
//           //  console.log(element.name);
//           //  console.log(element.elements);
//           let data = element.elements || null;
//           // console.log('fragment error-doesnt work-----------'+[element.name]);

//           try {
//             Object.assign(signatureOfXml, {
//               [element.name]: data[0].text
//             });
//             if([element.name] == 'VulnDataEx'){
//               vuln_data.push(data[0].text || null);
//             }
//           } catch{ err => console.log(err); }
//         });

//         let externalReferences = [];

//         try {
//           signatureCopy.RelatedInfo.map(refer => {
//             // console.log(refer.elements[0].text);
//             let reference = refer.elements[0].text.split('=');
//             externalReferences.push({ type: reference[0], reference: reference[1] });

//           })
//         } catch{
//           console.log(externalReferences, ' error');
//         }
//         //}
//         try {
//           Object.assign(signatureOfXml, {
//             external_references: externalReferences
//           });
//         } catch{ err => console.log("assign reference doesn't work"); }
//         //----------------------------------------------------------------------------//
//           //}
//           try {
//             Object.assign(signatureOfXml, {
//               vuln_data_ex: vuln_data
//             });
//           } catch{ err => console.log("vuln_dataEx doesn't work"); }
//           //----------------------------------------------------------------------------//
//         let web_servers = [];

//         try {
//           signatureCopy.WebServers.map(webServer => {
//             web_servers.push(webServer);
//           })
//         } catch{
//           console.log( 'web servers pulling failed - error');
//         }

//         try {
//           Object.assign(signatureOfXml, {
//             web_servers: web_servers
//           });
//         } catch{ err => console.log("assign web servers doesn't work"); }        
//         try {
//           Object.assign(signatureOfXml, {
//             VulnData: signatureOfXml.VulnDataEx
//           });
//         } catch{ err => console.log(err); }


//         addSignatureToDataTable(signatureOfXml,1);

//       } catch{ console.log(signature.name); }
//     });


//   });
// }






// module.exports = { importSignatures }



