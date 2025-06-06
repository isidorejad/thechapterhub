const { Story, Episode, ReadingProgress, StoryPurchase } = require('../models');
// const { Op } = require('sequelize'); // No longer needed for Mongoose

class EpisodeController {
    async show(req, res) {
        try {
            const { storyId, episodeId } = req.params;
            // Mongoose: findById
            const story = await Story.findById(storyId);
            const episode = await Episode.findById(episodeId);

            // Use ._id for comparison, and convert to string for strict equality if needed
            if (!story || !episode || episode.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Episode not found for this story.' });
            }

            // Authorization: Check if user can view episode (similar to your Laravel policy)
            if (story.is_premium && req.user) {
                // Mongoose: findOne with direct field names, user and story are ObjectIds
                const hasPurchased = await StoryPurchase.findOne({ user: req.user._id, story: story._id });
                if (!hasPurchased) {
                    return res.status(403).json({ message: 'Purchase story to view episodes.' });
                }
            } else if (story.is_premium && !req.user) {
                return res.status(403).json({ message: 'Login and purchase story to view episodes.' });
            }

            // Track reading progress
            if (req.user) {
                // Mongoose: findOneAndUpdate with upsert: true for findOrCreate-like behavior
                await ReadingProgress.findOneAndUpdate(
                    { user: req.user._id, episode: episode._id },
                    { completed: false, last_read_at: new Date() }, // Set completed to false on just viewing
                    { upsert: true, new: true, setDefaultsOnInsert: true } // upsert: true creates if not found, new: true returns modified document
                );
            }

            // Get next and previous episodes
            // Mongoose: find with $gt (greater than) and $lt (less than) for order
            const nextEpisode = await Episode.findOne({
                story: story._id,
                order: { $gt: episode.order }
            }).sort({ order: 1 }); // Sort by order ascending

            const prevEpisode = await Episode.findOne({
                story: story._id,
                order: { $lt: episode.order }
            }).sort({ order: -1 }); // Sort by order descending

            res.json({
                story,
                episode,
                nextEpisode,
                prevEpisode
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching episode', error: error.message });
        }
    }

    async create(req, res) {
        try {
            // Mongoose: findById
            const story = await Story.findById(req.params.storyId);
            if (!story) {
                return res.status(404).json({ message: 'Story not found.' });
            }

            // Authorization (e.g., only writer of the story can create episodes)
            // Use ._id for comparison
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to create episodes for this story.' });
            }

            // Mongoose: Aggregate to find max order
            const maxOrderResult = await Episode.aggregate([
                { $match: { story: story._id } },
                { $group: { _id: null, maxOrder: { $max: "$order" } } }
            ]);
            const nextOrder = (maxOrderResult.length > 0 ? maxOrderResult[0].maxOrder : 0) + 1;

            res.json({ story, nextOrder });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error preparing episode creation form', error: error.message });
        }
    }

    async store(req, res) {
        try {
            // Mongoose: findById
            const story = await Story.findById(req.params.storyId);
            if (!story) {
                return res.status(404).json({ message: 'Story not found.' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to create episodes for this story.' });
            }

            const { title, content_file, thumbnail, order } = req.body;

            // Mongoose: create
            const episode = await Episode.create({
                story: story._id, // Reference to story _id
                title,
                content_file,
                thumbnail,
                order
            });

            res.status(201).json({ message: 'Episode published successfully!', episode });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error publishing episode', error: error.message });
        }
    }

    async edit(req, res) {
        try {
            const { storyId, episodeId } = req.params;
            // Mongoose: findById
            const story = await Story.findById(storyId);
            const episode = await Episode.findById(episodeId);

            if (!story || !episode || episode.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Episode not found for this story.' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to edit this episode.' });
            }

            res.json({ story, episode });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error preparing episode edit form', error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { storyId, episodeId } = req.params;
            // Mongoose: findById
            const story = await Story.findById(storyId);
            const episode = await Episode.findById(episodeId);

            if (!story || !episode || episode.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Episode not found for this story.' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to update this episode.' });
            }

            const { title, content_file, thumbnail, order } = req.body;

            // Mongoose: update fields and save
            episode.title = title;
            episode.content_file = content_file;
            episode.thumbnail = thumbnail;
            episode.order = order;
            await episode.save();

            res.json({ message: 'Episode updated successfully!', episode });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error updating episode', error: error.message });
        }
    }

    async destroy(req, res) {
        try {
            const { storyId, episodeId } = req.params;
            // Mongoose: findById
            const story = await Story.findById(storyId);
            const episode = await Episode.findById(episodeId);

            if (!story || !episode || episode.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Episode not found for this story.' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this episode.' });
            }

            await episode.deleteOne(); // Mongoose: deleteOne on a document instance
            res.json({ message: 'Episode deleted successfully!' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting episode', error: error.message });
        }
    }
}

module.exports = new EpisodeController();