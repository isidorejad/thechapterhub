// models/Episode.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const episodeSchema = new Schema({
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    title: { type: String, required: true },
    content_file: { type: String, required: true },
    thumbnail: { type: String },
    order: { type: Number, default: 1 },
}, { timestamps: true });

module.exports = mongoose.model('Episode', episodeSchema);
