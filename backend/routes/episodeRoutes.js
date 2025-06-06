const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middlewares/auth');
const episodeController = require('../controllers/episodeController');

// Episode Routes (nested under stories)

// 1. More specific routes first:
// Route for getting data to create a new episode (e.g., next order number)
router.get('/:storyId/episodes/create-info', auth, authorize(['writer', 'admin']), episodeController.create);
// Route for getting data to edit an existing episode
router.get('/:storyId/episodes/:episodeId/edit-info', auth, authorize(['writer', 'admin']), episodeController.edit);


// 2. More general routes after specific ones:
// Route for viewing a single episode
router.get('/:storyId/episodes/:episodeId', auth, episodeController.show);
// Route for storing a new episode
router.post('/:storyId/episodes', auth, authorize(['writer', 'admin']), episodeController.store);
// Route for updating an existing episode
router.put('/:storyId/episodes/:episodeId', auth, authorize(['writer', 'admin']), episodeController.update);
// Route for deleting an episode
router.delete('/:storyId/episodes/:episodeId', auth, authorize(['writer', 'admin']), episodeController.destroy);

module.exports = router;
