// routes/bookmarkRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const bookmarkController = require('../controllers/bookmarkController');

router.post('/stories/:storyId/toggle-bookmark', auth, bookmarkController.toggle);

module.exports = router;