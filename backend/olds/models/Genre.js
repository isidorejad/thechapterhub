
// models/Genre.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const genreSchema = new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    slug: { type: String, required: true, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Genre', genreSchema);
