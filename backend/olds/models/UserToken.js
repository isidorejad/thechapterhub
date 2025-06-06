

// models/UserToken.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userTokenSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // One balance record per user
    balance: { type: Number, default: 15.00, min: 0.00, required: true },
}, { timestamps: true });

module.exports = mongoose.model('UserToken', userTokenSchema);