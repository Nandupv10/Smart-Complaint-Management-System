const express = require('express');
const { randomUUID } = require('node:crypto');
const { requireAuth } = require('./auth');

const router = express.Router();

router.post('/complaints', requireAuth, (req, res) => {
    const { title, description } = req.body || {};

    if (
        typeof title !== 'string' ||
        typeof description !== 'string' ||
        !title.trim() ||
        !description.trim()
    ) {
        return res.status(400).json({
            error: 'Title and description are required.'
        });
    }

    if (title.length > 100) {
        return res.status(422).json({
            error: 'Title must not exceed 100 characters.'
        });
    }

    const complaintId = randomUUID();

    return res.status(201).json({
        message: 'Complaint submitted successfully.',
        complaintId,
        submittedBy: req.user.id
    });
});

module.exports = router;
