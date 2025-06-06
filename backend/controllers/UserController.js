// controllers/userController.js
const { User, Story, Genre, StoryPurchase, UserToken } = require('../models');
const fs = require('fs');
const path = require('path');

class UserController {
    /**
     * Fetches the authenticated user's profile, including their token balance.
     * @param {Object} req - The request object (req.user contains authenticated user info).
     * @param {Object} res - The response object.
     */
    async getProfile(req, res) {
        try {
            // req.user is populated by the 'auth' middleware
            const userId = req.user._id;

            // 1. Find the user without populating 'tokens' directly on the User model
            const user = await User.findById(userId).select('-password').lean(); // .lean() for plain JS object

            if (!user) {
                return res.status(404).json({ message: 'User not found.', code: 'USER_NOT_FOUND' });
            }

            // 2. Fetch the user's token balance separately from the UserToken collection
            const userTokens = await UserToken.findOne({ user: userId }).lean(); // .lean() for plain JS object

            // 3. Prepare the response object, ensuring consistent structure for the frontend
            const userResponse = {
                ...user,
                id: user._id.toString(), // Convert _id to id for frontend consistency
                _id: undefined // Remove the Mongoose _id field from the response
            };

            // 4. Attach the tokens data to the user object
            if (userTokens) {
                userResponse.tokens = {
                    id: userTokens._id.toString(),
                    user_id: userTokens.user.toString(),
                    balance: userTokens.balance,
                    createdAt: userTokens.createdAt,
                    updatedAt: userTokens.updatedAt
                };
            } else {
                // If for some reason a UserToken entry doesn't exist (e.g., old data), provide a default
                userResponse.tokens = { balance: 0.00 };
            }

            res.json({ user: userResponse });
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ message: 'Error fetching profile.', error: error.message, code: 'PROFILE_FETCH_ERROR' });
        }
    }

    /**
     * Updates the authenticated user's profile information, including profile picture.
     * @param {Object} req - The request object (req.user contains authenticated user info, req.file for upload).
     * @param {Object} res - The response object.
     */
    async updateProfile(req, res) {
        try {
            const userId = req.user._id;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found.', code: 'USER_NOT_FOUND' });
            }

            // Update allowed fields from req.body
            const { name, dob, contact_number, address, language, timezone } = req.body;

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

            // Re-fetch the updated user and their tokens for the response
            const updatedUser = await User.findById(userId).select('-password').lean();
            const userTokens = await UserToken.findOne({ user: userId }).lean();

            const userResponse = {
                ...updatedUser,
                id: updatedUser._id.toString(),
                _id: undefined
            };

            if (userTokens) {
                userResponse.tokens = {
                    id: userTokens._id.toString(),
                    user_id: userTokens.user.toString(),
                    balance: userTokens.balance,
                    createdAt: userTokens.createdAt,
                    updatedAt: userTokens.updatedAt
                };
            } else {
                userResponse.tokens = { balance: 0.00 };
            }

            res.json({ message: 'Profile updated successfully!', user: userResponse });
        } catch (error) {
            console.error('Error updating profile:', error);
            // Handle Multer errors specifically
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File too large. Max 2MB allowed.', code: 'FILE_TOO_LARGE' });
            }
            if (error.message === 'Only image files are allowed!') {
                return res.status(400).json({ message: 'Only image files are allowed!', code: 'INVALID_FILE_TYPE' });
            }
            res.status(500).json({ message: 'Error updating profile.', error: error.message, code: 'PROFILE_UPDATE_ERROR' });
        }
    }

    /**
     * Fetches the stories purchased by the authenticated user.
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    async getUserLibrary(req, res) {
        try {
            const userId = req.user._id;

            const purchasedStories = await StoryPurchase.find({ user: userId })
                .populate({
                    path: 'story',
                    populate: [
                        { path: 'writer', select: '_id name' },
                        { path: 'genre', select: '_id name' }
                    ]
                })
                .lean(); // Use .lean() for performance

            const transformedPurchases = purchasedStories.map(purchase => {
                if (purchase.story) {
                    return {
                        id: purchase._id.toString(),
                        user_id: purchase.user.toString(),
                        story_id: purchase.story._id.toString(),
                        price_paid: purchase.price_paid,
                        createdAt: purchase.createdAt,
                        updatedAt: purchase.updatedAt,
                        Story: {
                            id: purchase.story._id.toString(),
                            title: purchase.story.title,
                            description: purchase.story.description,
                            thumbnail: purchase.story.thumbnail,
                            price: purchase.story.price,
                            is_featured: purchase.story.is_featured,
                            // is_premium: purchase.story.is_premium, // Assuming these fields are removed from schema
                            // age_restriction: purchase.story.age_restriction, // Assuming these fields are removed from schema
                            writer: purchase.story.writer ? { id: purchase.story.writer._id.toString(), name: purchase.story.writer.name } : null,
                            genre: purchase.story.genre ? { id: purchase.story.genre._id.toString(), name: purchase.story.genre.name } : null,
                        },
                    };
                }
                return null;
            }).filter(Boolean); // Filter out any null entries

            res.json({ purchasedStories: transformedPurchases });
        } catch (error) {
            console.error('Error fetching purchased stories:', error);
            res.status(500).json({ message: 'Error fetching purchased stories.', error: error.message, code: 'LIBRARY_FETCH_ERROR' });
        }
    }

    /**
     * Fetches stories written by the authenticated user (if they are a writer/admin).
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    async getMyWrittenStories(req, res) {
        try {
            const userId = req.user._id;

            const myStories = await Story.find({ writer: userId })
                .populate({ path: 'genre', select: '_id name' })
                .lean();

            const transformedStories = myStories.map(story => ({
                id: story._id.toString(),
                title: story.title,
                description: story.description,
                thumbnail: story.thumbnail,
                price: story.price,
                is_featured: story.is_featured,
                // is_premium: story.is_premium, // Assuming these fields are removed from schema
                // age_restriction: story.age_restriction, // Assuming these fields are removed from schema
                createdAt: story.createdAt,
                updatedAt: story.updatedAt,
                writer_id: story.writer.toString(),
                genre: story.genre ? { id: story.genre._id.toString(), name: story.genre.name } : null,
            }));

            res.json({ stories: transformedStories });
        } catch (error) {
            console.error('Error fetching writer stories:', error);
            res.status(500).json({ message: 'Error fetching your stories.', error: error.message, code: 'WRITER_STORIES_FETCH_ERROR' });
        }
    }
}

module.exports = new UserController();
