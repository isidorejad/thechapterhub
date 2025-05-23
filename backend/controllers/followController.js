const { User, Follow } = require('../models');

class FollowController {
    async toggle(req, res) {
        try {
            const followedId = req.params.userId;
            const followerId = req.user.id;

            if (parseInt(followedId) === followerId) {
                return res.status(400).json({ message: "You cannot follow yourself." });
            }

            const follow = await Follow.findOne({
                where: { follower_id: followerId, followed_id: followedId }
            });

            let followingStatus;
            if (follow) {
                await follow.destroy();
                followingStatus = false;
            } else {
                await Follow.create({ follower_id: followerId, followed_id: followedId });
                followingStatus = true;
            }

            const followedUser = await User.findByPk(followedId);
            const followersCount = await followedUser.countFollowers(); // Sequelize generated method

            res.json({ following: followingStatus, count: followersCount });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error toggling follow', error: error.message });
        }
    }
}

module.exports = new FollowController();