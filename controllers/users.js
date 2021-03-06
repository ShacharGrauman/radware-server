const { users, roles } = require("../models/");
const { roles_users, historyUsersActions } = require("../models/index")
const { userValidation } = require("../middleware/validations");
const { userCreation, userUpdate } = require('../middleware/validations');
const { encrypt } = require("./encrypt");
const { RadwareError } = require('../models/Errors');


const getUserWithRoles = async (userId) => {
    if (!userId) {
        try {
            const data = await users.findAll({
                attributes: ['id', 'name', 'username', 'phone', 'status'],

                include: { model: roles, attributes: ['name'], through: { attributes: [] } }
            });
            return data;
        } catch (error) {
            throw new Error(`Cant get user: ${error.message}`);
        }
    }
    else {
        try {
            const user = await users.findByPk(userId,
                {
                    attributes: ['id', 'name', 'username', 'password', 'phone'],
                    include: { model: roles, attributes: ['id', 'name'], through: { attributes: [] } }
                });
            return user;
        } catch (error) {
            throw new Error(`Cant get user: ${error.message}`);
        }
    }
}


const deleteUser = async (user, userId) => {

    const id = await users.findOne({ attributes: ['id'], where: { username: user.username } })
    users.update(
        { status: 'deleted' },
        { where: { username: user.username } }
    )
        .then(function () {
            historyUsersActions.create({
                userId, action_name: "delete_user",
                description: `deleted user: ${id.id}`,
                time: new Date().toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: "numeric",
                    minute: "numeric"
                }), date: new Date()
            })
        }).catch(function (error) {
            return (error);
        });
}

const createUser = async (userData, userId) => {
    // const result = await Joi.validate(userData, userCreation);
    // console.log(result);
    // if (!result) {
    //     return result;
    // }
    try {
        const userAlreadyExist = await users.findOne({
            where: { username: userData.username }
        })

        if (userAlreadyExist) {
            return `User is already exists with id: ${userAlreadyExist.id}`;
        }

        else {
            const newUser = await users.create({
                name: userData.name,
                username: userData.username,
                phone: userData.phone,
                password: encrypt(userData.password)
            });
            updateRolesUsers(userData.roles, newUser.id);

            historyUsersActions.create({
                userId, action_name: "create_user",
                description: `created user: ${newUser.id}`,
                time: new Date().toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: "numeric",
                    minute: "numeric"
                }), date: new Date()
            });

            return newUser.id;
        }
    }
    catch (error) {
        throw new Error(`Cant create user: ${error.message}`);
    }
}

const editUser = async (DataToUpdate, id, userId) => {
    // const result = await Joi.validate(DataToUpdate,userUpdate);
    // console.log(result);
    // if (!result) {
    //     return result;
    // }

    try {
        if (DataToUpdate.name != undefined) {
            if (DataToUpdate.name.length != 0) {
                await users.update({
                    name: DataToUpdate.name
                },
                    {
                        returning: true, where: { id: id }
                    });
            }
        }
        if (DataToUpdate.username != undefined) {
            if (DataToUpdate.username.length != 0) {
                await users.update({
                    username: DataToUpdate.username
                },
                    {
                        returning: true, where: { id: id }
                    });
            }
        }
        if (DataToUpdate.password != undefined) {
            if (DataToUpdate.password.length != 0) {
                await users.update({ password: encrypt(DataToUpdate.password) },
                    {
                        returning: true, where: { id: id }
                    });
            }
        }
        if (DataToUpdate.phone != undefined) {
            if (DataToUpdate.phone.length != 0) {
                await users.update({
                    phone: DataToUpdate.phone
                },
                    {
                        returning: true, where: { id: id }
                    });
            }
        }
        if (DataToUpdate.roles != undefined) {
            if (DataToUpdate.roles.length != 0) {
                const roles = DataToUpdate.roles;
                roles_users.destroy({
                    where: { user_Id: id }
                });
                //Updating roles_users table
                updateRolesUsers(roles, id);
            }
        }

        historyUsersActions.create({
            userId, action_name: "edit_user",
            description: `edited user ${id}`,
            time: new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: "numeric",
                minute: "numeric"
            }), date: new Date()
        })

    }
    catch (error) {
        throw new Error(`Cant create user: ${error.message}`);
    }
}

const updateRolesUsers = async (roles, userId) => {
    try {
        var rolesUsers = [];
        for (var i = 0; i < roles.length; i++) {
            var roleUser = {
                role_id: roles[i],
                user_id: userId
            };
            rolesUsers.push(roleUser);
        }
        roles_users.bulkCreate(rolesUsers, { returning: true })


        await roles_users.bulkCreate(rolesUsers, { returning: true });

    }
    catch (error) {
        throw new Error(`Cant create user: ${error.message}`);
    }

}



module.exports = {
    getUserWithRoles,
    deleteUser,
    createUser,
    editUser,
    updateRolesUsers
};