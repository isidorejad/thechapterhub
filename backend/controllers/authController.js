// // controllers/authController.js
// const { User, UserToken, VerificationToken, PasswordResetToken } = require('../models'); // Now imports Mongoose models
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const emailService = require('../services/emailService');

// class AuthController {
//     async register(req, res) {
//         try {
//             const { name, email, password, role = 'user', dob, contact_number, address, profile_picture, language, timezone } = req.body;

//             // Validate input
//             if (!name || !email || !password) {
//                 return res.status(400).json({
//                     message: 'Name, email, and password are required',
//                     code: 'MISSING_REQUIRED_FIELDS'
//                 });
//             }

//             // Check if email is already registered
//             const existingUser = await User.findOne({ email });
//             if (existingUser) {
//                 return res.status(409).json({
//                     message: 'Email already registered',
//                     code: 'EMAIL_ALREADY_EXISTS'
//                 });
//             }

//             // Hash password
//             const hashedPassword = await bcrypt.hash(password, 10);

//             // Create user
//             const user = await User.create({
//                 name,
//                 email,
//                 password: hashedPassword,
//                 role,
//                 dob,
//                 contact_number,
//                 address,
//                 profile_picture,
//                 language,
//                 timezone,
//                 is_verified: false
//             });

//             // Create default user token entry
//             await UserToken.create({ user: user._id, balance: 15.00 });

//             // Generate verification token
//             const verificationToken = jwt.sign(
//                 { id: user._id, purpose: 'email_verification' },
//                 process.env.JWT_SECRET,
//                 { expiresIn: '1h' }
//             );

//             // Save verification token
//             await VerificationToken.create({
//                 user: user._id,
//                 token: verificationToken,
//                 expires_at: new Date(Date.now() + 3600000) // 1 hour from now
//             });

//             // Send verification email
//             await emailService.sendVerificationEmail(user, verificationToken);

//             // Generate auth token
//             const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

//             res.status(201).json({
//                 message: 'Registration successful! Please check your email to verify your account.',
//                 user: {
//                     id: user._id, // Return _id as id for consistency with frontend
//                     name: user.name,
//                     email: user.email,
//                     role: user.role,
//                     is_verified: user.is_verified
//                 },
//                 token: authToken
//             });
//         } catch (error) {
//             console.error('Registration error:', error);
//             if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
//                    return res.status(409).json({
//                        message: 'Email already registered',
//                        code: 'EMAIL_ALREADY_EXISTS'
//                    });
//             }
//             res.status(500).json({
//                 message: 'Error during registration',
//                 error: error.message,
//                 code: 'REGISTRATION_ERROR'
//             });
//         }
//     }

//     async login(req, res) {
//         try {
//             const { email, password } = req.body;

//             if (!email || !password) {
//                 return res.status(400).json({
//                     message: 'Email and password are required',
//                     code: 'MISSING_CREDENTIALS'
//                 });
//             }

//             const user = await User.findOne({ email });
//             if (!user) {
//                 return res.status(401).json({
//                     message: 'Invalid email or password',
//                     code: 'INVALID_CREDENTIALS'
//                 });
//             }

//             const isMatch = await bcrypt.compare(password, user.password);
//             if (!isMatch) {
//                 return res.status(401).json({
//                     message: 'Invalid email or password',
//                     code: 'INVALID_CREDENTIALS'
//                 });
//             }

//             if (!user.is_verified) {
//                 return res.status(403).json({
//                     message: 'Please verify your email address before logging in',
//                     code: 'EMAIL_NOT_VERIFIED'
//                 });
//             }

//             // Generate token
//             const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

//             // --- IMPORTANT CHANGE HERE: Removed .populate('tokens') and fetching separately ---
//             // Fetch user's token balance separately
//             const userTokens = await UserToken.findOne({ user: user._id });

//             // Convert Mongoose document to plain JavaScript object before manipulation
//             const userResponse = user.toObject();
//             delete userResponse.password; // Remove password before sending

//             // Ensure _id is converted to id and then deleted, for consistency with frontend
//             userResponse.id = userResponse._id.toString();
//             delete userResponse._id;

//             // Attach token balance if found
//             if (userTokens) {
//                 userResponse.tokens = {
//                     id: userTokens._id.toString(), // Convert _id to id for consistency
//                     user_id: userTokens.user.toString(), // Convert user ObjectId to string
//                     balance: userTokens.balance,
//                     createdAt: userTokens.createdAt,
//                     updatedAt: userTokens.updatedAt
//                 };
//             } else {
//                 // Provide a default if no UserToken entry is found (though it should be created on registration)
//                 userResponse.tokens = { balance: 0.00 };
//             }

//             res.json({
//                 message: 'Login successful!',
//                 user: userResponse, // Send the prepared user object
//                 token
//             });
//         } catch (error) {
//             console.error('Login error:', error);
//             res.status(500).json({
//                 message: 'Error during login',
//                 error: error.message,
//                 code: 'LOGIN_ERROR'
//             });
//         }
//     }

//     async verifyEmail(req, res) {
//         try {
//             const { token } = req.body;

//             if (!token) {
//                 return res.status(400).json({
//                     message: 'Verification token is required',
//                     code: 'MISSING_VERIFICATION_TOKEN'
//                 });
//             }

//             const decoded = jwt.verify(token, process.env.JWT_SECRET);

//             if (decoded.purpose !== 'email_verification') {
//                 return res.status(400).json({
//                     message: 'Invalid token purpose',
//                     code: 'INVALID_TOKEN_PURPOSE'
//                 });
//             }

//             const verificationToken = await VerificationToken.findOne({
//                 token: token,
//                 user: decoded.id,
//                 expires_at: { $gt: new Date() }
//             });

//             if (!verificationToken) {
//                 return res.status(400).json({
//                     message: 'Invalid or expired verification token',
//                     code: 'INVALID_VERIFICATION_TOKEN'
//                 });
//             }

//             const user = await User.findById(decoded.id);
//             if (!user) {
//                 return res.status(404).json({
//                     message: 'User not found',
//                     code: 'USER_NOT_FOUND'
//                 });
//             }

//             if (user.is_verified) {
//                 return res.status(400).json({
//                     message: 'Email already verified',
//                     code: 'EMAIL_ALREADY_VERIFIED'
//                 });
//             }

//             user.is_verified = true;
//             await user.save();

//             await VerificationToken.deleteOne({ _id: verificationToken._id });

//             // --- IMPORTANT CHANGE HERE: Removed .populate('tokens') and fetching separately ---
//             // Re-fetch user (without password) to ensure frontend context is fully updated
//             const userWithTokens = await User.findById(user._id).select('-password').lean(); // Use lean() for plain JS object

//             // Fetch user's token balance separately
//             const userTokens = await UserToken.findOne({ user: user._id });

//             const userResponse = userWithTokens; // userWithTokens is already a plain object due to .lean()
//             userResponse.id = userResponse._id.toString();
//             delete userResponse._id;

//             // Attach token balance if found
//             if (userTokens) {
//                 userResponse.tokens = {
//                     id: userTokens._id.toString(),
//                     user_id: userTokens.user.toString(),
//                     balance: userTokens.balance,
//                     createdAt: userTokens.createdAt,
//                     updatedAt: userTokens.updatedAt
//                 };
//             } else {
//                 userResponse.tokens = { balance: 0.00 };
//             }


//             res.json({
//                 message: 'Email verified successfully!',
//                 user: userResponse
//             });
//         } catch (error) {
//             console.error('Email verification error:', error);
//             if (error.name === 'TokenExpiredError') {
//                 return res.status(400).json({
//                     message: 'Verification token has expired',
//                     code: 'TOKEN_EXPIRED'
//                 });
//             }
//             if (error.name === 'JsonWebTokenError') {
//                 return res.status(400).json({
//                     message: 'Invalid verification token',
//                     code: 'INVALID_TOKEN'
//                 });
//             }
//             res.status(500).json({
//                 message: 'Error verifying email',
//                 error: error.message,
//                 code: 'VERIFICATION_ERROR'
//             });
//         }
//     }

//     async resendVerificationEmail(req, res) {
//         try {
//             const { email } = req.body;

//             if (!email) {
//                 return res.status(400).json({
//                     message: 'Email is required',
//                     code: 'MISSING_EMAIL'
//                 });
//             }

//             const user = await User.findOne({ email });
//             if (!user) {
//                 return res.status(404).json({
//                     message: 'User not found',
//                     code: 'USER_NOT_FOUND'
//                 });
//             }

//             if (user.is_verified) {
//                 return res.status(400).json({
//                     message: 'Email already verified',
//                     code: 'EMAIL_ALREADY_VERIFIED'
//                 });
//             }

//             await VerificationToken.deleteMany({ user: user._id });

//             const verificationToken = jwt.sign(
//                 { id: user._id, purpose: 'email_verification' },
//                 process.env.JWT_SECRET,
//                 { expiresIn: '1h' }
//             );

//             await VerificationToken.create({
//                 user: user._id,
//                 token: verificationToken,
//                 expires_at: new Date(Date.now() + 3600000)
//             });

//             await emailService.sendVerificationEmail(user, verificationToken);

//             res.json({
//                 message: 'Verification email resent successfully! Please check your email.'
//             });
//         } catch (error) {
//             console.error('Resend verification email error:', error);
//             res.status(500).json({
//                 message: 'Error resending verification email',
//                 error: error.message,
//                 code: 'RESEND_VERIFICATION_ERROR'
//             });
//         }
//     }

//     async forgotPassword(req, res) {
//         try {
//             const { email } = req.body;

//             if (!email) {
//                 return res.status(400).json({
//                     message: 'Email is required',
//                     code: 'MISSING_EMAIL'
//                 });
//             }

//             const user = await User.findOne({ email });
//             if (!user) {
//                 return res.json({
//                     message: 'If an account with that email exists, a password reset link has been sent.'
//                 });
//             }

//             await PasswordResetToken.deleteMany({ user: user._id });

//             const resetToken = jwt.sign(
//                 { id: user._id, purpose: 'password_reset' },
//                 process.env.JWT_SECRET,
//                 { expiresIn: '1h' }
//             );

//             await PasswordResetToken.create({
//                 user: user._id,
//                 token: resetToken,
//                 expires_at: new Date(Date.now() + 3600000)
//             });

//             await emailService.sendPasswordResetEmail(user, resetToken);

//             res.json({
//                 message: 'If an account with that email exists, a password reset link has been sent.'
//             });
//         } catch (error) {
//             console.error('Forgot password error:', error);
//             res.status(500).json({
//                 message: 'Error processing password reset request',
//                 error: error.message,
//                 code: 'FORGOT_PASSWORD_ERROR'
//             });
//         }
//     }

//     async resetPassword(req, res) {
//         try {
//             const { token, newPassword, confirmPassword } = req.body;

//             if (!token || !newPassword || !confirmPassword) {
//                 return res.status(400).json({
//                     message: 'Token, new password, and confirmation are required',
//                     code: 'MISSING_REQUIRED_FIELDS'
//                 });
//             }

//             if (newPassword !== confirmPassword) {
//                 return res.status(400).json({
//                     message: 'Passwords do not match',
//                     code: 'PASSWORDS_DONT_MATCH'
//                 });
//             }

//             const decoded = jwt.verify(token, process.env.JWT_SECRET);

//             if (decoded.purpose !== 'password_reset') {
//                 return res.status(400).json({
//                     message: 'Invalid token purpose',
//                     code: 'INVALID_TOKEN_PURPOSE'
//                 });
//             }

//             const resetToken = await PasswordResetToken.findOne({
//                 token: token,
//                 user: decoded.id,
//                 expires_at: { $gt: new Date() }
//             });

//             if (!resetToken) {
//                 return res.status(400).json({
//                     message: 'Invalid or expired password reset token',
//                     code: 'INVALID_RESET_TOKEN'
//                 });
//             }

//             const user = await User.findById(decoded.id);
//             if (!user) {
//                 return res.status(404).json({
//                     message: 'User not found',
//                     code: 'USER_NOT_FOUND'
//                 });
//             }

//             const hashedPassword = await bcrypt.hash(newPassword, 10);

//             user.password = hashedPassword;
//             await user.save();

//             await PasswordResetToken.deleteOne({ _id: resetToken._id });

//             res.json({
//                 message: 'Password reset successfully! You can now login with your new password.'
//             });
//         } catch (error) {
//             console.error('Password reset error:', error);
//             if (error.name === 'TokenExpiredError') {
//                 return res.status(400).json({
//                     message: 'Password reset token has expired',
//                     code: 'TOKEN_EXPIRED'
//                 });
//             }
//             if (error.name === 'JsonWebTokenError') {
//                 return res.status(400).json({
//                     message: 'Invalid password reset token',
//                     code: 'INVALID_TOKEN'
//                 });
//             }
//             res.status(500).json({
//                 message: 'Error resetting password',
//                 error: error.message,
//                 code: 'PASSWORD_RESET_ERROR'
//             });
//         }
//     }
// }

// module.exports = new AuthController();

// controllers/authController.js
const { User, UserToken, VerificationToken, PasswordResetToken } = require('../models'); // Now imports Mongoose models
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

class AuthController {
    async register(req, res) {
        try {
            const { name, email, password, role = 'user', dob, contact_number, address, profile_picture, language, timezone } = req.body;

            // Validate input
            if (!name || !email || !password) {
                return res.status(400).json({
                    message: 'Name, email, and password are required',
                    code: 'MISSING_REQUIRED_FIELDS'
                });
            }

            // Check if email is already registered
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({
                    message: 'Email already registered',
                    code: 'EMAIL_ALREADY_EXISTS'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
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
                timezone,
                is_verified: false
            });

            // Create default user token entry
            await UserToken.create({ user: user._id, balance: 15.00 });

            // Generate verification token
            const verificationToken = jwt.sign(
                { id: user._id, purpose: 'email_verification' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Save verification token
            await VerificationToken.create({
                user: user._id,
                token: verificationToken,
                expires_at: new Date(Date.now() + 3600000) // 1 hour from now
            });

            // Send verification email
            await emailService.sendVerificationEmail(user, verificationToken);

            // Generate auth token
            const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.status(201).json({
                message: 'Registration successful! Please check your email to verify your account.',
                user: {
                    id: user._id, // Return _id as id for consistency with frontend
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    is_verified: user.is_verified
                },
                token: authToken
            });
        } catch (error) {
            console.error('Registration error:', error);
            if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
                   return res.status(409).json({
                       message: 'Email already registered',
                       code: 'EMAIL_ALREADY_EXISTS'
                   });
            }
            res.status(500).json({
                message: 'Error during registration',
                error: error.message,
                code: 'REGISTRATION_ERROR'
            });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    message: 'Email and password are required',
                    code: 'MISSING_CREDENTIALS'
                });
            }

            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({
                    message: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({
                    message: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            if (!user.is_verified) {
                return res.status(403).json({
                    message: 'Please verify your email address before logging in',
                    code: 'EMAIL_NOT_VERIFIED'
                });
            }

            // Generate token
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // --- REMOVED: .populate('tokens') from User.findById(user._id) ---
            // --- FETCHING USERTOKEN SEPARATELY ---
            const userTokens = await UserToken.findOne({ user: user._id }).lean(); // Fetch separately and use .lean()

            // Convert Mongoose user document to plain JavaScript object for manipulation
            const userResponse = user.toObject();
            delete userResponse.password; // Remove password before sending

            // Ensure _id is converted to id and then deleted, for consistency with frontend
            userResponse.id = userResponse._id.toString();
            delete userResponse._id;

            // Attach token balance to the user object if found
            if (userTokens) {
                userResponse.tokens = {
                    id: userTokens._id.toString(), // Convert _id to id for consistency
                    user_id: userTokens.user.toString(), // Convert user ObjectId to string
                    balance: userTokens.balance,
                    createdAt: userTokens.createdAt,
                    updatedAt: userTokens.updatedAt
                };
            } else {
                // Provide a default if no UserToken entry is found (e.g., if registration was incomplete or old data)
                userResponse.tokens = { balance: 0.00 };
            }

            res.json({
                message: 'Login successful!',
                user: userResponse, // Send the prepared user object
                token
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                message: 'Error during login',
                error: error.message,
                code: 'LOGIN_ERROR'
            });
        }
    }

    async verifyEmail(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    message: 'Verification token is required',
                    code: 'MISSING_VERIFICATION_TOKEN'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.purpose !== 'email_verification') {
                return res.status(400).json({
                    message: 'Invalid token purpose',
                    code: 'INVALID_TOKEN_PURPOSE'
                });
            }

            const verificationToken = await VerificationToken.findOne({
                token: token,
                user: decoded.id,
                expires_at: { $gt: new Date() }
            });

            if (!verificationToken) {
                return res.status(400).json({
                    message: 'Invalid or expired verification token',
                    code: 'INVALID_VERIFICATION_TOKEN'
                });
            }

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(404).json({
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            if (user.is_verified) {
                return res.status(400).json({
                    message: 'Email already verified',
                    code: 'EMAIL_ALREADY_VERIFIED'
                });
            }

            user.is_verified = true;
            await user.save();

            await VerificationToken.deleteOne({ _id: verificationToken._id });

            // --- REMOVED: .populate('tokens') from User.findById(user._id) ---
            // Re-fetch user (without password) and fetch UserToken separately for the response
            const userWithTokens = await User.findById(user._id).select('-password').lean(); // Use .lean()
            const userTokens = await UserToken.findOne({ user: user._id }).lean(); // Fetch separately

            const userResponse = userWithTokens; // userWithTokens is already a plain object due to .lean()
            userResponse.id = userResponse._id.toString();
            delete userResponse._id;

            // Attach token balance to the user object if found
            if (userTokens) {
                userResponse.tokens = {
                    id: userTokens._id.toString(),
                    user_id: userTokens.user.toString(),
                    balance: userTokens.balance,
                    createdAt: userTokens.createdAt,
                    updatedAt: userTokens.updatedAt
                };
            } else {
                userResponse.tokens = { balance: 0.00 };
            }

            res.json({
                message: 'Email verified successfully!',
                user: userResponse
            });
        } catch (error) {
            console.error('Email verification error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(400).json({
                    message: 'Verification token has expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(400).json({
                    message: 'Invalid verification token',
                    code: 'INVALID_TOKEN'
                });
            }
            res.status(500).json({
                message: 'Error verifying email',
                error: error.message,
                code: 'VERIFICATION_ERROR'
            });
        }
    }

    async resendVerificationEmail(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    message: 'Email is required',
                    code: 'MISSING_EMAIL'
                });
            }

            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            if (user.is_verified) {
                return res.status(400).json({
                    message: 'Email already verified',
                    code: 'EMAIL_ALREADY_VERIFIED'
                });
            }

            await VerificationToken.deleteMany({ user: user._id });

            const verificationToken = jwt.sign(
                { id: user._id, purpose: 'email_verification' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            await VerificationToken.create({
                user: user._id,
                token: verificationToken,
                expires_at: new Date(Date.now() + 3600000)
            });

            await emailService.sendVerificationEmail(user, verificationToken);

            res.json({
                message: 'Verification email resent successfully! Please check your email.'
            });
        } catch (error) {
            console.error('Resend verification email error:', error);
            res.status(500).json({
                message: 'Error resending verification email',
                error: error.message,
                code: 'RESEND_VERIFICATION_ERROR'
            });
        }
    }

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    message: 'Email is required',
                    code: 'MISSING_EMAIL'
                });
            }

            const user = await User.findOne({ email });
            if (!user) {
                // For security, always respond with a generic message if user not found for forgot password
                return res.json({
                    message: 'If an account with that email exists, a password reset link has been sent.'
                });
            }

            // Delete any existing password reset tokens for this user
            await PasswordResetToken.deleteMany({ user: user._id });

            const resetToken = jwt.sign(
                { id: user._id, purpose: 'password_reset' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            await PasswordResetToken.create({
                user: user._id,
                token: resetToken,
                expires_at: new Date(Date.now() + 3600000) // 1 hour from now
            });

            await emailService.sendPasswordResetEmail(user, resetToken);

            res.json({
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                message: 'Error processing password reset request',
                error: error.message,
                code: 'FORGOT_PASSWORD_ERROR'
            });
        }
    }

    async resetPassword(req, res) {
        try {
            const { token, newPassword, confirmPassword } = req.body;

            if (!token || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    message: 'Token, new password, and confirmation are required',
                    code: 'MISSING_REQUIRED_FIELDS'
                });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    message: 'Passwords do not match',
                    code: 'PASSWORDS_DONT_MATCH'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.purpose !== 'password_reset') {
                return res.status(400).json({
                    message: 'Invalid token purpose',
                    code: 'INVALID_TOKEN_PURPOSE'
                });
            }

            const resetToken = await PasswordResetToken.findOne({
                token: token,
                user: decoded.id,
                expires_at: { $gt: new Date() }
            });

            if (!resetToken) {
                return res.status(400).json({
                    message: 'Invalid or expired password reset token',
                    code: 'INVALID_RESET_TOKEN'
                });
            }

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(404).json({
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            user.password = hashedPassword;
            await user.save();

            await PasswordResetToken.deleteOne({ _id: resetToken._id });

            res.json({
                message: 'Password reset successfully! You can now login with your new password.'
            });
        } catch (error) {
            console.error('Password reset error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(400).json({
                    message: 'Password reset token has expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(400).json({
                    message: 'Invalid password reset token',
                    code: 'INVALID_TOKEN'
                });
            }
            res.status(500).json({
                message: 'Error resetting password',
                error: error.message,
                code: 'PASSWORD_RESET_ERROR'
            });
        }
    }
}

module.exports = new AuthController();
