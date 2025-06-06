
// models/Share.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const shareSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    story: { type: Schema.Types.ObjectId, ref: 'Story' },
    episode: { type: Schema.Types.ObjectId, ref: 'Episode' },
    platform: { type: String, required: true }, // e.g., 'facebook', 'twitter', 'email', 'whatsapp'
}, { timestamps: true });

// Custom validation for either story or episode
shareSchema.pre('validate', function(next) {
    if (!this.story && !this.episode) {
        next(new Error('Either story or episode must be provided.'));
    } else if (this.story && this.episode) {
        next(new Error('A share must be linked to either a story or an episode, but not both.'));
    } else {
        next();
    }
});

module.exports = mongoose.model('Share', shareSchema);
