// models/StoryWarning.js (This becomes a 'join' collection in MongoDB for many-to-many)
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const storyWarningSchema = new Schema({
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    content_warning: { type: Schema.Types.ObjectId, ref: 'ContentWarning', required: true },
}, { timestamps: true });

storyWarningSchema.index({ story: 1, content_warning: 1 }, { unique: true });

module.exports = mongoose.model('StoryWarning', storyWarningSchema);
