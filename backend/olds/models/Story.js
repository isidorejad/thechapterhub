
// models/Story.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const storySchema = new Schema({
    title: { type: String, required: true },
    writer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    genre: { type: Schema.Types.ObjectId, ref: 'Genre', required: true },
    description: { type: String, required: true },
    thumbnail: { type: String },
    price: { type: Number, default: 0.00, min: 0.00, required: true }, // Store as Number for currency
    content_file: { type: String }, // Path to the main story file (if it's a single file story)
    is_featured: { type: Boolean, default: false, required: true },
    is_premium: { type: Boolean, default: false, required: true },
    age_restriction: { type: Number, min: 0 },
    // No direct arrays here; we will fetch related Episodes, ContentWarnings, etc. via their respective models
}, { timestamps: true });

module.exports = mongoose.model('Story', storySchema);
