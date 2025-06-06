
// models/Like.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const likeSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
}, { timestamps: true });

likeSchema.index({ user: 1, story: 1 }, { unique: true }); // Prevent duplicate likes

module.exports = mongoose.model('Like', likeSchema);
