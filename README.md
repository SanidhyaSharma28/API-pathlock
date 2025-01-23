# Project Name

This project is a task and project management API built using **Node.js** and **SQLite**.

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


## API Endpoints

Project APIs
    ● POST /projects
        Create a new project.

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
        Update project details.

    ● DELETE /projects/{id}
        Delete a project.

Task APIs
    ● POST /tasks
        Create a task for a project.

    ● GET /tasks
        List all tasks. You can filter tasks using the following query parameters:

        status - Filter tasks by status (e.g., Completed, In Progress).
        name - Filter tasks by task name.
        Pagination: Use page to define the page number (default is 1). For example: GET /tasks?page=2.
        Example Request:

            GET /tasks?status=Completed&page=1
            GET /tasks/{id}
            Get details of a specific task.

    ●PUT /tasks/{id}
        Update task details (e.g., change status).

    ●DELETE /tasks/{id}
    ●Delete a task.

User APIs

    ●POST /users
        Create a new user.

    ●GET /users
        List all users.

    ●GET /users/{id}
        Get details of a specific user.

    ●PUT /users/{id}
        Update user details.

    ●DELETE /users/{id}
        Delete a user.


