// routes/commentRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const commentController = require('../controllers/commentController');

// POST /api/stories/:storyId/comments
router.post('/stories/:storyId/comments', auth, commentController.store);

// DELETE /api/comments/:commentId
router.delete('/comments/:commentId', auth, commentController.destroy);

module.exports = router;