// models/Bookmark.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookmarkSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
}, { timestamps: true });

bookmarkSchema.index({ user: 1, story: 1 }, { unique: true }); // Prevent duplicate bookmarks

module.exports = mongoose.model('Bookmark', bookmarkSchema);

