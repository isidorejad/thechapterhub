// models/Follow.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const followSchema = new Schema({
    follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    followed: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

followSchema.index({ follower: 1, followed: 1 }, { unique: true }); // Prevent duplicate follows

module.exports = mongoose.model('Follow', followSchema);
