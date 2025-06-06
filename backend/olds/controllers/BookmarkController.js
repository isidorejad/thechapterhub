const { Story, Bookmark } = require('../models');

class BookmarkController {
    async toggle(req, res) {
        try {
            const storyId = req.params.storyId;
            const userId = req.user._id; // User from auth middleware, use _id

            // Mongoose: findOne with direct field names, not 'where'
            const bookmark = await Bookmark.findOne({ story: storyId, user: userId });

            if (bookmark) {
                await bookmark.deleteOne(); // Mongoose: deleteOne on a document instance
                return res.json({ bookmarked: false });
            }

            // Mongoose: create with direct field names
            await Bookmark.create({ story: storyId, user: userId });
            res.json({ bookmarked: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error toggling bookmark', error: error.message });
        }
    }
}

module.exports = new BookmarkController();