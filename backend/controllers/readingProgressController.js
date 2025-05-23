const { Episode, ReadingProgress } = require('../models');

class ReadingProgressController {
    async markAsRead(req, res) {
        try {
            const episodeId = req.params.episodeId;
            const userId = req.user.id;

            await ReadingProgress.findOrCreate({
                where: { user_id: userId, episode_id: episodeId },
                defaults: { completed: true, last_read_at: new Date() }
            });

            // If it already exists, update 'completed' and 'last_read_at'
            await ReadingProgress.update(
                { completed: true, last_read_at: new Date() },
                { where: { user_id: userId, episode_id: episodeId } }
            );

            res.json({ success: true, message: 'Episode marked as read.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error marking episode as read', error: error.message });
        }
    }
}

module.exports = new ReadingProgressController();