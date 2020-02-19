module.exports = (db, type) => {
    return db.define('history_users_actions', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true
        }, 
        user_id: {
            type: type.INTEGER
        },
        action_name: {
            type: type.ENUM('add', 'edit', 'delete', 'search', 'delete',
            'report','export_for_git', 'export_for_qa','export_for_testing')
        },
        description: {
            type: type.STRING
        },
        time: {
            type: type.TIME      
        },
        date: {
            type: type.DATE
        }
    }, { timestamps: false, underscored: true })
} 