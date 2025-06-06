const { User, Follow } = require('../models');

class FollowController {
    async toggle(req, res) {
        try {
            const followedId = req.params.userId; // This is the _id of the user to be followed
            const followerId = req.user._id; // User from auth middleware, use _id

            // Check if user is trying to follow themselves
            if (followedId.toString() === followerId.toString()) { // Compare string representations of ObjectIds
                return res.status(400).json({ message: "You cannot follow yourself." });
            }

            // Mongoose: findOne with direct field names
            const follow = await Follow.findOne({ follower: followerId, followed: followedId });

            let followingStatus;
            if (follow) {
                await follow.deleteOne(); // Mongoose: deleteOne on a document instance
                followingStatus = false;
            } else {
                await Follow.create({ follower: followerId, followed: followedId });
                followingStatus = true;
            }

            // Mongoose: count related documents
            // We need to find the followed user to count their followers
            const followedUser = await User.findById(followedId);
            if (!followedUser) {
                return res.status(404).json({ message: 'Followed user not found.' });
            }
            const followersCount = await Follow.countDocuments({ followed: followedUser._id });

            res.json({ following: followingStatus, count: followersCount });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error toggling follow', error: error.message });
        }
    }
}

module.exports = new FollowController();