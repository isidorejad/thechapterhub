// routes/storyRoutes.js
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storyController = require('../controllers/storyController');

// Multer Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for thumbnail!'), false);
        }
    } else if (file.fieldname === 'content_file') {
        if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
            cb(null, true);
        } else {
            cb(new Error('Only .txt or .pdf files are allowed for content!'), false);
        }
    } else {
        cb(new Error('Unexpected file field'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 // 5MB
    }
});

// Story Routes
router.get('/', storyController.index);
router.get('/create/data', auth, authorize(['writer', 'admin']), storyController.getCreationData);
router.get('/:storyId', storyController.show);
router.get('/:storyId/edit-info', auth, authorize(['writer', 'admin']), storyController.update);

router.post('/', 
    auth, 
    authorize(['writer', 'admin']), 
    upload.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'content_file', maxCount: 1 }
    ]),
    (req, res, next) => {
        if (req.fileValidationError) {
            return res.status(400).json({ 
                success: false,
                message: req.fileValidationError 
            });
        }
        next();
    },
    storyController.store
);

router.put('/:storyId', 
    auth, 
    authorize(['writer', 'admin']), 
    upload.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'content_file', maxCount: 1 }
    ]),
    (req, res, next) => {
        if (req.fileValidationError) {
            return res.status(400).json({ 
                success: false,
                message: req.fileValidationError 
            });
        }
        next();
    },
    storyController.update
);

router.delete('/:storyId', auth, authorize(['writer', 'admin']), storyController.destroy);

module.exports = router;