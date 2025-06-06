// models/User.js (Already shown above, but included for completeness)
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'writer'], default: 'user', required: true },
    dob: { type: Date },
    contact_number: { type: String },
    address: { type: String },
    profile_picture: { type: String },
    language: { type: String, default: 'en', required: true },
    timezone: { type: String, default: 'UTC', required: true },
    is_verified: { type: Boolean, default: false, required: true },
}, { timestamps: true });

// Define a virtual 'tokens' field
// userSchema.virtual('tokens', {
//     ref: 'UserToken', // The model to use for population
//     localField: '_id', // Field in the current (User) schema that links to the foreignField
//     foreignField: 'user', // Field in the foreign (UserToken) schema that links back to the localField
//     justOne: true // Set to true if a user has only one token entry
// });

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        // Here you would hash the password, e.g., using bcrypt
        // const bcrypt = require('bcryptjs');
        // this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
