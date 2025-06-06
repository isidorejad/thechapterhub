// models/ContentWarning.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const contentWarningSchema = new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ContentWarning', contentWarningSchema);

