const express = require('express');
const { randomUUID } = require('node:crypto');
const { requireAuth, requireRole } = require('./auth');

function createComplaintRouter(pool) {
    const router = express.Router();

    // FR2 / FR3: Submit a complaint and generate a unique ID.
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

    // FR4 / FR5: Retrieve complaints with optional filters.
    // Regular users can see only their own complaints.
    // Administrators can see all complaints.
    router.get('/complaints', requireAuth, async (req, res) => {
        const { status, category, startDate, endDate } = req.query;

        const validStatuses = [
            'submitted',
            'in_progress',
            'resolved',
            'rejected'
        ];

        // Validate status.
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status filter.'
            });
        }

        // Validate date formats.
        if (
            startDate &&
            !/^\d{4}-\d{2}-\d{2}$/.test(startDate)
        ) {
            return res.status(400).json({
                error: 'startDate must use YYYY-MM-DD format.'
            });
        }

        if (
            endDate &&
            !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
        ) {
            return res.status(400).json({
                error: 'endDate must use YYYY-MM-DD format.'
            });
        }

        // Validate the date range.
        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                error: 'startDate must be on or before endDate.'
            });
        }

        const conditions = [];
        const params = [];

        // Enforce user-specific access.
        if (req.user.role !== 'admin') {
            conditions.push('user_id = ?');
            params.push(req.user.id);
        }

        // FR5: Filter by status.
        if (status) {
            conditions.push('status = ?');
            params.push(status);
        }

        // FR5: Filter by category.
        if (category) {
            conditions.push('category = ?');
            params.push(category);
        }

        // FR5: Filter from the start date.
        if (startDate) {
            conditions.push('created_at >= ?');
            params.push(`${startDate} 00:00:00`);
        }

        // FR5: Include the entire end date.
        if (endDate) {
            conditions.push(
                'created_at < DATE_ADD(?, INTERVAL 1 DAY)'
            );
            params.push(endDate);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        try {
            const [complaints] = await pool.execute(
                `SELECT complaint_id, title, description, status,
                        created_at, updated_at, category
                 FROM complaints
                 ${whereClause}
                 ORDER BY created_at DESC`,
                params
            );

            return res.status(200).json({
                complaints
            });
        } catch (error) {
            console.error(
                'Failed to retrieve complaints:',
                error.message
            );

            return res.status(500).json({
                error: 'Unable to retrieve complaints. Please try again.'
            });
        }
    });

    // FR5: Only administrators can assign or change categories.
    router.patch(
        '/complaints/:id/category',
        requireAuth,
        requireRole('admin'),
        async (req, res) => {
            const { category } = req.body || {};

            if (
                typeof category !== 'string' ||
                !category.trim() ||
                category.trim().length > 100
            ) {
                return res.status(400).json({
                    error: 'A category of 1–100 characters is required.'
                });
            }

            try {
                const [result] = await pool.execute(
                    `UPDATE complaints
                     SET category = ?
                     WHERE complaint_id = ?`,
                    [
                        category.trim(),
                        req.params.id
                    ]
                );

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        error: 'Complaint not found.'
                    });
                }

                return res.status(200).json({
                    message: 'Complaint category updated successfully.',
                    complaintId: req.params.id,
                    category: category.trim()
                });
            } catch (error) {
                console.error(
                    'Failed to update complaint category:',
                    error.message
                );

                return res.status(500).json({
                    error: 'Unable to update complaint category.'
                });
            }
        }
    );

    return router;
}

module.exports = { createComplaintRouter };
