const { Story, Episode, Share } = require('../models');

// Helper function to generate share URLs
const getShareUrl = (platform, story, episode = null) => {
    let url = `${process.env.FRONTEND_URL}/stories/${story._id}`; // Use _id
    let text = `Check out this story: ${story.title}`;

    if (episode) {
        url = `${process.env.FRONTEND_URL}/stories/${story._id}/episodes/${episode._id}`; // Use _id
        text = `Check out this episode: ${episode.title} from ${story.title}`;
    }

    switch (platform) {
        case 'twitter':
            return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        case 'facebook':
            return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        default:
            return url;
    }
};

class ShareController {
    async shareStory(req, res) {
        try {
            const storyId = req.params.storyId;
            const platform = req.params.platform;
            const userId = req.user._id; // Use _id

            // Mongoose: findById
            const story = await Story.findById(storyId);
            if (!story) {
                return res.status(404).json({ message: 'Story not found.' });
            }

            // Mongoose: create with direct field names, null for episode
            await Share.create({
                user: userId,
                story: story._id, // Reference to story _id
                episode: null, // No episode for story share
                platform
            });

            const shareUrl = getShareUrl(platform, story);
            res.json({ message: 'Story shared successfully!', shareUrl });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error sharing story', error: error.message });
        }
    }

    async shareEpisode(req, res) {
        try {
            const { storyId, episodeId, platform } = req.params;
            const userId = req.user._id; // Use _id

            // Mongoose: findById
            const story = await Story.findById(storyId);
            const episode = await Episode.findById(episodeId);

            // Use ._id for comparison
            if (!story || !episode || episode.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Story or Episode not found.' });
            }

            // Mongoose: create with direct field names
            await Share.create({
                user: userId,
                story: story._id, // Reference to story _id
                episode: episode._id, // Reference to episode _id
                platform
            });

            const shareUrl = getShareUrl(platform, story, episode);
            res.json({ message: 'Episode shared successfully!', shareUrl });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error sharing episode', error: error.message });
        }
    }
}

module.exports = new ShareController();