// models/VerificationToken.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const verificationTokenSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // One active token per user
    token: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);