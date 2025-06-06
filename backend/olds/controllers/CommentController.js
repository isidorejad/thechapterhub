const { Story, Comment } = require('../models');

class CommentController {
    async store(req, res) {
        try {
            const storyId = req.params.storyId;
            const { comment, parent_id } = req.body;
            const userId = req.user._id; // Use _id

            // Mongoose: findById
            const story = await Story.findById(storyId);
            if (!story) {
                return res.status(404).json({ message: 'Story not found.' });
            }

            // Mongoose: create with direct field names, parent_comment for reference
            await Comment.create({
                user: userId,
                story: storyId,
                comment,
                parent_comment: parent_id // Referencing parent comment's _id
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
            // Mongoose: findById
            const comment = await Comment.findById(commentId);

            if (!comment) {
                return res.status(404).json({ message: 'Comment not found.' });
            }

            // Authorization: Check if user owns the comment or is admin
            // Use ._id for comparison
            if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this comment.' });
            }

            await comment.deleteOne(); // Mongoose: deleteOne on a document instance
            res.json({ message: 'Comment deleted successfully!' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting comment', error: error.message });
        }
    }
}

module.exports = new CommentController();