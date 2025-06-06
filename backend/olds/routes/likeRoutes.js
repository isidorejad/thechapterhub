// routes/likeRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const likeController = require('../controllers/likeController');

router.post('/stories/:storyId/toggle-like', auth, likeController.toggle);

module.exports = router;