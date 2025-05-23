const { Story, Like } = require('../models');

class LikeController {
    async toggle(req, res) {
        try {
            const storyId = req.params.storyId;
            const userId = req.user.id;

            const like = await Like.findOne({
                where: { story_id: storyId, user_id: userId }
            });

            let likedStatus;
            if (like) {
                await like.destroy();
                likedStatus = false;
            } else {
                await Like.create({ story_id: storyId, user_id: userId });
                likedStatus = true;
            }

            const story = await Story.findByPk(storyId);
            const likesCount = await story.countLikes(); // Sequelize generated method

            res.json({ liked: likedStatus, count: likesCount });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error toggling like', error: error.message });
        }
    }
}

module.exports = new LikeController();