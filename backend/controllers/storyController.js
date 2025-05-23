const { Story, Genre, ContentWarning, User, Like, Bookmark, ReadingProgress, Episode, StoryView, StoryPurchase } = require('../models');
const { Op } = require('sequelize');

class StoryController {
    async index(req, res) {
        try {
            const { search, genre, warning } = req.query;
            let whereClause = {};
            let includeClause = [
                { model: User, as: 'writer', attributes: ['id', 'name'] },
                { model: Genre, attributes: ['id', 'name'] }
            ];

            if (search) {
                whereClause = {
                    [Op.or]: [
                        { title: { [Op.like]: `%${search}%` } },
                        { description: { [Op.like]: `%${search}%` } }
                    ]
                };
            }

            if (genre) {
                const genreRecord = await Genre.findOne({ where: { name: genre } });
                if (genreRecord) {
                    whereClause.genre_id = genreRecord.id;
                }
            }

            if (warning) {
                includeClause.push({
                    model: ContentWarning,
                    as: 'warnings',
                    where: { name: warning },
                    through: { attributes: [] } // Don't return join table attributes
                });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const offset = (page - 1) * limit;

            const { count, rows: stories } = await Story.findAndCountAll({
                where: whereClause,
                include: includeClause,
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });

            const genres = await Genre.findAll({ attributes: ['id', 'name', 'slug'] });
            const warnings = await ContentWarning.findAll({ attributes: ['id', 'name'] });

            res.json({
                stories,
                genres,
                warnings,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching stories', error: error.message });
        }
    }

    async show(req, res) {
        try {
            const story = await Story.findByPk(req.params.id, {
                include: [
                    { model: User, as: 'writer', attributes: ['id', 'name'] },
                    { model: Genre, attributes: ['id', 'name'] },
                    { model: ContentWarning, as: 'warnings', through: { attributes: [] } },
                    { model: Episode, as: 'episodes', order: [['order', 'ASC']] }
                ]
            });

            if (!story) {
                return res.status(404).json({ message: 'Story not found' });
            }

            let canAccess = true;
            if (story.is_premium && req.user) {
                const hasPurchased = await StoryPurchase.findOne({
                    where: { user_id: req.user.id, story_id: story.id }
                });
                if (!hasPurchased) {
                    canAccess = false;
                }
            } else if (story.is_premium && !req.user) {
                canAccess = false;
            }

            if (!canAccess) {
                // This is where you'd typically render a purchase page in Laravel.
                // In MERN, you'll send a status and let the frontend redirect or show a purchase modal.
                return res.status(403).json({ message: 'Premium story, purchase required.', requiresPurchase: true, story });
            }

            // Increment views
            await StoryView.create({
                story_id: story.id,
                user_id: req.user ? req.user.id : null,
                ip_address: req.ip
            });

            const isLiked = req.user ? await Like.count({ where: { user_id: req.user.id, story_id: story.id } }) > 0 : false;
            const bookmarked = req.user ? await Bookmark.count({ where: { user_id: req.user.id, story_id: story.id } }) > 0 : false;
            let readingProgress = [];

            if (req.user && story.episodes.length > 0) {
                const episodeIds = story.episodes.map(ep => ep.id);
                readingProgress = await ReadingProgress.findAll({
                    where: { user_id: req.user.id, episode_id: { [Op.in]: episodeIds } },
                    attributes: ['episode_id', 'completed', 'last_read_at']
                });
            }

            res.json({
                story,
                isLiked,
                bookmarked,
                readingProgress
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching story', error: error.message });
        }
    }

    async create(req, res) {
        try {
            // Authorization handled by middleware
            const genres = await Genre.findAll();
            const warnings = await ContentWarning.findAll();
            res.json({ genres, warnings });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error preparing story creation form', error: error.message });
        }
    }

    async store(req, res) {
        try {
            // Authorization handled by middleware
            const { title, genre_id, description, thumbnail, price, content_file, is_featured, is_premium, age_restriction, warnings } = req.body;

            const story = await Story.create({
                title,
                writer_id: req.user.id,
                genre_id,
                description,
                thumbnail,
                price,
                content_file,
                is_featured,
                is_premium,
                age_restriction
            });

            if (warnings && warnings.length > 0) {
                await story.addWarnings(warnings); // addWarnings is a Sequelize generated method
            }

            res.status(201).json({ message: 'Story published successfully!', story });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error publishing story', error: error.message });
        }
    }

    async edit(req, res) {
        try {
            const story = await Story.findByPk(req.params.id, {
                include: [{ model: ContentWarning, as: 'warnings' }]
            });

            if (!story) {
                return res.status(404).json({ message: 'Story not found' });
            }

            // Authorization handled by middleware

            const genres = await Genre.findAll();
            const warnings = await ContentWarning.findAll();
            const selectedWarnings = story.warnings.map(warning => warning.id);

            res.json({ story, genres, warnings, selectedWarnings });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error preparing story edit form', error: error.message });
        }
    }

    async update(req, res) {
        try {
            const story = await Story.findByPk(req.params.id);
            if (!story) {
                return res.status(404).json({ message: 'Story not found' });
            }

            // Authorization handled by middleware

            const { title, genre_id, description, thumbnail, price, content_file, is_featured, is_premium, age_restriction, warnings } = req.body;

            await story.update({
                title,
                genre_id,
                description,
                thumbnail,
                price,
                content_file,
                is_featured,
                is_premium,
                age_restriction
            });

            if (warnings !== undefined) {
                await story.setWarnings(warnings); // setWarnings updates associations
            }

            res.json({ message: 'Story updated successfully!', story });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error updating story', error: error.message });
        }
    }
    async getCreationData(req, res) {
        try {
            const genres = await Genre.findAll({
                attributes: ['id', 'name', 'slug'],
                order: [['name', 'ASC']]
            });
            
            const warnings = await ContentWarning.findAll({
                attributes: ['id', 'name', 'description'],
                order: [['name', 'ASC']]
            });
            
            res.json({ 
                success: true,
                genres,
                warnings 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to load story creation data',
                error: error.message 
            });
        }
    }
    async destroy(req, res) {
        try {
            const story = await Story.findByPk(req.params.id);
            if (!story) {
                return res.status(404).json({ message: 'Story not found' });
            }

            // Authorization handled by middleware

            await story.destroy();
            res.json({ message: 'Story deleted successfully!' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting story', error: error.message });
        }
    }
}

module.exports = new StoryController();