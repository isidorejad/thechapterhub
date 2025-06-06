// models/Comment.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    comment: { type: String, required: true },
    parent_comment: { type: Schema.Types.ObjectId, ref: 'Comment' }, // Self-referencing for replies
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
