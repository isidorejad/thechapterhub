const { Story, Genre, ContentWarning, User, Like, Bookmark, ReadingProgress, Episode, StoryView, StoryPurchase, StoryWarning } = require('../models');
// const { Op } = require('sequelize'); // No longer needed for Mongoose
const { sanitize } = require('sanitizer');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // Keep multer as it's for file uploads

class StoryController {
    async index(req, res) {
        try {
            const { search, genre, warning } = req.query;
            let findQuery = {}; // Mongoose find query object
            let populateOptions = [ // Mongoose populate options
                { path: 'writer', select: '_id name' }, // Populate writer and select fields
                { path: 'genre', select: '_id name' } // Populate genre and select fields
            ];

            if (search) {
                // Mongoose: use $or and $regex for case-insensitive search
                findQuery.$or = [
                    { title: { $regex: sanitize(search), $options: 'i' } },
                    { description: { $regex: sanitize(search), $options: 'i' } }
                ];
            }

            if (genre) {
                const genreRecord = await Genre.findOne({ name: sanitize(genre) });
                if (genreRecord) {
                    findQuery.genre = genreRecord._id; // Reference by _id
                }
            }

            if (warning) {
                // For many-to-many with a join table (StoryWarning), you'd first find stories
                // that have the specific warning. This requires a separate query or aggregation.
                // Simpler approach for now: find the warning, then find stories associated with it.
                const warningRecord = await ContentWarning.findOne({ name: sanitize(warning) });
                if (warningRecord) {
                    const storyWarnings = await StoryWarning.find({ content_warning: warningRecord._id }).select('story');
                    const storyIdsWithWarning = storyWarnings.map(sw => sw.story);
                    findQuery._id = { $in: storyIdsWithWarning }; // Filter stories by those IDs
                } else {
                    // If warning doesn't exist, no stories match
                    findQuery._id = null; // Effectively return no results
                }
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const skip = (page - 1) * limit;

            const [stories, count] = await Promise.all([
                Story.find(findQuery)
                    .populate(populateOptions)
                    .sort({ createdAt: -1 }) // Sort by createdAt descending
                    .skip(skip)
                    .limit(limit)
                    .lean(), // lean() returns plain JS objects, useful for performance
                Story.countDocuments(findQuery) // Mongoose: countDocuments
            ]);

            const genres = await Genre.find().select('_id name slug').sort({ name: 1 }).lean();
            const warnings = await ContentWarning.find().select('_id name description').sort({ name: 1 }).lean();

            // Transform story IDs to 'id' for frontend consistency
            const transformedStories = stories.map(story => ({
                ...story,
                id: story._id.toString(),
                writer: story.writer ? { id: story.writer._id.toString(), name: story.writer.name } : null,
                genre: story.genre ? { id: story.genre._id.toString(), name: story.genre.name } : null,
                _id: undefined // Remove _id
            }));

            res.json({
                success: true,
                stories: transformedStories,
                genres: genres.map(g => ({ ...g, id: g._id.toString(), _id: undefined })),
                warnings: warnings.map(w => ({ ...w, id: w._id.toString(), _id: undefined })),
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count
            });
        } catch (error) {
            console.error('Error in index:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching stories',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

 async show(req, res) {
        try {
            const story = await Story.findById(req.params.storyId)
                .populate({ path: 'writer', select: '_id name' })
                .populate({ path: 'genre', select: '_id name' })
                // Removed direct populate for 'warnings' here
                .populate({ path: 'episodes', options: { sort: { order: 1 } } })
                .lean();

            if (!story) {
                return res.status(404).json({
                    success: false,
                    message: 'Story not found'
                });
            }

            // Fetch warnings through the StoryWarning join collection
            const storyWarnings = await StoryWarning.find({ story: story._id })
                .populate({ path: 'content_warning', select: '_id name description' })
                .lean();

            // Extract the actual ContentWarning documents
            const contentWarnings = storyWarnings.map(sw => ({
                id: sw.content_warning._id.toString(),
                name: sw.content_warning.name,
                description: sw.content_warning.description
            }));

            // Fetch comments separately and populate user
            const comments = await Comment.find({ story: story._id, parent_id: { $exists: false } }) // Fetch top-level comments
                .populate({ path: 'user', select: '_id name' }) // Populate the user who made the comment
                .sort({ createdAt: -1 })
                .lean();

            // Fetch replies for each top-level comment
            const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
                const replies = await Comment.find({ parent_id: comment._id })
                    .populate({ path: 'user', select: '_id name' })
                    .sort({ createdAt: 1 })
                    .lean();
                return {
                    ...comment,
                    id: comment._id.toString(),
                    User: comment.user ? { id: comment.user._id.toString(), name: comment.user.name } : null,
                    user: undefined, // Remove original user ObjectId field
                    replies: replies.map(reply => ({
                        ...reply,
                        id: reply._id.toString(),
                        User: reply.user ? { id: reply.user._id.toString(), name: reply.user.name } : null,
                        user: undefined, // Remove original user ObjectId field
                    }))
                };
            }));

            let canAccess = true;
            if (story.is_premium && req.user) {
                const hasPurchased = await StoryPurchase.findOne({
                    user: req.user._id,
                    story: story._id
                });
                if (!hasPurchased) {
                    canAccess = false;
                }
            } else if (story.is_premium && !req.user) {
                canAccess = false;
            }

            if (!canAccess) {
                const limitedStory = {
                    id: story._id.toString(),
                    title: story.title,
                    description: story.description,
                    thumbnail: story.thumbnail,
                    price: story.price,
                    is_premium: story.is_premium,
                    age_restriction: story.age_restriction,
                    writer: story.writer ? { id: story.writer._id.toString(), name: story.writer.name } : null,
                    genre: story.genre ? { id: story.genre._id.toString(), name: story.genre.name } : null,
                    warnings: contentWarnings, // Use the fetched contentWarnings here
                };
                return res.status(403).json({
                    success: false,
                    message: 'Premium story, purchase required.',
                    requiresPurchase: true,
                    story: limitedStory
                });
            }

            await StoryView.create({
                story: story._id,
                user: req.user ? req.user._id : null,
                ip_address: req.ip
            });

            const isLiked = req.user ? await Like.countDocuments({ user: req.user._id, story: story._id }) > 0 : false;
            const bookmarked = req.user ? await Bookmark.countDocuments({ user: req.user._id, story: story._id }) > 0 : false;
            let readingProgress = [];

            if (req.user && story.episodes && story.episodes.length > 0) {
                const episodeIds = story.episodes.map(ep => ep._id);
                readingProgress = await ReadingProgress.find({ user: req.user._id, episode: { $in: episodeIds } })
                    .select('episode completed last_read_at -_id')
                    .lean();

                readingProgress = readingProgress.map(rp => ({
                    ...rp,
                    episode_id: rp.episode.toString(),
                    episode: undefined
                }));
            }

            const transformedStory = {
                ...story,
                id: story._id.toString(),
                writer: story.writer ? { id: story.writer._id.toString(), name: story.writer.name } : null,
                genre: story.genre ? { id: story.genre._id.toString(), name: story.genre.name } : null,
                warnings: contentWarnings, // Include the fetched contentWarnings
                episodes: story.episodes ? story.episodes.map(ep => ({
                    ...ep,
                    id: ep._id.toString(),
                    story_id: ep.story.toString(),
                    _id: undefined
                })) : [],
                _id: undefined
            };

            res.json({
                success: true,
                story: { ...transformedStory, comments: commentsWithReplies }, // Add comments to the story object
                isLiked,
                bookmarked,
                readingProgress
            });

        } catch (error) {
            console.error('Error in show:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching story',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    async getCreationData(req, res) {
        try {
            const genres = await Genre.find()
                .select('_id name slug')
                .sort({ name: 1 })
                .lean(); // Use lean() for plain JS objects

            const warnings = await ContentWarning.find()
                .select('_id name description')
                .sort({ name: 1 })
                .lean();

            res.json({
                success: true,
                genres: genres.map(g => ({ ...g, id: g._id.toString(), _id: undefined })),
                warnings: warnings.map(w => ({ ...w, id: w._id.toString(), _id: undefined }))
            });
        } catch (error) {
            console.error('Error in getCreationData:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to load story creation data',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    async store(req, res) {
        try {
            // First check if files were uploaded
            if (!req.files?.thumbnail || !req.files?.content_file) {
                return res.status(400).json({
                    success: false,
                    message: 'Both thumbnail and content file are required'
                });
            }

            // Access text fields from req.body
            const { title, genre_id, description, price, is_featured, is_premium, age_restriction, warnings } = req.body;

            // Validate required fields
            if (!title || !genre_id || !description || price === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Process files
            const thumbnailFile = req.files.thumbnail[0];
            const contentFile = req.files.content_file[0];

            // File type validation (Multer's fileFilter should ideally handle this, but good to have a backup)
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(thumbnailFile.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid thumbnail file type'
                });
            }

            if (!['application/pdf', 'text/plain'].includes(contentFile.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid content file type'
                });
            }

            // Convert genre_id to ObjectId to ensure it's valid before creation
            // Assuming genre_id is sent as a string representing the ObjectId
            const genreObjectId = new mongoose.Types.ObjectId(genre_id);
            const writerId = req.user._id;

            // Create the story
            const story = await Story.create({
                title: sanitize(title),
                writer: writerId, // Reference writer by _id
                genre: genreObjectId, // Reference genre by _id
                description: sanitize(description),
                thumbnail: `/uploads/${thumbnailFile.filename}`,
                price: parseFloat(price),
                content_file: `/uploads/${contentFile.filename}`,
                is_featured: is_featured === 'true',
                is_premium: is_premium === 'true',
                age_restriction: age_restriction ? parseInt(age_restriction) : null
            });

            // Handle warnings if provided
            if (warnings && warnings.length > 0) {
                const parsedWarnings = Array.isArray(warnings) ? warnings.map(w => new mongoose.Types.ObjectId(w)) : [];
                // Create entries in the StoryWarning join collection
                const storyWarningDocs = parsedWarnings.map(warningId => ({
                    story: story._id,
                    content_warning: warningId
                }));
                await StoryWarning.insertMany(storyWarningDocs);
            }

            res.status(201).json({
                success: true,
                message: 'Story published successfully!',
                story: { ...story.toObject(), id: story._id.toString(), _id: undefined } // Convert to plain object and rename _id
            });
        } catch (error) {
            console.error('Error in store:', error);
            if (error instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    message: `File upload error: ${error.message}`
                });
            }
            res.status(500).json({
                success: false,
                message: 'Error publishing story',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    async update(req, res) {
        try {
            // Mongoose: findById
            const story = await Story.findById(req.params.storyId);
            if (!story) {
                return res.status(404).json({
                    success: false,
                    message: 'Story not found'
                });
            }

            // Authorization: Check if user is writer or admin
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to update this story.' });
            }


            const thumbnailFile = req.files?.thumbnail ? req.files.thumbnail[0] : null;
            const contentFile = req.files?.content_file ? req.files.content_file[0] : null;

            if (thumbnailFile && !['image/jpeg', 'image/png', 'image/gif'].includes(thumbnailFile.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid thumbnail file type'
                });
            }

            if (contentFile && !['application/pdf', 'text/plain'].includes(contentFile.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid content file type'
                });
            }

            const { title, genre_id, description, price, is_featured, is_premium, age_restriction, warnings } = req.body;

            // Update story fields directly on the document
            story.title = sanitize(title);
            story.description = sanitize(description);
            story.price = parseFloat(price);
            story.is_featured = is_featured === 'true';
            story.is_premium = is_premium === 'true';
            story.age_restriction = age_restriction ? parseInt(age_restriction) : null;

            if (genre_id) {
                story.genre = new mongoose.Types.ObjectId(genre_id); // Update genre reference
            }

            if (thumbnailFile) {
                story.thumbnail = `/uploads/${thumbnailFile.filename}`;
            }
            if (contentFile) {
                story.content_file = `/uploads/${contentFile.filename}`;
            }

            await story.save(); // Save the updated document

            if (warnings !== undefined) {
                const parsedWarnings = Array.isArray(warnings) ? warnings.map(w => new mongoose.Types.ObjectId(w)) : [];
                // Clear existing StoryWarning entries for this story
                await StoryWarning.deleteMany({ story: story._id });
                // Add new StoryWarning entries
                if (parsedWarnings.length > 0) {
                    const storyWarningDocs = parsedWarnings.map(warningId => ({
                        story: story._id,
                        content_warning: warningId
                    }));
                    await StoryWarning.insertMany(storyWarningDocs);
                }
            }

            res.json({
                success: true,
                message: 'Story updated successfully!',
                story: { ...story.toObject(), id: story._id.toString(), _id: undefined }
            });
        } catch (error) {
            console.error('Error in update:', error);
            if (error instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    message: `File upload error: ${error.message}`
                });
            }
            res.status(500).json({
                success: false,
                message: 'Error updating story',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    async destroy(req, res) {
        try {
            // Mongoose: findById
            const story = await Story.findById(req.params.storyId);
            if (!story) {
                return res.status(404).json({
                    success: false,
                    message: 'Story not found'
                });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this story.' });
            }

            await story.deleteOne(); // Mongoose: deleteOne on a document instance

            // IMPORTANT: With Mongoose, you typically need to handle cascading deletes manually
            // or through hooks if you don't use MongoDB's cascading features (not native).
            // For example, delete related episodes, comments, likes, bookmarks, story views, etc.
            // This is a crucial difference from relational databases.
            await Episode.deleteMany({ story: story._id });
            await Comment.deleteMany({ story: story._id });
            await Like.deleteMany({ story: story._id });
            await Bookmark.deleteMany({ story: story._id });
            await StoryView.deleteMany({ story: story._id });
            await StoryPurchase.deleteMany({ story: story._id });
            await StoryWarning.deleteMany({ story: story._id });


            res.json({
                success: true,
                message: 'Story deleted successfully!'
            });
        } catch (error) {
            console.error('Error in destroy:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting story',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = new StoryController();