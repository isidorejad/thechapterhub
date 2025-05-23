const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT, // move port here
        dialect: 'mysql',
        logging: false,
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the MySQL database:', error);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };