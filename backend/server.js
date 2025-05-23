const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, sequelize } = require('./config/database');
const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Body parser for JSON requests

// API Routes
app.use('/api', apiRoutes);

// Connect to Database and start server
const startServer = async () => {
    await connectDB();
    // You might want to sync models if you make changes, but for existing DB, set `alter: true` carefully
    // or ensure your models match your existing schema perfectly.
    // await sequelize.sync({ alter: true }); // Use with caution in production with existing data
    console.log('Sequelize models synchronized (if enabled)');

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();