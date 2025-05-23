const { Story, Comment } = require('../models');

class CommentController {
    async store(req, res) {
        try {
            const storyId = req.params.storyId;
            const { comment, parent_id } = req.body;
            const userId = req.user.id;

            const story = await Story.findByPk(storyId);
            if (!story) {
                return res.status(404).json({ message: 'Story not found.' });
            }

            await Comment.create({
                user_id: userId,
                story_id: storyId,
                comment,
                parent_id
              });

            res.status(201).json({ message: 'Comment added successfully!' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error adding comment', error: error.message });
        }
    }

    async destroy(req, res) {
        try {
            const commentId = req.params.commentId;
            const comment = await Comment.findByPk(commentId);

            if (!comment) {
                return res.status(404).json({ message: 'Comment not found.' });
            }

            // Authorization: Check if user owns the comment or is admin
            if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this comment.' });
            }

            await comment.destroy();
            res.json({ message: 'Comment deleted successfully!' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting comment', error: error.message });
        }
    }
}

module.exports = new CommentController();