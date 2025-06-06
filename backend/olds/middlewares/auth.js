// middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Now imports Mongoose User model

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).send({ error: 'Authentication token missing' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // In Mongoose, you find by _id
        const user = await User.findById(decoded.id); // Mongoose: findById

        if (!user) {
            return res.status(401).send({ error: 'User not found' });
        }

        // Adjust path check if your paths are different, or remove if not strictly necessary
        if (!user.is_verified && req.path !== '/api/auth/verify-email' && req.path !== '/api/auth/resend-verification') {
            return res.status(403).send({
                error: 'Email not verified',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }

        req.token = token;
        req.user = user; // Mongoose document is attached
        next();
    } catch (e) {
        if (e.name === 'TokenExpiredError') {
            return res.status(401).send({
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (e.name === 'JsonWebTokenError') {
            return res.status(401).send({
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        res.status(401).send({ error: 'Please authenticate', code: 'AUTHENTICATION_FAILED' });
    }
};

const authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Authentication required',
                code: 'AUTHENTICATION_REQUIRED'
            });
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Forbidden: You do not have permission to access this resource.',
                code: 'FORBIDDEN'
            });
        }
        next();
    };
};

module.exports = { auth, authorize };