// routes/episodeRoutes.js
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middlewares/auth');
const episodeController = require('../controllers/episodeController');

// Episode Routes (nested under stories)
router.get('/:storyId/episodes/:episodeId', auth, episodeController.show);
router.post('/:storyId/episodes', auth, authorize(['writer', 'admin']), episodeController.store);
router.get('/:storyId/episodes/create-info', auth, authorize(['writer', 'admin']), episodeController.create);
router.get('/:storyId/episodes/:episodeId/edit-info', auth, authorize(['writer', 'admin']), episodeController.edit);
router.put('/:storyId/episodes/:episodeId', auth, authorize(['writer', 'admin']), episodeController.update);
router.delete('/:storyId/episodes/:episodeId', auth, authorize(['writer', 'admin']), episodeController.destroy);

module.exports = router;