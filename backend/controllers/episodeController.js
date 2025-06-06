const { Story, Episode, ReadingProgress, StoryPurchase } = require('../models');

class EpisodeController {
    /**
     * Displays a single episode.
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    async show(req, res) {
        try {
            const { storyId, episodeId } = req.params;

            // Mongoose will attempt to cast storyId and episodeId to ObjectId automatically.
            // If the cast fails (e.g., invalid format), it will throw a CastError caught by the try/catch.
            const story = await Story.findById(storyId).lean(); // Use .lean() to get a plain JavaScript object
            const episode = await Episode.findById(episodeId).lean(); // Use .lean()

            // Check if story or episode exists and if the episode belongs to the story
            if (!story || !episode || episode.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Episode not found for this story.', code: 'EPISODE_NOT_FOUND' });
            }

            // Authorization: Check if user can view episode based on story price
            // Assuming story.price > 0 implies a paid story
            if (story.price > 0) {
                if (!req.user) {
                    return res.status(403).json({ message: 'Login and purchase story to view episodes.', code: 'UNAUTHENTICATED_FOR_PAID' });
                }

                const hasPurchased = await StoryPurchase.findOne({ user: req.user._id, story: story._id });
                if (!hasPurchased) {
                    return res.status(403).json({ message: 'Purchase story to view episodes.', code: 'NOT_PURCHASED' });
                }
            }

            // Track reading progress if a user is logged in
            if (req.user) {
                await ReadingProgress.findOneAndUpdate(
                    { user: req.user._id, episode: episode._id },
                    { completed: false, last_read_at: new Date() }, // Mark as not completed on just viewing
                    { upsert: true, new: true, setDefaultsOnInsert: true } // Create if not found, return updated document
                );
            }

            // Fetch next and previous episodes for navigation
            const nextEpisode = await Episode.findOne({
                story: story._id,
                order: { $gt: episode.order } // Find episode with order greater than current
            }).sort({ order: 1 }).lean(); // Sort ascending to get the very next one

            const prevEpisode = await Episode.findOne({
                story: story._id,
                order: { $lt: episode.order } // Find episode with order less than current
            }).sort({ order: -1 }).lean(); // Sort descending to get the very previous one

            // Transform Mongoose objects into plain JavaScript objects with 'id' for frontend consistency
            // And add writer_id to story for frontend authorization checks (e.g., in EpisodeDetail)
            const transformedStory = { ...story, id: story._id.toString(), _id: undefined, writer_id: story.writer.toString() };
            const transformedEpisode = { ...episode, id: episode._id.toString(), _id: undefined };
            const transformedNextEpisode = nextEpisode ? { ...nextEpisode, id: nextEpisode._id.toString(), _id: undefined } : null;
            const transformedPrevEpisode = prevEpisode ? { ...prevEpisode, id: prevEpisode._id.toString(), _id: undefined } : null;

            res.json({
                story: transformedStory,
                episode: transformedEpisode,
                nextEpisode: transformedNextEpisode,
                prevEpisode: transformedPrevEpisode
            });
        } catch (error) {
            console.error('Error in EpisodeController.show:', error);
            // Catch CastError (invalid ObjectId format) and other errors
            if (error.name === 'CastError') {
                return res.status(400).json({ message: 'Invalid Story or Episode ID format.', error: error.message, code: 'INVALID_ID_FORMAT' });
            }
            res.status(500).json({ message: 'Error fetching episode', error: error.message, code: 'EPISODE_SHOW_ERROR' });
        }
    }

    /**
     * Prepares data for the episode creation form.
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    async create(req, res) {
        try {
            const story = await Story.findById(req.params.storyId).lean(); // Fetch story, convert to plain object
            if (!story) {
                return res.status(404).json({ message: 'Story not found.', code: 'STORY_NOT_FOUND' });
            }

            // Authorization: Only the writer of the story or an admin can create episodes
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to create episodes for this story.', code: 'UNAUTHORIZED_CREATE' });
            }

            // Find the maximum existing order number for episodes in this story
            const maxOrderResult = await Episode.aggregate([
                { $match: { story: story._id } }, // Match episodes belonging to this story
                { $group: { _id: null, maxOrder: { $max: "$order" } } } // Group all to find max order
            ]);
            // Calculate the next available order number
            const nextOrder = (maxOrderResult.length > 0 ? maxOrderResult[0].maxOrder : 0) + 1;

            // Transform story for frontend consistency (including writer_id for authorization)
            const transformedStory = {
                ...story,
                id: story._id.toString(),
                _id: undefined,
                writer_id: story.writer.toString() // Explicitly add writer_id as a string
            };

            res.json({ story: transformedStory, nextOrder });
        } catch (error) {
            console.error('Error in EpisodeController.create:', error);
            if (error.name === 'CastError') {
                return res.status(400).json({ message: 'Invalid Story ID format.', error: error.message, code: 'INVALID_ID_FORMAT' });
            }
            res.status(500).json({ message: 'Error preparing episode creation form', error: error.message, code: 'EPISODE_CREATE_FORM_ERROR' });
        }
    }

    /**
     * Stores a new episode.
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    async store(req, res) {
        try {
            const story = await Story.findById(req.params.storyId).lean(); // Fetch story, convert to plain object
            if (!story) {
                return res.status(404).json({ message: 'Story not found.', code: 'STORY_NOT_FOUND' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to create episodes for this story.', code: 'UNAUTHORIZED_STORE' });
            }

            const { title, content_file, thumbnail, order } = req.body;

            // Basic input validation for required fields
            if (!title || !content_file || order === undefined || order === null) {
                return res.status(400).json({ message: 'Title, content file, and order are required.', code: 'MISSING_EPISODE_FIELDS' });
            }

            // Create the new episode document
            const episode = await Episode.create({
                story: story._id, // Link episode to its parent story by ID
                title,
                content_file,
                thumbnail,
                order
            });

            // Transform the newly created episode for frontend consistency
            const transformedEpisode = { ...episode.toObject(), id: episode._id.toString(), _id: undefined };

            res.status(201).json({ message: 'Episode published successfully!', episode: transformedEpisode });
        } catch (error) {
            console.error('Error in EpisodeController.store:', error);
            if (error.name === 'CastError') {
                return res.status(400).json({ message: 'Invalid Story ID format.', error: error.message, code: 'INVALID_ID_FORMAT' });
            }
            res.status(500).json({ message: 'Error publishing episode', error: error.message, code: 'EPISODE_STORE_ERROR' });
        }
    }

    /**
     * Prepares data for the episode edit form.
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    async edit(req, res) {
        try {
            const { storyId, episodeId } = req.params;
            const story = await Story.findById(storyId).lean(); // Fetch story, convert to plain object
            const episode = await Episode.findById(episodeId).lean(); // Fetch episode, convert to plain object

            // Check if story or episode exists and if the episode belongs to the story
            if (!story || !episode || episode.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Episode not found for this story.', code: 'EPISODE_NOT_FOUND' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to edit this episode.', code: 'UNAUTHORIZED_EDIT' });
            }

            // Transform story for frontend consistency (including writer_id for authorization)
            const transformedStory = {
                ...story,
                id: story._id.toString(),
                _id: undefined,
                writer_id: story.writer.toString() // Explicitly add writer_id as string
            };
            // Transform episode for frontend consistency
            const transformedEpisode = { ...episode, id: episode._id.toString(), _id: undefined };

            res.json({ story: transformedStory, episode: transformedEpisode });
        } catch (error) {
            console.error('Error in EpisodeController.edit:', error);
            if (error.name === 'CastError') {
                return res.status(400).json({ message: 'Invalid Story or Episode ID format.', error: error.message, code: 'INVALID_ID_FORMAT' });
            }
            res.status(500).json({ message: 'Error preparing episode edit form', error: error.message, code: 'EPISODE_EDIT_FORM_ERROR' });
        }
    }

    /**
     * Updates an existing episode.
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    async update(req, res) {
        try {
            const { storyId, episodeId } = req.params;
            // Fetch story and episode documents (not lean) as we will modify and save them
            const story = await Story.findById(storyId);
            const episode = await Episode.findById(episodeId);

            // Check if story or episode exists and if the episode belongs to the story
            if (!story || !episode || episode.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Episode not found for this story.', code: 'EPISODE_NOT_FOUND' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to update this episode.', code: 'UNAUTHORIZED_UPDATE' });
            }

            const { title, content_file, thumbnail, order } = req.body;

            // Basic input validation for required fields
            if (!title || !content_file || order === undefined || order === null) {
                return res.status(400).json({ message: 'Title, content file, and order are required.', code: 'MISSING_EPISODE_FIELDS' });
            }

            // Update episode fields
            episode.title = title;
            episode.content_file = content_file;
            episode.thumbnail = thumbnail;
            episode.order = order;
            await episode.save(); // Save the updated episode document

            // Transform the updated episode for frontend consistency
            const transformedEpisode = { ...episode.toObject(), id: episode._id.toString(), _id: undefined };

            res.json({ message: 'Episode updated successfully!', episode: transformedEpisode });
        } catch (error) {
            console.error('Error in EpisodeController.update:', error);
            if (error.name === 'CastError') {
                return res.status(400).json({ message: 'Invalid Story or Episode ID format.', error: error.message, code: 'INVALID_ID_FORMAT' });
            }
            res.status(500).json({ message: 'Error updating episode', error: error.message, code: 'EPISODE_UPDATE_ERROR' });
        }
    }

    /**
     * Deletes an episode.
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    async destroy(req, res) {
        try {
            const { storyId, episodeId } = req.params;
            const story = await Story.findById(storyId);
            const episode = await Episode.findById(episodeId);

            // Check if story or episode exists and if the episode belongs to the story
            if (!story || !episode || episode.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Episode not found for this story.', code: 'EPISODE_NOT_FOUND' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this episode.', code: 'UNAUTHORIZED_DELETE' });
            }

            await episode.deleteOne(); // Delete the episode document
            res.json({ message: 'Episode deleted successfully!' });
        } catch (error) {
            console.error('Error in EpisodeController.destroy:', error);
            if (error.name === 'CastError') {
                return res.status(400).json({ message: 'Invalid Story or Episode ID format.', error: error.message, code: 'INVALID_ID_FORMAT' });
            }
            res.status(500).json({ message: 'Error deleting episode', error: error.message, code: 'EPISODE_DELETE_ERROR' });
        }
    }
}

module.exports = new EpisodeController();
