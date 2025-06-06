
// models/StoryView.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const storyViewSchema = new Schema({
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // Nullable for guests
    viewed_at: { type: Date, default: Date.now, required: true },
    ip_address: { type: String },
}, { timestamps: false }); // As per your original schema, no createdAt/updatedAt

module.exports = mongoose.model('StoryView', storyViewSchema);

