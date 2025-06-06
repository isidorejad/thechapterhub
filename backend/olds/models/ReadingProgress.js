
// models/ReadingProgress.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const readingProgressSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    episode: { type: Schema.Types.ObjectId, ref: 'Episode', required: true },
    completed: { type: Boolean, default: false, required: true },
    last_read_at: { type: Date, default: Date.now, required: true },
}, { timestamps: true });

readingProgressSchema.index({ user: 1, episode: 1 }, { unique: true }); // Prevent duplicate entries

module.exports = mongoose.model('ReadingProgress', readingProgressSchema);
