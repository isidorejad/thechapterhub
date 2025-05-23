const { Story, Episode, Share } = require('../models');

// Helper function to generate share URLs
const getShareUrl = (platform, story, episode = null) => {
    let url = `<span class="math-inline">\{process\.env\.FRONTEND\_URL\}/stories/</span>{story.id}`;
    let text = `Check out this story: ${story.title}`;

    if (episode) {
        url = `<span class="math-inline">\{process\.env\.FRONTEND\_URL\}/stories/</span>{story.id}/episodes/${episode.id}`;
        text = `Check out this episode: ${episode.title} from ${story.title}`;
    }

    switch (platform) {
        case 'twitter':
            return `https://twitter.com/intent/tweet?text=<span class="math-inline">\{encodeURIComponent\(text\)\}&url\=</span>{encodeURIComponent(url)}`;
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
            const userId = req.user.id;

            const story = await Story.findByPk(storyId);
            if (!story) {
                return res.status(404).json({ message: 'Story not found.' });
            }

            await Share.create({
                user_id: userId,
                story_id: story.id,
                episode_id: null, // No episode for story share
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
            const userId = req.user.id;

            const story = await Story.findByPk(storyId);
            const episode = await Episode.findByPk(episodeId);

            if (!story || !episode || episode.story_id !== story.id) {
                return res.status(404).json({ message: 'Story or Episode not found.' });
            }

            await Share.create({
                user_id: userId,
                story_id: story.id,
                episode_id: episode.id,
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