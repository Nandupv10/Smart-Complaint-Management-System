
const express = require('express');
const { randomUUID } = require('node:crypto');
const { requireAuth, requireRole } = require('./auth');

function createComplaintRouter(pool) {
    const router = express.Router();

    const allowedCategories = [
        'Infrastructure',
        'Hostel',
        'Maintenance',
        'Cleanliness',
        'IT Support',
        'Academics',
        'Other'
    ];

    const validStatuses = [
        'submitted',
        'in_progress',
        'resolved',
        'rejected'
    ];

    // FR2 / FR3: Submit a complaint.
    router.post('/complaints', requireAuth, async (req, res) => {
        const { title, description } = req.body || {};

        // Keep backward compatibility with existing clients.
        const category = req.body?.category === undefined
            ? 'Uncategorized'
            : req.body.category;

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

        if (title.trim().length > 100) {
            return res.status(422).json({
                error: 'Title must not exceed 100 characters.'
            });
        }

        if (
            typeof category !== 'string' ||
            (
                category !== 'Uncategorized' &&
                !allowedCategories.includes(category)
            )
        ) {
            return res.status(400).json({
                error: 'Please select a valid complaint category.'
            });
        }

        const complaintId = randomUUID();

        try {
            await pool.execute(
                `INSERT INTO complaints
                    (complaint_id, user_id, title, description, category)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    complaintId,
                    req.user.id,
                    title.trim(),
                    description.trim(),
                    category
                ]
            );

            return res.status(201).json({
                message: 'Complaint submitted successfully.',
                complaintId,
                submittedBy: req.user.id
            });
        } catch (error) {
            console.error(
                'Failed to save complaint:',
                error.message
            );

            return res.status(500).json({
                error: 'Unable to submit complaint. Please try again.'
            });
        }
    });

    // Securely delete a complaint.
    // Users can delete only their own complaints.
    // Administrators can delete any complaint.
    router.delete('/complaints/:id', requireAuth, async (req, res) => {
        const complaintId = req.params.id;

        if (
            typeof complaintId !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(complaintId)
        ) {
            return res.status(400).json({
                error: 'Invalid complaint ID.'
            });
        }

        try {
            let result;

            if (req.user.role === 'admin') {
                [result] = await pool.execute(
                    `DELETE FROM complaints
                     WHERE complaint_id = ?`,
                    [complaintId]
                );
            } else {
                [result] = await pool.execute(
                    `DELETE FROM complaints
                     WHERE complaint_id = ?
                     AND user_id = ?`,
                    [complaintId, req.user.id]
                );
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'Complaint not found.'
                });
            }

            return res.status(200).json({
                message: 'Complaint deleted successfully.',
                complaintId
            });
        } catch (error) {
            console.error(
                'Failed to delete complaint:',
                error.message
            );

            return res.status(500).json({
                error: 'Unable to delete complaint. Please try again.'
            });
        }
    });

    // FR4 / FR5: Retrieve complaints with optional filters.
    // Regular users see only their own complaints.
    // Administrators see all complaints.
    router.get('/complaints', requireAuth, async (req, res) => {
        const { status, category, startDate, endDate } = req.query;

        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status filter.'
            });
        }

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

        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                error: 'startDate must be on or before endDate.'
            });
        }

        const conditions = [];
        const params = [];

        if (req.user.role !== 'admin') {
            conditions.push('user_id = ?');
            params.push(req.user.id);
        }

        if (status) {
            conditions.push('status = ?');
            params.push(status);
        }

        if (category) {
            conditions.push('category = ?');
            params.push(category);
        }

        if (startDate) {
            conditions.push('created_at >= ?');
            params.push(`${startDate} 00:00:00`);
        }

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

    // FR5: Only administrators can change complaint categories.
    router.patch(
        '/complaints/:id/category',
        requireAuth,
        requireRole('admin'),
        async (req, res) => {
            const { category } = req.body || {};

            // Accept a non-empty category up to the database limit.
            // This also allows the existing FR5 tests to use
            // category names beyond the complaint form's options.
            if (
                typeof category !== 'string' ||
                !category.trim() ||
                category.trim().length > 100
            ) {
                return res.status(400).json({
                    error: 'A category of 1-100 characters is required.'
                });
            }

            const normalizedCategory = category.trim();

            try {
                const [result] = await pool.execute(
                    `UPDATE complaints
                     SET category = ?
                     WHERE complaint_id = ?`,
                    [
                        normalizedCategory,
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
                    category: normalizedCategory
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
