require('dotenv').config();

const projectRouter = require('./routes/project');
const userRouter = require('./routes/user');
const taskRouter = require('./routes/task');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;



const db = require('./db/db.js');  // Import the db connection
// Import the schema setup function
const createSchema = require('./db/schema.js');

// Call the schema setup function to create tables if they don't exist
createSchema();



app.use(express.json()); 


// Routes
app.use('/projects', projectRouter);
app.use('/users', userRouter);
app.use('/tasks', taskRouter);




app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
