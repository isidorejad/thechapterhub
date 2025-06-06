// routes/shareRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const shareController = require('../controllers/shareController');

router.post('/stories/:storyId/share/:platform', auth, shareController.shareStory);
router.post('/stories/:storyId/episodes/:episodeId/share/:platform', auth, shareController.shareEpisode);

module.exports = router;