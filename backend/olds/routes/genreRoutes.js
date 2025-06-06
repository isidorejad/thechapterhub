// routes/genreRoutes.js
const express = require('express');
const router = express.Router();
const { Genre } = require('../models'); // Ensure this is the Mongoose Model object

router.get('/', async (req, res) => {
    try {
        // Mongoose: find().select().lean() for fetching all documents
        const genres = await Genre.find({})
                                  .select('_id name slug description')
                                  .sort({ name: 1 }) // Sort alphabetically by name
                                  .lean(); // Return plain JS objects

        // Transform _id to id for frontend compatibility
        const transformedGenres = genres.map(genre => ({
            id: genre._id.toString(),
            name: genre.name,
            slug: genre.slug,
            description: genre.description
        }));

        res.json(transformedGenres); // Send the transformed array directly
    } catch (error) {
        console.error('Error fetching genres.', error);
        res.status(500).json({ message: 'Error fetching genres.', error: error.message });
    }
});

router.get('/:slug', async (req, res) => {
    try {
        // Mongoose: findOne() with direct field name
        const genre = await Genre.findOne({ slug: req.params.slug }).lean();

        if (!genre) {
            return res.status(404).json({ message: 'Genre not found.' });
        }

        // Transform _id to id for frontend compatibility
        const transformedGenre = {
            id: genre._id.toString(),
            name: genre.name,
            slug: genre.slug,
            description: genre.description
        };

        res.json({ genre: transformedGenre });
    } catch (error) {
        console.error('Error fetching genre.', error);
        res.status(500).json({ message: 'Error fetching genre.', error: error.message });
    }
});

module.exports = router;