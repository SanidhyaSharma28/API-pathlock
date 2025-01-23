const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST /users - Create a new user
router.post('/', userController.createUser);

// GET /users - List all users
router.get('/', userController.getUsers);

// GET /users/:id - Get details of a specific user
router.get('/:id', userController.getUserById);

// PUT /users/:id - Update user details
router.put('/:id', userController.updateUser);

// DELETE /users/:id - Delete a user
router.delete('/:id', userController.deleteUser);

module.exports = router;
