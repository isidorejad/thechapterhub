const { Story, Like } = require('../models');

class LikeController {
    async toggle(req, res) {
        try {
            const storyId = req.params.storyId;
            const userId = req.user._id; // Use _id

            // Mongoose: findOne with direct field names
            const like = await Like.findOne({ story: storyId, user: userId });

            let likedStatus;
            if (like) {
                await like.deleteOne(); // Mongoose: deleteOne on a document instance
                likedStatus = false;
            } else {
                await Like.create({ story: storyId, user: userId });
                likedStatus = true;
            }

            // Mongoose: findById and countDocuments for associated likes
            const story = await Story.findById(storyId);
            if (!story) {
                 return res.status(404).json({ message: 'Story not found.' });
            }
            const likesCount = await Like.countDocuments({ story: story._id });

            res.json({ liked: likedStatus, count: likesCount });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error toggling like', error: error.message });
        }
    }
}

module.exports = new LikeController();