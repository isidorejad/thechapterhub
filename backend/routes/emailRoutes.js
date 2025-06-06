// routes/emailRoutes.js
const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');

// Contact form route
router.post('/contact', async (req, res) => {
    console.log('Contact form submitted:', req.body);
    try {
        const { name, email, phone, subject, message, subscribe } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Name, email, subject, and message are required.' 
            });
        }

        const contactData = { name, email, phone, subject, message, subscribe };
        await emailService.sendContactEmail(contactData);

        res.status(200).json({ 
            status: 'success', 
            message: 'Your message has been sent successfully!' 
        });
    } catch (error) {
        console.error('API Error sending contact email:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to send message. Please try again later.',
            error: error.message
        });
    }
});

module.exports = router;
