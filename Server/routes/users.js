var express = require('express');
var userController = require('../controllers/users');

var router = express.Router();
var roleController = require('../controllers/roles');

/* GET users listing. */
router.get('/', async (req, res) => {
  console.log('ssssssss');
  try{
    const users = await userController.getUserWithRoles();
    res.status(200).json(users);
  }catch(error){
    res.status(500).json({msg: error.message});
  }
});

router.post('/new_user', async (req, res, next) => {
  if(!req.body.username || 
     !req.body.phone || 
     !req.body.password || 
     !req.body.status)
  {
    res.status(400).json({ msg: "body is not valid" });
  }
  try {
      const result = await userController.createUser(req.body);
      res.status(201).json({userId: result.id});
  }catch (error) {
      res.status(500).json({ msg: error.message });
      console.log("create user doesn't work from routes");
  }
});

router.put('/delete_user', async (req, res, next) => {
  if(!req.body.username )
  {
    res.status(400).json({ msg: "username is not valid" });
  }
  try {
      const result = await userController.deleteUser(req.body.username);
      res.status(201).json({msg: 'deleted successfully'});
  }catch (error) {
      res.status(500).json({ msg: error.message });
  }
});

router.get('/roles', async (req, res) => {
  try{
    const roles = await roleController.findRoles();
    res.status(200).json(roles);
  }catch(error){
    res.status(500).json({msg: error.message});
  }
});

module.exports = router;
