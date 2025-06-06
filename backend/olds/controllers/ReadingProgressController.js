const { Episode, ReadingProgress } = require('../models');

class ReadingProgressController {
    async markAsRead(req, res) {
        try {
            const episodeId = req.params.episodeId;
            const userId = req.user._id; // Use _id

            // Mongoose: findOneAndUpdate with upsert: true to replace findOrCreate and update
            await ReadingProgress.findOneAndUpdate(
                { user: userId, episode: episodeId },
                { completed: true, last_read_at: new Date() },
                { upsert: true, new: true, setDefaultsOnInsert: true } // upsert: true creates if not found, new: true returns modified document
            );

            res.json({ success: true, message: 'Episode marked as read.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error marking episode as read', error: error.message });
        }
    }
}

module.exports = new ReadingProgressController();