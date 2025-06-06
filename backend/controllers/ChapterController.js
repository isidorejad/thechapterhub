const { Story, Chapter, ReadingProgress, StoryPurchase } = require('../models');
// const { Op } = require('sequelize'); // No longer needed for Mongoose

class ChapterController {
    async show(req, res) {
        try {
            const { storyId, chapterId } = req.params;
            // Mongoose: findById
            const story = await Story.findById(storyId);
            const chapter = await Chapter.findById(chapterId);

            // Use ._id for comparison, and convert to string for strict equality if needed
            if (!story || !chapter || chapter.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Chapter not found for this story.' });
            }

            // Authorization: Check if user can view chapter (similar to your Laravel policy)
            if (story.is_premium && req.user) {
                // Mongoose: findOne with direct field names, user and story are ObjectIds
                const hasPurchased = await StoryPurchase.findOne({ user: req.user._id, story: story._id });
                if (!hasPurchased) {
                    return res.status(403).json({ message: 'Purchase story to view chapters.' });
                }
            } else if (story.is_premium && !req.user) {
                return res.status(403).json({ message: 'Login and purchase story to view chapters.' });
            }

            // Track reading progress
            if (req.user) {
                // Mongoose: findOneAndUpdate with upsert: true for findOrCreate-like behavior
                await ReadingProgress.findOneAndUpdate(
                    { user: req.user._id, chapter: chapter._id },
                    { completed: false, last_read_at: new Date() }, // Set completed to false on just viewing
                    { upsert: true, new: true, setDefaultsOnInsert: true } // upsert: true creates if not found, new: true returns modified document
                );
            }

            // Get next and previous chapters
            // Mongoose: find with $gt (greater than) and $lt (less than) for order
            const nextChapter = await Chapter.findOne({
                story: story._id,
                order: { $gt: chapter.order }
            }).sort({ order: 1 }); // Sort by order ascending

            const prevChapter = await Chapter.findOne({
                story: story._id,
                order: { $lt: chapter.order }
            }).sort({ order: -1 }); // Sort by order descending

            res.json({
                story,
                chapter,
                nextChapter,
                prevChapter
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching chapter', error: error.message });
        }
    }

    async create(req, res) {
        try {
            // Mongoose: findById
            const story = await Story.findById(req.params.storyId);
            if (!story) {
                return res.status(404).json({ message: 'Story not found.' });
            }

            // Authorization (e.g., only writer of the story can create chapters)
            // Use ._id for comparison
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to create chapters for this story.' });
            }

            // Mongoose: Aggregate to find max order
            const maxOrderResult = await Chapter.aggregate([
                { $match: { story: story._id } },
                { $group: { _id: null, maxOrder: { $max: "$order" } } }
            ]);
            const nextOrder = (maxOrderResult.length > 0 ? maxOrderResult[0].maxOrder : 0) + 1;

            res.json({ story, nextOrder });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error preparing chapter creation form', error: error.message });
        }
    }

    async store(req, res) {
        try {
            // Mongoose: findById
            const story = await Story.findById(req.params.storyId);
            if (!story) {
                return res.status(404).json({ message: 'Story not found.' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to create chapters for this story.' });
            }

            const { title, content_file, thumbnail, order } = req.body;

            // Mongoose: create
            const chapter = await Chapter.create({
                story: story._id, // Reference to story _id
                title,
                content_file,
                thumbnail,
                order
            });

            res.status(201).json({ message: 'Chapter published successfully!', chapter });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error publishing chapter', error: error.message });
        }
    }

    async edit(req, res) {
        try {
            const { storyId, chapterId } = req.params;
            // Mongoose: findById
            const story = await Story.findById(storyId);
            const chapter = await Chapter.findById(chapterId);

            if (!story || !chapter || chapter.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Chapter not found for this story.' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to edit this chapter.' });
            }

            res.json({ story, chapter });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error preparing chapter edit form', error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { storyId, chapterId } = req.params;
            // Mongoose: findById
            const story = await Story.findById(storyId);
            const chapter = await Chapter.findById(chapterId);

            if (!story || !chapter || chapter.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Chapter not found for this story.' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to update this chapter.' });
            }

            const { title, content_file, thumbnail, order } = req.body;

            // Mongoose: update fields and save
            chapter.title = title;
            chapter.content_file = content_file;
            chapter.thumbnail = thumbnail;
            chapter.order = order;
            await chapter.save();

            res.json({ message: 'Chapter updated successfully!', chapter });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error updating chapter', error: error.message });
        }
    }

    async destroy(req, res) {
        try {
            const { storyId, chapterId } = req.params;
            // Mongoose: findById
            const story = await Story.findById(storyId);
            const chapter = await Chapter.findById(chapterId);

            if (!story || !chapter || chapter.story.toString() !== story._id.toString()) {
                return res.status(404).json({ message: 'Chapter not found for this story.' });
            }

            // Authorization
            if (req.user._id.toString() !== story.writer.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this chapter.' });
            }

            await chapter.deleteOne(); // Mongoose: deleteOne on a document instance
            res.json({ message: 'Chapter deleted successfully!' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting chapter', error: error.message });
        }
    }
}

module.exports = new ChapterController();