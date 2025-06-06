
// models/StoryPurchase.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const storyPurchaseSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    token_transaction: { type: Schema.Types.ObjectId, ref: 'TokenTransaction' }, // Optional reference to a transaction
    price_paid: { type: Number, required: true, min: 0.00 },
}, { timestamps: true });

// Consider adding a unique index if a user can only purchase a story once
// storyPurchaseSchema.index({ user: 1, story: 1 }, { unique: true });

module.exports = mongoose.model('StoryPurchase', storyPurchaseSchema);
