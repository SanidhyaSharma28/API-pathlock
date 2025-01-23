const db = require('../db/db');

// GET /users - List all users with their assigned tasks
const getUsers = (req, res) => {
    db.all(`
        SELECT users.*, 
               tasks.id AS task_id,
               tasks.name AS task_name,
               tasks.status AS task_status
        FROM users
        LEFT JOIN task_assignments ON users.id = task_assignments.user_id
        LEFT JOIN tasks ON task_assignments.task_id = tasks.id
    `, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message }); // Internal Server Error
        }

        // Group tasks by user
        const users = [];
        rows.forEach(row => {
            let user = users.find(u => u.id === row.id);

            if (!user) {
                user = {
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    tasks: []
                };
                users.push(user);
            }

            if (row.task_id) {
                user.tasks.push({
                    id: row.task_id,
                    name: row.task_name,
                    status: row.task_status
                });
            }
        });

        res.json({ users }); // Return all users with their tasks
    });
};

// GET /users/:id - Get details of a specific user by ID
const getUserById = (req, res) => {
    const { id } = req.params;

    db.all(`
        SELECT users.*, 
               tasks.id AS task_id,
               tasks.name AS task_name,
               tasks.status AS task_status
        FROM users
        LEFT JOIN task_assignments ON users.id = task_assignments.user_id
        LEFT JOIN tasks ON task_assignments.task_id = tasks.id
        WHERE users.id = ?
    `, [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message }); // Internal Server Error
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found. Please check user id.' }); // Not Found
        }

        // Group tasks by user
        const user = {
            id: rows[0].id,
            name: rows[0].name,
            email: rows[0].email,
            tasks: []
        };

        rows.forEach(row => {
            if (row.task_id) {
                user.tasks.push({
                    id: row.task_id,
                    name: row.task_name,
                    status: row.task_status
                });
            }
        });

        res.json(user); // Return user details with tasks
    });
};

// POST /users - Create a new user
const createUser = (req, res) => {
    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
        return res.status(400).json({ error: 'Please provide both name and email.' }); // Bad Request
    }

    const stmt = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
    stmt.run(name, email, function (err) {
        if (err) {
            // Check if the error is due to a unique constraint violation on the email
            if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(400).json({ error: 'Email must be unique. This email is already taken.' }); // Bad Request
            }
            return res.status(500).json({ error: err.message }); // Internal Server Error
        }

        res.status(201).json({ id: this.lastID, name, email, message: 'User created successfully' }); // Created
    });
};

// PUT /users/:id - Update user details
const updateUser = (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;

    // Check if at least one field (name or email) is provided for update
    if (!name && !email) {
        return res.status(400).json({ error: 'Please provide name or email that is to be updated.' }); // Bad Request
    }

    // Prepare the SQL update statement
    const stmt = db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
    
    // Execute the update query
    stmt.run(name, email, id, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message }); // Internal Server Error
        }
        res.json({ message: 'User updated successfully', id, name, email }); // OK
    });
};

// DELETE /users/:id - Delete a user and their task assignments
const deleteUser = (req, res) => {
    const { id } = req.params;

    // Step 1: Delete user from task_assignments table
    const deleteAssignmentsStmt = db.prepare("DELETE FROM task_assignments WHERE user_id = ?");
    deleteAssignmentsStmt.run(id, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Error removing user assignments: ' + err.message }); // Internal Server Error
        }

        // Step 2: Delete the user from the users table
        const deleteUserStmt = db.prepare("DELETE FROM users WHERE id = ?");
        deleteUserStmt.run(id, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error deleting user: ' + err.message }); // Internal Server Error
            }

            // Successfully deleted the user and their assignments
            res.status(200).json({
                message: `User with ID ${id} was deleted successfully.`
            }); // Return a confirmation message
        });
    });
};


module.exports = {
    deleteUser, getUsers, getUserById, createUser, updateUser
};
