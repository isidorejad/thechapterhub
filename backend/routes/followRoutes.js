// routes/followRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const followController = require('../controllers/followController');

router.post('/users/:userId/toggle-follow', auth, followController.toggle);

module.exports = router;