const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const storySchema = new Schema({
    title: { type: String, required: true },
    writer: { type: String, required: true }, // Changed from ObjectId ref to String
    genre: { type: Schema.Types.ObjectId, ref: 'Genre', required: true },
    description: { type: String, required: true },
    thumbnail: { type: String },
    price: { type: Number, default: 0.00, min: 0.00, required: true }, // Price in tokens
    content_file: { type: String }, // Path to the main story file
    is_featured: { type: Boolean, default: false, required: true },
    // Removed is_premium and age_restriction
}, { timestamps: true });

module.exports = mongoose.model('Story', storySchema);