
process.env.JWT_SECRET = 'fr8-test-secret-key-at-least-32-bytes-long';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createToken } = require('./auth');
const { createComplaintRouter } = require('./complaintRoutes');

const COMPLAINT_ID = '123e4567-e89b-12d3-a456-426614174000';
const USER_ID = 'test-user-1';
const OTHER_USER_ID = 'test-user-2';

const userToken = () => createToken({
    id: USER_ID,
    role: 'user'
});

function createMockPool({
    complaintExists = true,
    complaintUserId = USER_ID,
    complaintStatus = 'resolved',
    failOnInsert = false,
    duplicateFeedback = false
} = {}) {
    const state = {
        transactionBegan: false,
        committed: false,
        rolledBack: false,
        released: false,
        executedQueries: []
    };

    const connection = {
        beginTransaction: async () => {
            state.transactionBegan = true;
        },

        commit: async () => {
            state.committed = true;
        },

        rollback: async () => {
            state.rolledBack = true;
        },

        release: () => {
            state.released = true;
        },

        execute: async (sql, params) => {
            state.executedQueries.push({ sql, params });

            if (/SELECT complaint_id, user_id, status/i.test(sql)) {
                if (!complaintExists) {
                    return [[]];
                }

                return [[{
                    complaint_id: COMPLAINT_ID,
                    user_id: complaintUserId,
                    status: complaintStatus
                }]];
            }

            if (/INSERT INTO complaint_feedback/i.test(sql)) {
                if (duplicateFeedback) {
                    const error = new Error(
                        'Duplicate feedback entry'
                    );
                    error.code = 'ER_DUP_ENTRY';
                    throw error;
                }

                if (failOnInsert) {
                    throw new Error(
                        'Simulated feedback database failure'
                    );
                }

                return [{ insertId: 1 }];
            }

            return [[]];
        }
    };

    return {
        execute: async () => [[]],

        getConnection: async () => connection,

        get state() {
            return state;
        }
    };
}

async function invokeFeedbackHandler(
    body,
    authToken = userToken(),
    pool = createMockPool(),
    complaintId = COMPLAINT_ID
) {
    const app = express();

    app.use(express.json());
    app.use(createComplaintRouter(pool));

    const server = http.createServer(app);

    await new Promise((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    const url = `http://127.0.0.1:${address.port}/complaints/${complaintId}/feedback`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken
                    ? { Authorization: `Bearer ${authToken}` }
                    : {})
            },
            body: body === undefined
                ? undefined
                : JSON.stringify(body)
        });

        const responseBody = await response.json();

        return {
            statusCode: response.status,
            responseBody
        };
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}

// ==================================================
// FR8: Successful Feedback Submission
// ==================================================

test('FR8 allows a user to submit feedback for their resolved complaint', async () => {
    const pool = createMockPool();

    const result = await invokeFeedbackHandler(
        {
            rating: 5,
            comments: 'Excellent service. The issue was resolved quickly.'
        },
        userToken(),
        pool
    );

    assert.equal(result.statusCode, 201);

    assert.equal(
        result.responseBody.message,
        'Feedback submitted successfully.'
    );

    assert.deepEqual(result.responseBody.feedback, {
        complaintId: COMPLAINT_ID,
        rating: 5,
        comments: 'Excellent service. The issue was resolved quickly.'
    });

    assert.equal(pool.state.transactionBegan, true);
    assert.equal(pool.state.committed, true);
    assert.equal(pool.state.rolledBack, false);
    assert.equal(pool.state.released, true);

    const insertQuery = pool.state.executedQueries.find(query =>
        /INSERT INTO complaint_feedback/i.test(query.sql)
    );

    assert.ok(insertQuery, 'Feedback INSERT query should execute');

    assert.deepEqual(insertQuery.params, [
        COMPLAINT_ID,
        USER_ID,
        5,
        'Excellent service. The issue was resolved quickly.'
    ]);
});

test('FR8 allows feedback without optional comments', async () => {
    const pool = createMockPool();

    const result = await invokeFeedbackHandler(
        { rating: 4 },
        userToken(),
        pool
    );

    assert.equal(result.statusCode, 201);
    assert.equal(result.responseBody.feedback.rating, 4);
    assert.equal(result.responseBody.feedback.comments, null);

    const insertQuery = pool.state.executedQueries.find(query =>
        /INSERT INTO complaint_feedback/i.test(query.sql)
    );

    assert.deepEqual(insertQuery.params, [
        COMPLAINT_ID,
        USER_ID,
        4,
        null
    ]);
});

test('FR8 trims whitespace from feedback comments', async () => {
    const pool = createMockPool();

    const result = await invokeFeedbackHandler(
        {
            rating: 3,
            comments: '   Service was satisfactory.   '
        },
        userToken(),
        pool
    );

    assert.equal(result.statusCode, 201);

    assert.equal(
        result.responseBody.feedback.comments,
        'Service was satisfactory.'
    );
});

// ==================================================
// FR8: Rating and Comment Validation
// ==================================================

test('FR8 rejects a rating below 1', async () => {
    const result = await invokeFeedbackHandler({
        rating: 0
    });

    assert.equal(result.statusCode, 400);
    assert.match(result.responseBody.error, /rating/i);
});

test('FR8 rejects a rating above 5', async () => {
    const result = await invokeFeedbackHandler({
        rating: 6
    });

    assert.equal(result.statusCode, 400);
    assert.match(result.responseBody.error, /rating/i);
});

test('FR8 rejects a non-integer rating', async () => {
    const result = await invokeFeedbackHandler({
        rating: 4.5
    });

    assert.equal(result.statusCode, 400);
    assert.match(result.responseBody.error, /rating/i);
});

test('FR8 rejects a missing rating', async () => {
    const result = await invokeFeedbackHandler({
        comments: 'Good service'
    });

    assert.equal(result.statusCode, 400);
});

test('FR8 accepts comments containing exactly 1000 characters', async () => {
    const comments = 'a'.repeat(1000);
    const pool = createMockPool();

    const result = await invokeFeedbackHandler(
        {
            rating: 5,
            comments
        },
        userToken(),
        pool
    );

    assert.equal(result.statusCode, 201);
    assert.equal(result.responseBody.feedback.comments.length, 1000);
});

test('FR8 rejects comments exceeding 1000 characters', async () => {
    const result = await invokeFeedbackHandler({
        rating: 5,
        comments: 'a'.repeat(1001)
    });

    assert.equal(result.statusCode, 400);
    assert.match(result.responseBody.error, /comments/i);
});

// ==================================================
// FR8: Complaint Ownership and Resolution Checks
// ==================================================

test('FR8 rejects feedback for a complaint that is not resolved', async () => {
    const pool = createMockPool({
        complaintStatus: 'in_progress'
    });

    const result = await invokeFeedbackHandler(
        { rating: 5 },
        userToken(),
        pool
    );

    assert.equal(result.statusCode, 409);

    assert.match(
        result.responseBody.error,
        /only be submitted after the complaint is resolved/i
    );

    assert.equal(pool.state.rolledBack, true);
    assert.equal(pool.state.committed, false);
    assert.equal(pool.state.released, true);
});

test('FR8 rejects feedback submitted by a user who does not own the complaint', async () => {
    const pool = createMockPool({
        complaintUserId: OTHER_USER_ID
    });

    const result = await invokeFeedbackHandler(
        { rating: 5 },
        userToken(),
        pool
    );

    assert.equal(result.statusCode, 403);

    assert.match(
        result.responseBody.error,
        /not authorized/i
    );

    assert.equal(pool.state.rolledBack, true);
    assert.equal(pool.state.committed, false);
    assert.equal(pool.state.released, true);
});

test('FR8 returns 404 when the complaint does not exist', async () => {
    const pool = createMockPool({
        complaintExists: false
    });

    const result = await invokeFeedbackHandler(
        { rating: 5 },
        userToken(),
        pool
    );

    assert.equal(result.statusCode, 404);
    assert.equal(
        result.responseBody.error,
        'Complaint not found.'
    );

    assert.equal(pool.state.rolledBack, true);
    assert.equal(pool.state.committed, false);
    assert.equal(pool.state.released, true);
});

// ==================================================
// FR8: Authentication and Request Validation
// ==================================================

test('FR8 rejects unauthenticated feedback submissions', async () => {
    const result = await invokeFeedbackHandler(
        { rating: 5 },
        null
    );

    assert.equal(result.statusCode, 401);
});

test('FR8 rejects an invalid complaint ID', async () => {
    const result = await invokeFeedbackHandler(
        { rating: 5 },
        userToken(),
        createMockPool(),
        'invalid-complaint-id'
    );

    assert.equal(result.statusCode, 400);
    assert.equal(
        result.responseBody.error,
        'Invalid complaint ID.'
    );
});

// ==================================================
// FR8: Duplicate Feedback and Database Failures
// ==================================================

test('FR8 prevents a user from submitting feedback more than once', async () => {
    const pool = createMockPool({
        duplicateFeedback: true
    });

    const result = await invokeFeedbackHandler(
        { rating: 5 },
        userToken(),
        pool
    );

    assert.equal(result.statusCode, 409);

    assert.match(
        result.responseBody.error,
        /already been submitted/i
    );

    assert.equal(pool.state.transactionBegan, true);
    assert.equal(pool.state.committed, false);
    assert.equal(pool.state.rolledBack, true);
    assert.equal(pool.state.released, true);
});

test('FR8 rolls back the transaction when feedback insertion fails', async () => {
    const pool = createMockPool({
        failOnInsert: true
    });

    const result = await invokeFeedbackHandler(
        {
            rating: 4,
            comments: 'Good service'
        },
        userToken(),
        pool
    );

    assert.equal(result.statusCode, 500);

    assert.equal(
        result.responseBody.error,
        'Unable to submit feedback. Please try again.'
    );

    assert.equal(pool.state.transactionBegan, true);
    assert.equal(pool.state.committed, false);
    assert.equal(pool.state.rolledBack, true);
    assert.equal(pool.state.released, true);
});
