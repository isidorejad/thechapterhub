const { Story, Episode, ReadingProgress } = require('../models');
const { Op } = require('sequelize');

class EpisodeController {
    async show(req, res) {
        try {
            const { storyId, episodeId } = req.params;
            const story = await Story.findByPk(storyId);
            const episode = await Episode.findByPk(episodeId);

            if (!story || !episode || episode.story_id !== story.id) {
                return res.status(404).json({ message: 'Episode not found for this story.' });
            }

            // Authorization: Check if user can view episode (similar to your Laravel policy)
            // This would be a good place for a dedicated middleware if complex
            // For simplicity, let's assume if story is premium, episode also needs purchase
            if (story.is_premium && req.user) {
                const hasPurchased = await StoryPurchase.findOne({
                    where: { user_id: req.user.id, story_id: story.id }
                });
                if (!hasPurchased) {
                    return res.status(403).json({ message: 'Purchase story to view episodes.' });
                }
            } else if (story.is_premium && !req.user) {
                return res.status(403).json({ message: 'Login and purchase story to view episodes.' });
            }


            // Track reading progress
            if (req.user) {
                await ReadingProgress.findOrCreate({
                    where: { user_id: req.user.id, episode_id: episode.id },
                    defaults: { last_read_at: new Date() }
                });
                // If already exists, update last_read_at
                await ReadingProgress.update(
                    { last_read_at: new Date() },
                    { where: { user_id: req.user.id, episode_id: episode.id } }
                );
            }

            // Get next and previous episodes
            const nextEpisode = await Episode.findOne({
                where: {
                    story_id: story.id,
                    order: { [Op.gt]: episode.order }
                },
                order: [['order', 'ASC']]
            });

            const prevEpisode = await Episode.findOne({
                where: {
                    story_id: story.id,
                    order: { [Op.lt]: episode.order }
                },
                order: [['order', 'DESC']]
            });

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
            const story = await Story.findByPk(req.params.storyId);
            if (!story) {
                return res.status(404).json({ message: 'Story not found.' });
            }

            // Authorization (e.g., only writer of the story can create episodes)
            if (req.user.id !== story.writer_id && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to create episodes for this story.' });
            }

            const nextOrder = (await Episode.max('order', { where: { story_id: story.id } })) + 1 || 1;

            res.json({ story, nextOrder });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error preparing episode creation form', error: error.message });
        }
    }

    async store(req, res) {
        try {
            const story = await Story.findByPk(req.params.storyId);
            if (!story) {
                return res.status(404).json({ message: 'Story not found.' });
            }

            // Authorization
            if (req.user.id !== story.writer_id && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to create episodes for this story.' });
            }

            const { title, content_file, thumbnail, order } = req.body;

            const episode = await Episode.create({
                story_id: story.id,
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
            const story = await Story.findByPk(storyId);
            const episode = await Episode.findByPk(episodeId);

            if (!story || !episode || episode.story_id !== story.id) {
                return res.status(404).json({ message: 'Episode not found for this story.' });
            }

            // Authorization
            if (req.user.id !== story.writer_id && req.user.role !== 'admin') {
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
            const story = await Story.findByPk(storyId);
            const episode = await Episode.findByPk(episodeId);

            if (!story || !episode || episode.story_id !== story.id) {
                return res.status(404).json({ message: 'Episode not found for this story.' });
            }

            // Authorization
            if (req.user.id !== story.writer_id && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to update this episode.' });
            }

            const { title, content_file, thumbnail, order } = req.body;

            await episode.update({ title, content_file, thumbnail, order });

            res.json({ message: 'Episode updated successfully!', episode });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error updating episode', error: error.message });
        }
    }

    async destroy(req, res) {
        try {
            const { storyId, episodeId } = req.params;
            const story = await Story.findByPk(storyId);
            const episode = await Episode.findByPk(episodeId);

            if (!story || !episode || episode.story_id !== story.id) {
                return res.status(404).json({ message: 'Episode not found for this story.' });
            }

            // Authorization
            if (req.user.id !== story.writer_id && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this episode.' });
                         }

            await episode.destroy();
            res.json({ message: 'Episode deleted successfully!' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting episode', error: error.message });
        }
    }
}

module.exports = new EpisodeController();