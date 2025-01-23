const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// POST /projects - Create a new project
router.post('/', projectController.createProject);

// GET /projects - List all projects
router.get('/', projectController.getProjects);

// GET /projects/:id - Get details of a specific project
router.get('/:id', projectController.getProjectById);

// PUT /projects/:id - Update project details
router.put('/:id', projectController.updateProject);

// DELETE /projects/:id - Delete a project
router.delete('/:id', projectController.deleteProject);

module.exports = router;
