
const express = require('express');
const { randomUUID } = require('node:crypto');
const { requireAuth } = require('./auth');

function createComplaintRouter(pool) {
    const router = express.Router();

    router.post('/complaints', requireAuth, async (req, res) => {
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

        try {
            await pool.execute(
                `INSERT INTO complaints
                    (complaint_id, user_id, title, description)
                 VALUES (?, ?, ?, ?)`,
                [
                    complaintId,
                    req.user.id,
                    title.trim(),
                    description.trim()
                ]
            );

            return res.status(201).json({
                message: 'Complaint submitted successfully.',
                complaintId,
                submittedBy: req.user.id
            });
        } catch (error) {
            console.error('Failed to save complaint:', error.message);

            return res.status(500).json({
                error: 'Unable to submit complaint. Please try again.'
            });
        }
    });

    return router;
}

module.exports = { createComplaintRouter };
