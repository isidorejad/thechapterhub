// models/index.js
const mongoose = require('mongoose'); // Mongoose is required if you define models within files
const path = require('path');
const fs = require('fs');

const models = {};

// Dynamically load all Mongoose models
fs.readdirSync(__dirname)
    .filter(file => {
        return (file.indexOf('.') !== 0) &&
               (file !== 'index.js') &&
               (file.slice(-3) === '.js');
    })
    .forEach(file => {
        const modelName = path.basename(file, '.js');
        // Require each model file to register it with Mongoose
        models[modelName] = require(path.join(__dirname, file));
    });

module.exports = models; // Export all Mongoose models