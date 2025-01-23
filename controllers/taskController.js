const db = require('../db/db');
const { updateProject } = require('./projectController');

// GET /tasks - List tasks with pagination and optional status filter
const getTasks = (req, res) => {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if no page is provided
    const limit = 3; // Fixed limit of 3 tasks per page
    const offset = (page - 1) * limit; // Calculate the offset for pagination

    // Get the status filter if it's provided in the query (default is no filter)
    const status = req.query.status || ''; // Default to empty string if no status is provided
    const nameSearch = req.query.name || ''; // Search term for task name

    // Start building the SQL query
    let countQuery = 'SELECT COUNT(*) AS total FROM tasks';
    let tasksQuery = `
        SELECT tasks.*, GROUP_CONCAT(users.id || ':' || users.name) AS assigned_users
        FROM tasks
        LEFT JOIN task_assignments ON tasks.id = task_assignments.task_id
        LEFT JOIN users ON task_assignments.user_id = users.id
        WHERE 1=1
    `;

    const queryParams = [];

    // Apply the status filter if it's provided
    if (status) {
        countQuery += ' WHERE status = ?';
        tasksQuery += ' AND tasks.status = ?';
        queryParams.push(status);
    }

    // Apply the name search filter if it's provided
    if (nameSearch) {
        countQuery += status ? ' AND tasks.name LIKE ?' : ' WHERE tasks.name LIKE ?';
        tasksQuery += ' AND tasks.name LIKE ?';
        queryParams.push(`%${nameSearch}%`); // Add LIKE parameter with % for partial matching
    }

    // Get the total count of tasks based on the applied filters (status and name search)
    db.get(countQuery, queryParams, (err, countResult) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const totalTasks = countResult.total;
        const totalPages = Math.ceil(totalTasks / limit); // Calculate total pages

        // Query to get the tasks for the current page with the filters applied (if any)
        tasksQuery += `
            GROUP BY tasks.id
            LIMIT ? OFFSET ?
        `;

        queryParams.push(limit, offset); // Add pagination parameters to the queryParams array

        // Get tasks based on the filtered query
        db.all(tasksQuery, queryParams, (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Format the result to include task details and the list of assigned users with their ids
            const tasks = rows.map(task => {
                // Parse the assigned_users to extract user_id and name
                const assignedUsers = task.assigned_users
                    ? task.assigned_users.split(',').map(user => {
                          const [userId, userName] = user.split(':');
                          return { id: userId, name: userName };
                      })
                    : [];

                return {
                    id: task.id,
                    project_id: task.project_id,
                    name: task.name,
                    description: task.description,
                    due_date: task.due_date,
                    status: task.status,
                    assigned_users: assignedUsers // Array of objects containing user_id and user_name
                };
            });

            // Return paginated results with metadata
            res.json({
                tasks,
                page,
                totalPages,
                totalTasks
            });
        });
    });
};

// GET /tasks/:id - Get task details by ID
const getTaskById = (req, res) => {
    const { id } = req.params;

    db.all(
        `SELECT users.id AS user_id, users.name AS user_name
         FROM tasks
         LEFT JOIN task_assignments ON tasks.id = task_assignments.task_id
         LEFT JOIN users ON task_assignments.user_id = users.id
         WHERE tasks.id = ?`,
        [id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Task not found. Please check task id.' });
            }

            // Get task details
            db.get(
                `SELECT * FROM tasks WHERE id = ?`,
                [id],
                (err, taskRow) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    if (!taskRow) {
                        return res.status(404).json({ message: 'Task not found.' });
                    }

                    // Format the result to include task details and the list of assigned users
                    const task = {
                        id: taskRow.id,
                        project_id: taskRow.project_id,
                        name: taskRow.name,
                        description: taskRow.description,
                        due_date: taskRow.due_date,
                        status: taskRow.status,
                        assigned_users: rows.map(row => ({
                            user_id: row.user_id,
                            user_name: row.user_name
                        })) // Format assigned users with both id and name
                    };

                    res.json(task);
                }
            );
        }
    );
};

// POST /tasks - Create a new task
const createTask = (req, res) => {
    const { project_id, name, description, due_date, status, assigned_users } = req.body;

    // Validate input
    if (!project_id || !name || !status || !assigned_users || assigned_users.length === 0) {
        return res.status(400).json({ error: 'Project ID, task name, status, and at least one user assignment are required.' });
    }

    // Step 1: Check if the project exists
    db.get('SELECT 1 FROM projects WHERE id = ?', [project_id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(400).json({ error: `Project with ID ${project_id} does not exist.` });
        }

        // Step 2: Check if all user_ids exist in the users table
        const userCheckQuery = `SELECT id FROM users WHERE id IN (${assigned_users.join(',')})`;

        db.all(userCheckQuery, (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const existingUserIds = rows.map(row => row.id);
            const invalidUserIds = assigned_users.filter(userId => !existingUserIds.includes(userId));

            if (invalidUserIds.length > 0) {
                return res.status(400).json({
                    error: `Users with IDs ${invalidUserIds.join(', ')} do not exist.`
                });
            }

            // Step 3: Check if any user has 5 active tasks
            const activeTasksCheckQuery = `
                SELECT user_id, COUNT(*) AS active_tasks_count 
                FROM task_assignments
                JOIN tasks ON task_assignments.task_id = tasks.id
                WHERE task_assignments.user_id IN (${assigned_users.join(',')})
                  AND tasks.status IN ('Pending', 'In Progress')  -- Define your active task statuses
                GROUP BY user_id
            `;

            db.all(activeTasksCheckQuery, (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // Check for users that already have 5 active tasks
                const userWithExcessTasks = rows.find(row => row.active_tasks_count >= 5);

                if (userWithExcessTasks) {
                    return res.status(400).json({
                        error: `User with ID ${userWithExcessTasks.user_id} already has 5 active tasks. Please assign this task to someone else.`
                    });
                }

                // Step 4: If all checks pass, create the task
                const stmt = db.prepare("INSERT INTO tasks (project_id, name, description, due_date, status) VALUES (?, ?, ?, ?, ?)");
                stmt.run(project_id, name, description, due_date, status, function (err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    const task_id = this.lastID;  // The ID of the newly created task

                    // Step 5: Now insert task assignments into task_assignments table
                    const insertAssignmentsStmt = db.prepare("INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)");
                    assigned_users.forEach(user_id => {
                        insertAssignmentsStmt.run(task_id, user_id, (err) => {
                            if (err) {
                                return res.status(500).json({ error: err.message });
                            }
                        });
                    });

                    res.status(201).json({
                        message: 'Task created successfully',
                        task_id,
                        project_id,
                        name,
                        description,
                        due_date,
                        status,
                        assigned_users
                    });
                });
            });
        });
    });
};

// PUT /tasks/:id - Update task details
const updateTask = (req, res) => {
    const { id } = req.params;
    const { name, description, due_date, status } = req.body;

    // Check if at least one field is provided to update
    if (!name && !description && !due_date && !status) {
        return res.status(400).json({ error: 'Please provide at least one field to update.' });
    }

    // First, check if the task exists and get the project_id
    db.get(`SELECT project_id FROM tasks WHERE id = ?`, [id], (err, task) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!task) {
            return res.status(404).json({ error: 'Task not found.' });
        }

        const projectId = task.project_id;

        // Update the task status to "Completed" first
        db.run(`UPDATE tasks SET name = ?, description = ?, due_date = ?, status = ? WHERE id = ?`,
            [name, description, due_date, status, id], function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // If the status is being set to "Completed", check the project tasks
                if (status === 'Completed') {
                    db.all(`SELECT status FROM tasks WHERE project_id = ?`, [projectId], (err, tasks) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }

                        // Check if all tasks are completed
                        const allCompleted = tasks.every(t => t.status === 'Completed');

                        if (allCompleted) {
                            // If all tasks are completed, update the project status to "Completed"
                            db.run(`UPDATE projects SET status = 'Completed' WHERE id = ?`, [projectId], (err) => {
                                if (err) {
                                    return res.status(500).json({ error: err.message });
                                }

                                // Successfully updated project status
                                res.json({
                                    message: 'Task updated and project marked as completed successfully.',
                                    id,
                                    name,
                                    description,
                                    due_date,
                                    status
                                });
                            });
                        } else {
                            // If not all tasks are completed, just return success
                            res.json({
                                message: 'Task updated successfully.',
                                id,
                                name,
                                description,
                                due_date,
                                status
                            });
                        }
                    });
                } else {
                    // If the task is not being set to "Completed", just return success
                    res.json({
                        message: 'Task updated successfully.',
                        id,
                        name,
                        description,
                        due_date,
                        status
                    });
                }
            });
    });
};

// DELETE /tasks/:id - Delete a task and its assignments
const deleteTask = (req, res) => {
    const { id } = req.params;

    // Start a transaction to ensure both deletions happen together
    db.serialize(() => {
        // Delete all task assignments for the specific task
        db.run("DELETE FROM task_assignments WHERE task_id = ?", [id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Now delete the task from the tasks table
            const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
            stmt.run(id, (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                res.status(204).json({ message: "Task deleted successfully" }); // No content to return, successful deletion
            });
        });
    });
};

module.exports = {
    deleteTask,
    updateTask,
    updateProject,
    createTask,
    getTasks,
    getTaskById,
};
