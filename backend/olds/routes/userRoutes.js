// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
// Import Mongoose models directly. Ensure they are the Mongoose Model objects.
const { User, Story, Genre, StoryPurchase, UserToken } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // For ensuring upload directory exists

// Multer Configuration for Profile Pictures
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/profiles'); // Dedicated folder for profile pics
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Use user ID (req.user._id) to name the file to ensure uniqueness per user
        // Adding a unique suffix for robustness, especially if user might upload multiple times.
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const profileFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const uploadProfile = multer({
    storage: profileStorage,
    fileFilter: profileFileFilter,
    limits: {
        fileSize: 1024 * 1024 * 2 // 2MB limit for profile pictures
    }
});

// Protected user routes
router.get('/profile', auth, async (req, res) => {
    // This route is responsible for getting the *authenticated* user's profile.
    // We can fetch it directly here instead of authController.getProfile if
    // we need specific eager loading (like UserToken).
    try {
        const userId = req.user._id; // User ID from auth middleware

        // Find the user and populate their UserToken balance
        const user = await User.findById(userId)
                               .select('-password') // Exclude password
                               .populate('tokens')   // Populate the UserToken document
                               .lean();             // Return plain JS object

        if (!user) {
            return res.status(404).json({ message: 'User not found.', code: 'USER_NOT_FOUND' });
        }

        // Map _id to id for frontend consistency
        const userResponse = {
            ...user,
            id: user._id.toString(),
            _id: undefined // Remove Mongoose _id
        };

        // If tokens were populated, ensure they are also transformed if needed
        if (userResponse.tokens) {
            userResponse.tokens.id = userResponse.tokens._id.toString();
            delete userResponse.tokens._id;
            userResponse.tokens.user_id = userResponse.tokens.user.toString(); // Add user_id
            delete userResponse.tokens.user; // Remove user ObjectId reference
        }


        res.json({ user: userResponse });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Error fetching profile.', error: error.message, code: 'PROFILE_FETCH_ERROR' });
    }
});


// This route will now handle file uploads for profile picture AND other profile updates
router.put(
    '/profile',
    auth,
    uploadProfile.single('profile_picture_file'), // 'profile_picture_file' is the field name from the form
    async (req, res) => {
        try {
            const userId = req.user._id; // Use Mongoose _id
            const user = await User.findById(userId); // Mongoose: findById
            if (!user) {
                return res.status(404).json({ message: 'User not found.', code: 'USER_NOT_FOUND' });
            }

            // Update allowed fields from req.body
            const { name, dob, contact_number, address, language, timezone } = req.body;

            // Apply updates only if the field is present in the request body
            if (name !== undefined) user.name = name;
            if (dob !== undefined) user.dob = dob;
            if (contact_number !== undefined) user.contact_number = contact_number;
            if (address !== undefined) user.address = address;
            if (language !== undefined) user.language = language;
            if (timezone !== undefined) user.timezone = timezone;

            // Handle profile picture file upload
            if (req.file) {
                // Optional: Delete old profile picture file if it exists
                if (user.profile_picture) {
                    const oldPath = path.join(__dirname, '..', user.profile_picture);
                    if (fs.existsSync(oldPath)) {
                        fs.unlink(oldPath, (err) => {
                            if (err) console.error('Failed to delete old profile picture:', err);
                        });
                    }
                }
                user.profile_picture = `/uploads/profiles/${req.file.filename}`; // Save the new path to the DB
            }

            await user.save(); // Save the updated Mongoose document

            // Re-fetch user with populated tokens to send back a complete updated user object
            const updatedUser = await User.findById(userId)
                                          .select('-password')
                                          .populate('tokens')
                                          .lean();

            const userResponse = updatedUser; // Use the re-fetched populated user
            userResponse.id = userResponse._id.toString(); // Add 'id'
            delete userResponse._id; // Remove '_id'

            if (userResponse.tokens) {
                userResponse.tokens.id = userResponse.tokens._id.toString();
                delete userResponse.tokens._id;
                userResponse.tokens.user_id = userResponse.tokens.user.toString();
                delete userResponse.tokens.user;
            }

            res.json({ message: 'Profile updated successfully!', user: userResponse });
        } catch (error) {
            console.error('Error updating profile:', error);
            if (error instanceof multer.MulterError) {
                return res.status(400).json({ message: `File upload error: ${error.message}` });
            }
            res.status(500).json({ message: 'Error updating profile.', error: error.message });
        }
    }
);

// Get user's library (purchased stories)
router.get('/user/library', auth, async (req, res) => {
    try {
        const userId = req.user._id; // Use Mongoose _id

        const purchasedStories = await StoryPurchase.find({ user: userId })
            .populate({
                path: 'story',
                // For nested population, use `populate` inside the object.
                // Mongoose automatically uses the correct ref if defined in schema.
                populate: [
                    { path: 'writer', select: '_id name' },
                    { path: 'genre', select: '_id name' }
                ]
            })
            .lean(); // Use .lean() for performance

        const transformedPurchases = purchasedStories.map(purchase => {
            // Ensure `purchase.story` exists and is a valid object before accessing
            if (purchase.story) {
                return {
                    id: purchase._id.toString(),
                    user_id: purchase.user.toString(),
                    story_id: purchase.story._id.toString(),
                    price_paid: purchase.price_paid,
                    createdAt: purchase.createdAt,
                    updatedAt: purchase.updatedAt,
                    // Transform the nested story object
                    Story: {
                        id: purchase.story._id.toString(),
                        title: purchase.story.title,
                        description: purchase.story.description,
                        thumbnail: purchase.story.thumbnail,
                        price: purchase.story.price,
                        is_featured: purchase.story.is_featured,
                        is_premium: purchase.story.is_premium,
                        age_restriction: purchase.story.age_restriction,
                        // Ensure writer and genre are also transformed to `id`
                        writer: purchase.story.writer ? { id: purchase.story.writer._id.toString(), name: purchase.story.writer.name } : null,
                        genre: purchase.story.genre ? { id: purchase.story.genre._id.toString(), name: purchase.story.genre.name } : null,
                    },
                };
            }
            return null;
        }).filter(Boolean); // Filter out any null entries from potential invalid stories

        res.json({ purchasedStories: transformedPurchases });
    } catch (error) {
        console.error('Error fetching purchased stories:', error);
        res.status(500).json({ message: 'Error fetching purchased stories.', error: error.message });
    }
});


// Route for fetching writer's stories
router.get('/user/my-written-stories', auth, async (req, res) => {
    try {
        const userId = req.user._id; // The authenticated user's ID

        const myStories = await Story.find({ writer: userId })
            .populate({ path: 'genre', select: '_id name' }) // Populate genre for display
            .lean(); // Convert to plain JS objects

        const transformedStories = myStories.map(story => ({
            id: story._id.toString(),
            title: story.title,
            description: story.description,
            thumbnail: story.thumbnail,
            price: story.price,
            is_featured: story.is_featured,
            is_premium: story.is_premium,
            age_restriction: story.age_restriction,
            createdAt: story.createdAt,
            updatedAt: story.updatedAt,
            writer_id: story.writer.toString(), // The writer's actual ID
            genre: story.genre ? { id: story.genre._id.toString(), name: story.genre.name } : null,
        }));

        res.json({ stories: transformedStories });
    } catch (error) {
        console.error('Error fetching writer stories:', error);
        res.status(500).json({ message: 'Error fetching your stories.', error: error.message });
    }
});


module.exports = router;