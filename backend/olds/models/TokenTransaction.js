
// models/TokenTransaction.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tokenTransactionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, validate: {
        validator: function(v) { return v !== 0; },
        message: 'Amount cannot be zero.'
    }},
    type: { type: String, required: true }, // e.g., 'purchase', 'story_read', 'bonus', 'refund'
    transactionable_type: { type: String }, // For polymorphic relation (e.g., 'StoryPurchase', 'Episode')
    transactionable_id: { type: Schema.Types.ObjectId }, // ID of the related entity
    description: { type: String },
    status: { type: String, default: 'completed', enum: ['completed', 'pending', 'failed', 'refunded'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('TokenTransaction', tokenTransactionSchema);

