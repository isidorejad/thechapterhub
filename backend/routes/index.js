// routes/index.js
const express = require('express');
const router = express.Router();

// Import all route files
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const storyRoutes = require('./storyRoutes');
const episodeRoutes = require('./episodeRoutes');
const bookmarkRoutes = require('./bookmarkRoutes');
const commentRoutes = require('./commentRoutes');
const followRoutes = require('./followRoutes');
const likeRoutes = require('./likeRoutes');
const readingProgressRoutes = require('./readingProgressRoutes');
const shareRoutes = require('./shareRoutes');
const storyPurchaseRoutes = require('./storyPurchaseRoutes');
const tokenTransactionRoutes = require('./tokenTransactionRoutes');
const genreRoutes = require('./genreRoutes');
const emailRoutes = require('./emailRoutes');

// Mount all routes
router.use('/', authRoutes);
router.use('/', userRoutes);
router.use('/stories', storyRoutes);
router.use('/stories', episodeRoutes); // Episodes are nested under stories
router.use('/', bookmarkRoutes);
router.use('/', commentRoutes);
router.use('/', followRoutes);
router.use('/', likeRoutes);
router.use('/', readingProgressRoutes);
router.use('/', shareRoutes);
router.use('/', storyPurchaseRoutes);
router.use('/tokens', tokenTransactionRoutes);
router.use('/genres', genreRoutes);
router.use('/email', emailRoutes);

module.exports = router;