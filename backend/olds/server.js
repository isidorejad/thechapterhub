// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/database');
const routes = require('./routes');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from an 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from the 'assets' directory
// This line needs to be added or confirmed
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API Routes
app.use('/api', routes);

// Connect to Database and start server
const startServer = async () => {
    await connectDB();
    console.log('Database connection established');

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();