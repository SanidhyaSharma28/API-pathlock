const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// POST /tasks - Create a new task
router.post('/', taskController.createTask);

// GET /tasks - List all tasks
router.get('/', taskController.getTasks);

// GET /tasks/:id - Get details of a specific task
router.get('/:id', taskController.getTaskById);

// PUT /tasks/:id - Update task details
router.put('/:id', taskController.updateTask);

// DELETE /tasks/:id - Delete a task
router.delete('/:id', taskController.deleteTask);

module.exports = router;
