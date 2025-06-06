// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const emailService = require('../services/emailService'); // This service will also need updates

// Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// The contact route is commented out, but if enabled, emailService.sendContactEmail
// would also need to be reviewed to ensure it uses any necessary Mongoose models
// or simply expects raw data.

module.exports = router;