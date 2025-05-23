const { Story, Bookmark } = require('../models');

class BookmarkController {
    async toggle(req, res) {
        try {
            const storyId = req.params.storyId;
            const userId = req.user.id; // User from auth middleware

            const bookmark = await Bookmark.findOne({
                where: { story_id: storyId, user_id: userId }
            });

            if (bookmark) {
                await bookmark.destroy();
                return res.json({ bookmarked: false });
            }

            await Bookmark.create({ story_id: storyId, user_id: userId });
            res.json({ bookmarked: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error toggling bookmark', error: error.message });
        }
    }
}

module.exports = new BookmarkController();