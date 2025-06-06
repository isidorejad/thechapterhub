// routes/readingProgressRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const readingProgressController = require('../controllers/readingProgressController');

router.post('/episodes/:episodeId/mark-as-read', auth, readingProgressController.markAsRead);

module.exports = router;