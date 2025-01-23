# Project Name

This project is a task and project management API built using **Node.js** and **SQLite**. All functional requirements and additional features achieved.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- [Node.js](https://nodejs.org/) (version 14.x or higher) installed on your machine.
- [SQLite](https://www.sqlite.org/) database file setup (or any required SQLite dependencies).

## Installation

To install all necessary libraries and dependencies defined in the `package.json` file, run the following command:

    npm install

## Running the Application

Start the application by running the following command:

    node app.js

This will start the server on the default port (usually 3000). The API should now be accessible at http://localhost:3000. You can start making requests to the various endpoints that are available.

## Troubleshooting

### SQLite3 Installation Issues

If you encounter an error while running the application (e.g., `Error: dlopen(...)` or issues related to `sqlite3`), try rebuilding the `sqlite3` package by running the following command:

npm rebuild sqlite3


## API Endpoints

Project APIs
    
    ● Automatically mark a project as "Completed" if it has any task and when all its tasks are marked "Completed."
    • Pagination along with search qwueries such as name and status added.

    ● POST /projects
        Create a new project.
        Sample body data:
        {
            "name": "Project 1",
            "description": "API project of pathlock",
            "start_date": "23rd Jan 2025",
            "end_date": "1st February 2025",
            "status": "Completed"
        }

            
    ● GET /projects
        List all projects. You can filter projects using the following query parameters:
            status - Filter projects by status (e.g., Completed, In Progress).
            name - Filter projects by project name.
            Pagination: Use page to define the page number (default is 1). For example: GET /projects?page=2.
        
        Example Request:GET /projects?status=Completed&page=1
        Example Request:GET /projects?name=xyz&page=1
        



    ● GET /projects/{id}
        Get details of a specific project.

    ● PUT /projects/{id}
        Update project details:
        {
            "name": "Project 1",
            "description": "API project of pathlock",
            "start_date": "23rd Jan 2025",
            "end_date": "1st February 2025",
            "status": "Completed"
        }

    ● DELETE /projects/{id}
        Delete a project.

Task APIs

    • Each task must belong to a project.
    • A task cannot be created without assigning it to a user.
    • A user cannot be assigned more than 5 active tasks at a time.
    • Pagination along with search qwueries such as name and status added.

  
    ● POST /tasks
        Create a task for a project.
        Sample body data:
        {
            "project_id":1,
            "name": "Task 1",
            "description": "task of project",
            "due_date": "29th Jan 2025",
            "assigned_users":[1], //pass in users id in the array.
            "status": "Completed"
        }
        NOT NULL Constraint on project_id, name, assigned_users and status.
        Cannot assign a user more than 5 active tasks.


    ● GET /tasks
        List all tasks. You can filter tasks using the following query parameters:

        status - Filter tasks by status (e.g., Completed, In Progress).
        name - Filter tasks by task name.
        Pagination: Use page to define the page number (default is 1). For example: GET /tasks?page=2.
        Example Request:

            GET /tasks?status=Completed&name=xyz&page=1
            GET /tasks/{id}
            Get details of a specific task.

    ●PUT /tasks/{id}
        Update task details (e.g., change status).

    ●DELETE /tasks/{id}
    ●Delete a task.

User APIs

    
    • Unique email constraint.

    ●POST /users
        Create a new user.
        sample data:
        {
            "email":"xyz@gmail.com",
            "name" : "Sani"
        }

    ●GET /users
        List all users.

    ●GET /users/{id}
        Get details of a specific user.

    ●PUT /users/{id}
        Update user details.

    ●DELETE /users/{id}
        Delete a user.


