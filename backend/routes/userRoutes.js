// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth'); // Ensure this path is correct
const userController = require('../controllers/UserController'); // Import the new controller
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // For ensuring upload directory exists

// Multer Configuration for Profile Pictures
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure the upload directory exists
        const uploadDir = path.join(__dirname, '../uploads/profiles'); // Dedicated folder for profile pics
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Use user ID (req.user._id) to name the file to ensure uniqueness per user
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const profileFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        // Pass an error if the file type is not an image
        cb(new Error('Only image files are allowed!'), false);
    }
};

const uploadProfile = multer({
    storage: profileStorage,
    fileFilter: profileFileFilter,
    limits: {
        fileSize: 1024 * 1024 * 2 // 2MB limit for profile pictures
    }
});

// Protected User Routes using the new UserController
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, uploadProfile.single('profile_picture_file'), userController.updateProfile);
router.get('/user/library', auth, userController.getUserLibrary);
router.get('/user/my-written-stories', auth, userController.getMyWrittenStories);

module.exports = router;
