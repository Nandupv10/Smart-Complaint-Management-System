
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
        'assigned',
        'in_progress',
        'resolved',
        'closed'
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

    // ==================================================
    // NFR05: Retrieve details and history of a complaint.
    // Visible only to the complaint owner and administrators.
    // TC10: If a user requests a complaint owned by another user,
    // return 404 with no fields of the other user's complaint.
    // ==================================================
    router.get('/complaints/:id', requireAuth, async (req, res) => {
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
            const [rows] = await pool.execute(
                `SELECT c.complaint_id, c.user_id, c.title, c.description,
                        c.category, c.status, c.created_at, c.updated_at,
                        u.email
                 FROM complaints c
                 LEFT JOIN users u ON c.user_id = u.id
                 WHERE c.complaint_id = ?`,
                [complaintId]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    error: 'Complaint not found.'
                });
            }

            const complaint = rows[0];

            // NFR05 / TC10: A complaint and its owner's personal data shall be visible
            // only to that owner and to administrators.
            // Return 404 when a user attempts to access another user's complaint.
            if (req.user.role !== 'admin' && String(complaint.user_id) !== String(req.user.id)) {
                return res.status(404).json({
                    error: 'Complaint not found.'
                });
            }

            // Retrieve complaint status history (TC05, Table VI).
            const [historyRows] = await pool.execute(
                `SELECT id, complaint_id, old_status, new_status,
                        admin_id, remark, changed_at
                 FROM complaint_status_history
                 WHERE complaint_id = ?
                 ORDER BY changed_at ASC`,
                [complaintId]
            );

            // Retrieve complaint feedback if available.
            const [feedbackRows] = await pool.execute(
                `SELECT feedback_id, complaint_id, user_id,
                        rating, comments, created_at
                 FROM complaint_feedback
                 WHERE complaint_id = ?`,
                [complaintId]
            );

            return res.status(200).json({
                complaint: {
                    complaint_id: complaint.complaint_id,
                    complaintId: complaint.complaint_id,
                    title: complaint.title,
                    description: complaint.description,
                    category: complaint.category,
                    status: complaint.status,
                    created_at: complaint.created_at,
                    updated_at: complaint.updated_at,
                    user_id: String(complaint.user_id),
                    email: complaint.email,
                    user: {
                        id: String(complaint.user_id),
                        email: complaint.email
                    },
                    history: historyRows,
                    feedback: feedbackRows[0] || null
                }
            });
        } catch (error) {
            console.error(
                'Failed to retrieve complaint details:',
                error.message
            );

            return res.status(500).json({
                error: 'Unable to retrieve complaint details. Please try again.'
            });
        }
    });

    // NFR05: Retrieve complaint status history only for owner or administrator.
    router.get('/complaints/:id/history', requireAuth, async (req, res) => {
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
            const [complaints] = await pool.execute(
                `SELECT complaint_id, user_id
                 FROM complaints
                 WHERE complaint_id = ?`,
                [complaintId]
            );

            if (complaints.length === 0) {
                return res.status(404).json({
                    error: 'Complaint not found.'
                });
            }

            const complaint = complaints[0];

            if (req.user.role !== 'admin' && String(complaint.user_id) !== String(req.user.id)) {
                return res.status(404).json({
                    error: 'Complaint not found.'
                });
            }

            const [history] = await pool.execute(
                `SELECT id, complaint_id, old_status, new_status,
                        admin_id, remark, changed_at
                 FROM complaint_status_history
                 WHERE complaint_id = ?
                 ORDER BY changed_at ASC`,
                [complaintId]
            );

            return res.status(200).json({
                complaintId,
                history
            });
        } catch (error) {
            console.error(
                'Failed to retrieve complaint history:',
                error.message
            );

            return res.status(500).json({
                error: 'Unable to retrieve complaint history. Please try again.'
            });
        }
    });

    // NFR05: Retrieve complaint feedback only for owner or administrator.
    router.get('/complaints/:id/feedback', requireAuth, async (req, res) => {
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
            const [complaints] = await pool.execute(
                `SELECT complaint_id, user_id
                 FROM complaints
                 WHERE complaint_id = ?`,
                [complaintId]
            );

            if (complaints.length === 0) {
                return res.status(404).json({
                    error: 'Complaint not found.'
                });
            }

            const complaint = complaints[0];

            if (req.user.role !== 'admin' && String(complaint.user_id) !== String(req.user.id)) {
                return res.status(404).json({
                    error: 'Complaint not found.'
                });
            }

            const [feedbackRows] = await pool.execute(
                `SELECT feedback_id, complaint_id, user_id,
                        rating, comments, created_at
                 FROM complaint_feedback
                 WHERE complaint_id = ?`,
                [complaintId]
            );

            return res.status(200).json({
                complaintId,
                feedback: feedbackRows[0] || null
            });
        } catch (error) {
            console.error(
                'Failed to retrieve complaint feedback:',
                error.message
            );

            return res.status(500).json({
                error: 'Unable to retrieve complaint feedback. Please try again.'
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

    // ==================================================
    // FR7: Admin updates or resolves a complaint.
    // ==================================================

    router.patch(
        '/complaints/:id/status',
        requireAuth,
        requireRole('admin'),
        async (req, res) => {
            const complaintId = req.params.id;
            const { status, remark } = req.body || {};
            const adminId = req.user.id;

            // Allowed transitions along documented lifecycle:
            // Submitted -> Assigned -> In Progress -> Resolved -> Closed
            const allowedTransitions = {
                submitted: ['assigned'],
                assigned: ['in_progress'],
                in_progress: ['resolved'],
                resolved: ['closed'],
                closed: []
            };

            // Validate status.
            if (
                typeof status !== 'string' ||
                !validStatuses.includes(status)
            ) {
                return res.status(400).json({
                    error: 'Invalid complaint status.'
                });
            }

            // Validate remark.
            // A remark is required for every status change
            // and must be fewer than 500 characters.
            if (
                typeof remark !== 'string' ||
                !remark.trim() ||
                remark.trim().length >= 500
            ) {
                return res.status(400).json({
                    error: 'Remark is required and must be less than 500 characters.'
                });
            }

            let connection;
            let transactionStarted = false;

            try {
                // Get a dedicated connection for the transaction.
                connection = await pool.getConnection();

                await connection.beginTransaction();
                transactionStarted = true;

                // Lock the complaint row to prevent simultaneous updates.
                const [complaints] = await connection.execute(
                    `SELECT complaint_id, status
                     FROM complaints
                     WHERE complaint_id = ?
                     FOR UPDATE`,
                    [complaintId]
                );

                if (complaints.length === 0) {
                    await connection.rollback();
                    transactionStarted = false;

                    return res.status(404).json({
                        error: 'Complaint not found.'
                    });
                }

                const oldStatus = complaints[0].status;

                // Check whether the requested transition is allowed.
                if (!allowedTransitions[oldStatus]?.includes(status)) {
                    await connection.rollback();
                    transactionStarted = false;

                    return res.status(409).json({
                        error: `Invalid status transition from ${oldStatus} to ${status}.`
                    });
                }

                // Update the complaint status.
                const [updateResult] = await connection.execute(
                    `UPDATE complaints
                     SET status = ?
                     WHERE complaint_id = ?`,
                    [status, complaintId]
                );

                if (updateResult.affectedRows === 0) {
                    await connection.rollback();
                    transactionStarted = false;

                    return res.status(404).json({
                        error: 'Complaint not found.'
                    });
                }

                // Store the status change in the audit history.
                await connection.execute(
                    `INSERT INTO complaint_status_history
                        (
                            complaint_id,
                            old_status,
                            new_status,
                            admin_id,
                            remark
                        )
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        complaintId,
                        oldStatus,
                        status,
                        adminId,
                        remark.trim()
                    ]
                );

                // Commit both operations together.
                await connection.commit();
                transactionStarted = false;

                return res.status(200).json({
                    message: 'Complaint status updated successfully.',
                    complaint: {
                        complaintId,
                        oldStatus,
                        newStatus: status,
                        remark: remark.trim(),
                        updatedBy: adminId
                    }
                });
            } catch (error) {
                if (connection && transactionStarted) {
                    try {
                        await connection.rollback();
                    } catch (rollbackError) {
                        console.error(
                            'FR7 transaction rollback failed:',
                            rollbackError.message
                        );
                    }
                }

                console.error(
                    'Failed to update complaint status:',
                    error.message
                );

                return res.status(500).json({
                    error: 'Unable to update complaint status.'
                });
            } finally {
                if (connection) {
                    connection.release();
                }
            }
        }
    );

    // ==================================================
    // FR8: User feedback after complaint resolution.
    // ==================================================

    router.post(
        '/complaints/:id/feedback',
        requireAuth,
        async (req, res) => {
            const complaintId = req.params.id;
            const { rating, comments } = req.body || {};

            // Validate complaint ID.
            if (
                typeof complaintId !== 'string' ||
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(complaintId)
            ) {
                return res.status(400).json({
                    error: 'Invalid complaint ID.'
                });
            }

            // Rating must be an integer between 1 and 5.
            if (
                !Number.isInteger(rating) ||
                rating < 1 ||
                rating > 5
            ) {
                return res.status(400).json({
                    error: 'Rating must be an integer between 1 and 5.'
                });
            }

            // Comments are optional but must be a string
            // containing no more than 1000 characters.
            if (
                comments !== undefined &&
                comments !== null &&
                (
                    typeof comments !== 'string' ||
                    comments.length > 1000
                )
            ) {
                return res.status(400).json({
                    error: 'Comments must not exceed 1000 characters.'
                });
            }

            const normalizedComments =
                typeof comments === 'string' && comments.trim()
                    ? comments.trim()
                    : null;

            let connection;
            let transactionStarted = false;

            try {
                connection = await pool.getConnection();

                await connection.beginTransaction();
                transactionStarted = true;

                // Lock the complaint row while validating and saving feedback.
                const [complaints] = await connection.execute(
                    `SELECT complaint_id, user_id, status
                     FROM complaints
                     WHERE complaint_id = ?
                     FOR UPDATE`,
                    [complaintId]
                );

                if (complaints.length === 0) {
                    await connection.rollback();
                    transactionStarted = false;

                    return res.status(404).json({
                        error: 'Complaint not found.'
                    });
                }

                const complaint = complaints[0];

                // A user can submit feedback only for their own complaint.
                if (String(complaint.user_id) !== String(req.user.id)) {
                    await connection.rollback();
                    transactionStarted = false;

                    return res.status(403).json({
                        error: 'You are not authorized to provide feedback for this complaint.'
                    });
                }

                // Feedback is allowed only after resolution.
                if (complaint.status !== 'resolved') {
                    await connection.rollback();
                    transactionStarted = false;

                    return res.status(409).json({
                        error: 'Feedback can only be submitted after the complaint is resolved.'
                    });
                }

                // Save feedback. The database unique constraint
                // ensures that each complaint receives feedback only once.
                await connection.execute(
                    `INSERT INTO complaint_feedback
                        (complaint_id, user_id, rating, comments)
                     VALUES (?, ?, ?, ?)`,
                    [
                        complaintId,
                        req.user.id,
                        rating,
                        normalizedComments
                    ]
                );

                await connection.commit();
                transactionStarted = false;

                return res.status(201).json({
                    message: 'Feedback submitted successfully.',
                    feedback: {
                        complaintId,
                        rating,
                        comments: normalizedComments
                    }
                });
            } catch (error) {
                if (connection && transactionStarted) {
                    try {
                        await connection.rollback();
                    } catch (rollbackError) {
                        console.error(
                            'FR8 transaction rollback failed:',
                            rollbackError.message
                        );
                    }
                }

                // A duplicate entry means feedback already exists
                // for this complaint.
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        error: 'Feedback has already been submitted for this complaint.'
                    });
                }

                console.error(
                    'Failed to submit complaint feedback:',
                    error.message
                );

                return res.status(500).json({
                    error: 'Unable to submit feedback. Please try again.'
                });
            } finally {
                if (connection) {
                    connection.release();
                }
            }
        }
    );

    return router;
}

module.exports = { createComplaintRouter };
