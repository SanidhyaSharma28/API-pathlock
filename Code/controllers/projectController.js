const db = require('../db/db');

// GET /projects - List all projects
const getProjects = (req, res) => {
    const page = parseInt(req.query.page) || 1;  // Default to page 1 if no page is provided
    const status = req.query.status || ''; // Default to empty string if no status is provided
    const nameSearch = req.query.name || ''; // Search term for project name
    const limit = 3; // Fixed limit of 3 projects per page
    const offset = (page - 1) * limit; // Calculate the offset for pagination

    // Prepare the query string for projects with pagination
    let projectQuery = `SELECT projects.* FROM projects`;
    const params = [limit, offset];
    
    // Prepare the WHERE conditions (status and name)
    let whereClauses = [];
    if (status) {
        whereClauses.unshift('projects.status = ?');
        params.unshift(status); // Add status parameter to the beginning
    }
    if (nameSearch) {
        whereClauses.unshift('projects.name LIKE ?');
        params.unshift(`%${nameSearch}%`); // Add name search parameter to the beginning with LIKE pattern
    }
    
    // Add WHERE clauses to the query if any conditions are applied
    if (whereClauses.length > 0) {
        projectQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    projectQuery += ` LIMIT ? OFFSET ?`; // Apply pagination

    // Query to get the total count of projects to calculate total pages
    const countQuery = whereClauses.length > 0 
        ? `SELECT COUNT(*) AS total FROM projects WHERE ${whereClauses.join(' AND ')}`
        : `SELECT COUNT(*) AS total FROM projects`;

    // Get total projects count
    db.get(countQuery, params.slice(0, -2), (err, countResult) => {  // Remove pagination params for count query
        if (err) {
            return res.status(500).json({ error: err.message }); // Internal Server Error
        }

        const totalProjects = countResult.total;
        const totalPages = Math.ceil(totalProjects / limit); // Calculate total pages

        // Query to get the projects for the current page
        db.all(projectQuery, params, (err, projectsRows) => {
            if (err) {
                return res.status(500).json({ error: err.message }); // Internal Server Error
            }

            // Now, query the tasks for all fetched projects
            const projectIds = projectsRows.map(row => row.id);
            
            const tasksQuery = `
                SELECT tasks.*, tasks.project_id
                FROM tasks
                WHERE tasks.project_id IN (${projectIds.join(',')})
            `;
            
            db.all(tasksQuery, [], (err, tasksRows) => {
                if (err) {
                    return res.status(500).json({ error: err.message }); // Internal Server Error
                }

                // Group tasks by project
                const projects = projectsRows.map(project => {
                    // Find all tasks for the current project
                    const projectTasks = tasksRows.filter(task => task.project_id === project.id);
                    
                    // Map each task to the required format
                    const tasks = projectTasks.map(task => ({
                        id: task.id,
                        status: task.status,
                        name: task.name
                    }));

                    return {
                        ...project,
                        tasks
                    };
                });

                // Return paginated results with metadata
                res.json({
                    projects,
                    page,
                    totalPages,
                    totalProjects
                });
            });
        });
    });
};


// GET /projects/:id - Get details of a specific project
const getProjectById = (req, res) => {
    const { id } = req.params;

    db.all(`
        SELECT projects.*, 
               tasks.id AS task_id, 
               tasks.name AS task_name
        FROM projects
        LEFT JOIN tasks ON projects.id = tasks.project_id
        WHERE projects.id = ?
    `, [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message }); // Internal Server Error
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' }); // Not Found
        }

        // Create project object and add tasks
        const project = {
            id: rows[0].id,
            name: rows[0].name,
            description: rows[0].description,
            start_date: rows[0].start_date,
            end_date: rows[0].end_date,
            status: rows[0].status,
            tasks: []
        };

        rows.forEach(row => {
            if (row.task_id) {
                project.tasks.push({
                    id: row.task_id,
                    name: row.task_name
                });
            }
        });

        res.json(project); // Return project with tasks
    });
};

// POST /projects - Create a new project
const createProject = (req, res) => {
    const { name, description, start_date, end_date, status } = req.body;

    // Ensure required fields are present
    if (!name || !status) {
        return res.status(400).json({ error: 'Name and Status are required' }); // Bad Request
    }

    const stmt = db.prepare("INSERT INTO projects (name, description, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)");
    stmt.run(name, description, start_date, end_date, status, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message }); // Internal Server Error
        }
        res.status(201).json({ id: this.lastID, name, description, start_date, end_date, status }); // Created
    });
};

// PUT /projects/:id - Update project details
const updateProject = (req, res) => {
    const { id } = req.params;
    const { name, description, start_date, end_date, status } = req.body;

    // Ensure required fields are present
    if (!name || !status) {
        return res.status(400).json({ error: 'Name and Status are required' }); // Bad Request
    }

    const stmt = db.prepare("UPDATE projects SET name = ?, description = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?");
    stmt.run(name, description, start_date, end_date, status, id, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message }); // Internal Server Error
        }
        res.json({ id, name, description, start_date, end_date, status }); // OK
    });
};

// DELETE /projects/:id - Delete a project
const deleteProject = (req, res) => {
    const { id } = req.params;

    // Step 1: Check if the project exists
    const checkProjectStmt = db.prepare("SELECT 1 FROM projects WHERE id = ?");
    checkProjectStmt.get(id, (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Error checking if project exists: ' + err.message });
        }

        if (!row) {
            return res.status(404).json({ error: `Project with ID ${id} not found or already deleted.` });
        }

        // Step 2: If the project exists, proceed with deletion
        db.serialize(() => {
            // Delete all task assignments related to the project
            const deleteAssignmentsStmt = db.prepare("DELETE FROM task_assignments WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)");
            deleteAssignmentsStmt.run(id, (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error deleting task assignments: ' + err.message });
                }
            });

            // Delete all tasks related to the project
            const deleteTasksStmt = db.prepare("DELETE FROM tasks WHERE project_id = ?");
            deleteTasksStmt.run(id, (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error deleting tasks: ' + err.message });
                }
            });

            // Delete the project itself
            const deleteProjectStmt = db.prepare("DELETE FROM projects WHERE id = ?");
            deleteProjectStmt.run(id, (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                res.status(200).json({
                    message: `Project with ID ${id} was deleted successfully.`
                });
            });
        });
    });
};


module.exports = {
    getProjects,
    createProject,
    getProjectById,
    updateProject,
    deleteProject
};
