// schema.js

const db = require('./db');  // SQLite connection from db.js

const createSchema = () => {
    db.serialize(() => {
        // Create the "projects" table
        db.run(`
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                start_date TEXT NOT NULL,
                end_date TEXT,
                status TEXT NOT NULL CHECK(status IN ('Active', 'Completed', 'On Hold'))
            );
        `);

        // Create the "users" table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL
            );
        `);

        // Create the "tasks" table
        db.run(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,  -- Foreign key to projects
                name TEXT NOT NULL,
                description TEXT,
                due_date TEXT,
                status TEXT NOT NULL CHECK(status IN ('Pending', 'In Progress', 'Completed')),
                FOREIGN KEY(project_id) REFERENCES projects(id)
            );
        `);

        // Create the "task_assignments" table (junction table)
        db.run(`
            CREATE TABLE IF NOT EXISTS task_assignments (
                task_id INTEGER NOT NULL,    -- Foreign key to tasks
                user_id INTEGER NOT NULL,    -- Foreign key to users
                PRIMARY KEY (task_id, user_id),
                FOREIGN KEY(task_id) REFERENCES tasks(id),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
        `);
    });
};

// Export createSchema function
module.exports = createSchema;
