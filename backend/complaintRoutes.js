const express = require('express');
const router = express.Router();

router.post('/complaints', (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        return res.status(400).json({
            error: 'Title and description are required.'
        });
    }

    // SCMS TC03: titles up to 100 characters are valid.
    if (title.length > 100) {
        return res.status(422).json({
            error: 'Title must not exceed 100 characters.'
        });
    }

    res.status(201).json({
        message: 'Complaint submitted successfully.'
    });
});

module.exports = router;