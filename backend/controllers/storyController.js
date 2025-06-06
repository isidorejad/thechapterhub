const { Story, Genre, ContentWarning, User, Like, Bookmark, ReadingProgress, Chapter ,Episode, StoryView, StoryPurchase, Comment, StoryWarning } = require('../models');
const { sanitize } = require('sanitizer');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose'); // Import mongoose to use mongoose.Types.ObjectId

class StoryController {
    async index(req, res) {
        try {
            const { search, genre } = req.query; // Removed 'warning' from query
            let findQuery = {};
            let populateOptions = [
                { path: 'genre', select: '_id name' }
            ];

            if (search) {
                findQuery.$or = [
                    { title: { $regex: sanitize(search), $options: 'i' } },
                    { description: { $regex: sanitize(search), $options: 'i' } }
                ];
            }

            if (genre) {
                const genreRecord = await Genre.findOne({ name: sanitize(genre) });
                if (genreRecord) {
                    findQuery.genre = genreRecord._id;
                }
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const skip = (page - 1) * limit;

            const [stories, count] = await Promise.all([
                Story.find(findQuery)
                    .populate(populateOptions)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Story.countDocuments(findQuery)
            ]);

            // For each story, fetch likes count and episode count
            const transformedStories = await Promise.all(stories.map(async story => {
                const likesCount = await Like.countDocuments({ story: story._id });
                const episodesCount = await Episode.countDocuments({ story: story._id });

                return {
                    ...story,
                    id: story._id.toString(),
                    genre: story.genre ? { id: story.genre._id.toString(), name: story.genre.name } : null,
                    likesCount,
                    episodesCount,
                    _id: undefined
                };
            }));

            const genres = await Genre.find().select('_id name slug').sort({ name: 1 }).lean();
            // Removed fetching ContentWarnings as they are no longer linked directly

            res.json({
                success: true,
                stories: transformedStories,
                genres: genres.map(g => ({ ...g, id: g._id.toString(), _id: undefined })),
                // Removed warnings from response
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
                .populate({ path: 'genre', select: '_id name' })
                .lean(); // Use lean() for performance

            if (!story) {
                return res.status(404).json({
                    success: false,
                    message: 'Story not found'
                });
            }

            // Fetch episodes separately
            const episodes = await Episode.find({ story: story._id })
                .sort({ order: 1 })
                .lean();

            // Fetch comments separately and populate user, handle replies
            const comments = await Comment.find({ story: story._id, parent_comment: { $eq: null } }) // Fetch top-level comments
                .populate({ path: 'user', select: '_id name' }) // Populate the user who made the comment
                .sort({ createdAt: -1 })
                .lean();

            const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
                const replies = await Comment.find({ parent_comment: comment._id })
                    .populate({ path: 'user', select: '_id name' })
                    .sort({ createdAt: 1 })
                    .lean();
                return {
                    ...comment,
                    id: comment._id.toString(),
                    User: comment.user ? { id: comment.user._id.toString(), name: comment.user.name } : null,
                    user_id: comment.user ? comment.user._id.toString() : null, // Add user_id for frontend checks
                    user: undefined, // Remove original user ObjectId field
                    replies: replies.map(reply => ({
                        ...reply,
                        id: reply._id.toString(),
                        User: reply.user ? { id: reply.user._id.toString(), name: reply.user.name } : null,
                        user_id: reply.user ? reply.user._id.toString() : null, // Add user_id for frontend checks
                        user: undefined, // Remove original user ObjectId field
                    }))
                };
            }));

            // Record StoryView
            await StoryView.create({
                story: story._id,
                user: req.user ? req.user._id : null,
                ip_address: req.ip
            });

            // Check like and bookmark status
            const isLiked = req.user ? await Like.countDocuments({ user: req.user._id, story: story._id }) > 0 : false;
            const bookmarked = req.user ? await Bookmark.countDocuments({ user: req.user._id, story: story._id }) > 0 : false;
            const likesCount = await Like.countDocuments({ story: story._id }); // Get total likes count
            const episodesCount = episodes.length; // Number of episodes

            let readingProgress = [];
            if (req.user && episodes.length > 0) {
                const episodeIds = episodes.map(ep => ep._id);
                readingProgress = await ReadingProgress.find({ user: req.user._id, episode: { $in: episodeIds } })
                    .select('episode completed last_read_at -_id')
                    .lean();

                readingProgress = readingProgress.map(rp => ({
                    ...rp,
                    episode_id: rp.episode.toString(),
                    episode: undefined
                }));
            }

            // Transform story, episodes, genre to use 'id'
            const transformedStory = {
                ...story,
                id: story._id.toString(),
                genre: story.genre ? { id: story.genre._id.toString(), name: story.genre.name } : null,
                episodes: episodes.map(ep => ({
                    ...ep,
                    id: ep._id.toString(),
                    story_id: ep.story.toString(),
                    _id: undefined
                })),
                likesCount, // Include likesCount
                episodesCount, // Include episodesCount
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
                .lean();

            // Removed ContentWarning fetching as it's no longer a direct part of story creation
            res.json({
                success: true,
                genres: genres.map(g => ({ ...g, id: g._id.toString(), _id: undefined }))
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
            if (!req.files?.thumbnail || !req.files?.content_file) {
                return res.status(400).json({
                    success: false,
                    message: 'Both thumbnail and content file are required'
                });
            }

            const { title, writer, genre_id, description, price, is_featured } = req.body; // Removed is_premium, age_restriction, warnings

            if (!title || !writer || !genre_id || !description || price === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            const thumbnailFile = req.files.thumbnail[0];
            const contentFile = req.files.content_file[0];

            if (!['image/jpeg', 'image/png', 'image/gif'].includes(thumbnailFile.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid thumbnail file type'
                });
            }

            // Updated content file types to include .docx
            const allowedContentTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedContentTypes.includes(contentFile.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: 'Only .txt, .pdf, or .docx files are allowed for content!'
                });
            }

            const genreObjectId = new mongoose.Types.ObjectId(genre_id);

            const story = await Story.create({
                title: sanitize(title),
                writer: sanitize(writer), // Now a string
                genre: genreObjectId,
                description: sanitize(description),
                thumbnail: `/uploads/${thumbnailFile.filename}`,
                price: parseFloat(price),
                content_file: `/uploads/${contentFile.filename}`,
                is_featured: is_featured === 'true',
                // Removed is_premium and age_restriction
            });

            res.status(201).json({
                success: true,
                message: 'Story published successfully!',
                story: { ...story.toObject(), id: story._id.toString(), _id: undefined }
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
            const story = await Story.findById(req.params.storyId);
            if (!story) {
                return res.status(404).json({
                    success: false,
                    message: 'Story not found'
                });
            }

            // Authorization: The writer field is now a string, so compare directly.
            // Also, ensure `req.user` is available and has an `_id` and `role`.
            // If you want to link the story's writer (string) to a user in your system
            // for edit permissions, you might need a separate mechanism (e.g., storing `writer_user_id` as well).
            // For now, I'm assuming 'admin' can edit any story.
            if (req.user && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: Only an admin can update stories.' });
            }


            const thumbnailFile = req.files?.thumbnail ? req.files.thumbnail[0] : null;
            const contentFile = req.files?.content_file ? req.files.content_file[0] : null;

            if (thumbnailFile && !['image/jpeg', 'image/png', 'image/gif'].includes(thumbnailFile.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid thumbnail file type'
                });
            }

            const allowedContentTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (contentFile && !allowedContentTypes.includes(contentFile.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: 'Only .txt, .pdf, or .docx files are allowed for content!'
                });
            }

            const { title, writer, genre_id, description, price, is_featured } = req.body; // Removed is_premium, age_restriction, warnings

            story.title = sanitize(title);
            story.writer = sanitize(writer); // Update writer as string
            story.description = sanitize(description);
            story.price = parseFloat(price);
            story.is_featured = is_featured === 'true';
            // Removed is_premium and age_restriction updates

            if (genre_id) {
                story.genre = new mongoose.Types.ObjectId(genre_id);
            }

            if (thumbnailFile) {
                story.thumbnail = `/uploads/${thumbnailFile.filename}`;
            }
            if (contentFile) {
                story.content_file = `/uploads/${contentFile.filename}`;
            }

            await story.save();

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
            const story = await Story.findById(req.params.storyId);
            if (!story) {
                return res.status(404).json({
                    success: false,
                    message: 'Story not found'
                });
            }

            // Authorization
            // If writer is just a string, direct comparison to req.user._id.toString() won't work.
            // Assuming only 'admin' can delete stories if writer is a string.
            if (req.user && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: Only an admin can delete stories.' });
            }


            await story.deleteOne();

            // Cascading deletes for related data
            await Episode.deleteMany({ story: story._id });
            await Comment.deleteMany({ story: story._id });
            await Like.deleteMany({ story: story._id });
            await Bookmark.deleteMany({ story: story._id });
            await StoryView.deleteMany({ story: story._id });
            await StoryPurchase.deleteMany({ story: story._id });
            await StoryWarning.deleteMany({ story: story._id }); // Still delete if the StoryWarning model exists, for data integrity

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