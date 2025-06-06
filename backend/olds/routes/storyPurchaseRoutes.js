// routes/storyPurchaseRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const storyPurchaseController = require('../controllers/storyPurchaseController');

router.post('/stories/:storyId/purchase', auth, storyPurchaseController.purchase);

module.exports = router;