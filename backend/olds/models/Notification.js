
// models/Notification.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // e.g., 'new_comment', 'story_update', 'follow'
    notifiable_type: { type: String }, // For polymorphic relation (e.g., 'Story', 'Comment', 'Episode')
    notifiable_id: { type: Schema.Types.ObjectId }, // ID of the related entity
    data: { type: Schema.Types.Mixed, required: true }, // Store as Mixed (JSON)
    read_at: { type: Date }, // Timestamp when the notification was read
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);

