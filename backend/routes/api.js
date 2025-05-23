const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middlewares/auth');

// Import controllers
const storyController = require('../controllers/storyController');
const episodeController = require('../controllers/episodeController');
const bookmarkController = require('../controllers/bookmarkController');
const commentController = require('../controllers/commentController');
const followController = require('../controllers/followController');
const likeController = require('../controllers/likeController');
const readingProgressController = require('../controllers/readingProgressController');
const shareController = require('../controllers/shareController');
const storyPurchaseController = require('../controllers/storyPurchaseController');
const tokenTransactionController = require('../controllers/tokenTransactionController');
const authController = require('../controllers/authController');

// Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', auth, authController.getProfile);

// Story Routes
router.get('/stories', storyController.index);
router.get('/stories/:id', storyController.show);
router.get('/stories/create/data', StoryController.getCreationData);
router.post('/stories', auth, authorize(['writer', 'admin']), storyController.store); // Example auth for creation
router.get('/stories/:id/edit-info', auth, authorize(['writer', 'admin']), storyController.edit); // Fetch info for edit form
router.put('/stories/:id', auth, authorize(['writer', 'admin']), storyController.update);
router.delete('/stories/:id', auth, authorize(['writer', 'admin']), storyController.destroy);

// Episode Routes
router.get('/stories/:storyId/episodes/:episodeId', auth, episodeController.show); // User must be authenticated to track progress
router.post('/stories/:storyId/episodes', auth, authorize(['writer', 'admin']), episodeController.store);
router.get('/stories/:storyId/episodes/create-info', auth, authorize(['writer', 'admin']), episodeController.create); // Fetch info for create form
router.get('/stories/:storyId/episodes/:episodeId/edit-info', auth, authorize(['writer', 'admin']), episodeController.edit); // Fetch info for edit form
router.put('/stories/:storyId/episodes/:episodeId', auth, authorize(['writer', 'admin']), episodeController.update);
router.delete('/stories/:storyId/episodes/:episodeId', auth, authorize(['writer', 'admin']), episodeController.destroy);

// Bookmark Routes
router.post('/stories/:storyId/toggle-bookmark', auth, bookmarkController.toggle);

// Comment Routes
router.post('/stories/:storyId/comments', auth, commentController.store);
router.delete('/comments/:commentId', auth, commentController.destroy); // Adjust to be comment-specific

// Follow Routes
router.post('/users/:userId/toggle-follow', auth, followController.toggle);

// Like Routes
router.post('/stories/:storyId/toggle-like', auth, likeController.toggle);

// Reading Progress Routes
router.post('/episodes/:episodeId/mark-as-read', auth, readingProgressController.markAsRead);

// Share Routes
router.post('/stories/:storyId/share/:platform', auth, shareController.shareStory);
router.post('/stories/:storyId/episodes/:episodeId/share/:platform', auth, shareController.shareEpisode);

// Story Purchase Routes
router.post('/stories/:storyId/purchase', auth, storyPurchaseController.purchase);

// Token Transaction Routes
router.get('/tokens/transactions', auth, tokenTransactionController.index);
router.get('/tokens/purchase-info', auth, tokenTransactionController.getPurchaseInfo);
router.post('/tokens/purchase', auth, tokenTransactionController.store);

router.get('/user/library', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const purchasedStories = await StoryPurchase.findAll({
            where: { user_id: userId },
            include: [{
                model: Story,
                include: [{ model: User, as: 'writer', attributes: ['id', 'name'] }, { model: Genre, attributes: ['id', 'name'] }]
            }]
        });
        res.json({ purchasedStories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching purchased stories.', error: error.message });
    }
});

// backend/routes/api.js (add this)
router.put('/profile', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Filter allowed fields for update
        const { name, dob, contact_number, address, profile_picture, language, timezone } = req.body;
        await user.update({
            name,
            dob,
            contact_number,
            address,
            profile_picture,
            language,
            timezone
        });

        res.json({ message: 'Profile updated successfully!', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating profile.', error: error.message });
    }
});
// backend/routes/api.js (add this)
router.get('/tokens/transactions/:id', auth, async (req, res) => {
    try {
        const transactionId = req.params.id;
        const transaction = await TokenTransaction.findOne({
            where: { id: transactionId, user_id: req.user.id } // Ensure user owns the transaction
        });
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found or you do not have access.' });
        }
        res.json({ transaction });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching transaction details.', error: error.message });
    }
});

// backend/routes/api.js (add this)
router.get('/genres', async (req, res) => {
    try {
        const genres = await Genre.findAll({ attributes: ['id', 'name', 'slug', 'description'] });
        res.json(genres);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching genres.', error: error.message });
    }
});
// backend/routes/api.js (add this)
router.get('/genres/:slug', async (req, res) => {
    try {
        const genre = await Genre.findOne({ where: { slug: req.params.slug } });
        if (!genre) {
            return res.status(404).json({ message: 'Genre not found.' });
        }
        res.json({ genre });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching genre.', error: error.message });
    }
});

module.exports = router;