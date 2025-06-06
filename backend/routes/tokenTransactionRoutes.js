// routes/tokenTransactionRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const tokenTransactionController = require('../controllers/tokenTransactionController');

router.get('/transactions', auth, tokenTransactionController.index);
router.get('/purchase-info', auth, tokenTransactionController.getPurchaseInfo);
router.post('/purchase', auth, tokenTransactionController.store);

module.exports = router;