const { User, UserToken } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthController {
    async register(req, res) {
        try {
            const { name, email, password, role = 'user', dob, contact_number, address, profile_picture, language, timezone } = req.body;

            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                name,
                email,
                password: hashedPassword,
                role,
                dob,
                contact_number,
                address,
                profile_picture,
                language,
                timezone
            });

            // Create default user token entry
            await UserToken.create({ user_id: user.id, balance: 15.00 });

            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.status(201).json({ message: 'Registration successful!', user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error during registration', error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ where: { email } });
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials.' });
            }
                const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.json({ message: 'Login successful!', user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error during login', error: error.message });
        }
    }

    async getProfile(req, res) {
        // User object is attached by auth middleware
        res.json({ user: req.user });
    }
}

module.exports = new AuthController();