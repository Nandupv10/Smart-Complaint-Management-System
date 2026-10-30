const express = require('express');
const { randomUUID } = require('node:crypto');
const { requireAuth } = require('./auth');

function createComplaintRouter(pool) {
    const router = express.Router();

    // FR2: Submit a complaint
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

    // FR4: View and track complaints
    router.get('/complaints', requireAuth, async (req, res) => {
        try {
            const userId = req.user.id;

            const [complaints] = await pool.execute(
                `SELECT complaint_id, title, description, status,
                        created_at, updated_at
                 FROM complaints
                 WHERE user_id = ?
                 ORDER BY created_at DESC`,
                [userId]
            );

            return res.status(200).json({
                complaints
            });
        } catch (error) {
            console.error('Failed to retrieve complaints:', error.message);

            return res.status(500).json({
                error: 'Unable to retrieve complaints. Please try again.'
            });
        }
    });

    return router;
}

module.exports = { createComplaintRouter };