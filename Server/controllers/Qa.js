const {signatures} = require('../models');
const QABuilder = require('../controllers/builders/QABuilder');
const database = require('../config/database');
const Sequelize = require('sequelize')

const findAll = async () => {
    try {
        const inQa = await signatures.findAll({
            attributes: ['id',
            ['pattern_id', 'PatternID'],
            ['scan_uri', 'URI'],
            ['scan_header', 'Headers'],
            ['scan_parameters', 'parameters'],
            ['scan_file_name', 'file'],
            ['in_qa_internal_status_manual', 'manual'],
            ['in_qa_internal_status_performance', 'performance'],
            ['in_qa_internal_status_automation', 'automation']
                ],
                where: {status: 'in_qa'}
          })
return inQa;
    } catch (error) {
    throw new Error(`Cant get roles: ${error.message}`);
}
}


const Update = (DataToUpdate) => {
    try {
    const Qa = new QABuilder();
    console.log(DataToUpdate)
    const keys = Object.keys(DataToUpdate); 
    keys.forEach( (key) => {
            if (DataToUpdate[key].automation != undefined)
                Qa.setAutomation(DataToUpdate[key].automation);
            if (DataToUpdate[key].manual != undefined)
                Qa.setManual(DataToUpdate[key].manual);
            if (DataToUpdate[key].performance != undefined)
                Qa.setPerformance(DataToUpdate[key].performance);
            Qa.build();
           
            if (Qa.automation != undefined) {
                 signatures.update({
                    in_qa_internal_status_automation: Qa.automation
                }, {
                returning: true, where: { id: DataToUpdate[key].id }
                });
            }
            if (Qa.manual != undefined) {
                 signatures.update({
                    in_qa_internal_status_manual: Qa.manual
                }, {
                returning: true, where: { id: DataToUpdate[key].id }
                });
            }
            if (Qa.performance != undefined) {
                 signatures.update({
                    in_qa_internal_status_performance: Qa.performance
                }, {
                returning: true, where: { id: DataToUpdate[key].id }
                });
            }
        })

        checkInit()


        return "Updated successfully"
    } catch (error) {
        throw new Error(`Can't update signatures: ${error.message}`);
    }
}

const checkInit = async () => {
    try{

         new Promise((resolve, reject) => {
            setTimeout(async () => {
               
                const inInit = await database.query('select id from signatures  where status = "in_qa" and ( in_qa_internal_status_automation = "init" or in_qa_internal_status_performance = "init" or in_qa_internal_status_manual = "init")', { type: Sequelize.QueryTypes.SELECT })
                    resolve(inInit)

             }, 100)
        })
        .then(
            res => {
                if(!res.length)
                    sendMail('<h1>No init Signatures in status "in_qa" anymore</h1>');
            })
    }
    catch(error){
        throw new Error(`${error.message}`);
    }
}

module.exports = {
    findAll,
    Update}