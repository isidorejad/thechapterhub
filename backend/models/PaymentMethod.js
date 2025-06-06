
// models/PaymentMethod.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentMethodSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    payment_token: { type: String, required: true },
    card_last_four: { type: String, required: true },
    card_brand: { type: String, required: true },
    is_default: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
