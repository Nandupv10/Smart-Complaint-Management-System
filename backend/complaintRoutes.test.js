
const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const http = require('node:http');
const { createToken } = require('./auth');
const { createComplaintRouter } = require('./complaintRoutes');

process.env.JWT_SECRET =
    'test-secret-key-at-least-32-characters-long';

function invokeHandler(
    body,
    authToken,
    pool = { execute: async () => [[]] },
    method = 'POST',
    path = '/complaints'
) {
    return new Promise(resolve => {
        const app = express();
        app.use(express.json());
        app.use(createComplaintRouter(pool));

        const server = app.listen(0, () => {
            const address = server.address();

            const options = {
                hostname: '127.0.0.1',
                port: address.port,
                path,
                method,
                headers: {}
            };

            if (body !== null && body !== undefined) {
                options.headers['Content-Type'] = 'application/json';
            }

            if (authToken) {
                options.headers.Authorization = `Bearer ${authToken}`;
            }

            const req = http.request(options, res => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    server.close(() => {
                        resolve({
                            statusCode: res.statusCode,
                            responseBody: data ? JSON.parse(data) : {}
                        });
                    });
                });
            });

            req.on('error', error => {
                server.close(() => resolve({ error }));
            });

            if (body !== null && body !== undefined) {
                req.write(JSON.stringify(body));
            }

            req.end();
        });
    });
}

const token = () => createToken({
    id: 'test-user-1',
    role: 'user'
});

const adminToken = () => createToken({
    id: 'test-admin-1',
    role: 'admin'
});

// FR2 and FR3 tests

test('SCMS TC03 accepts 100-character titles and rejects 101-character titles', async () => {
    const valid = await invokeHandler({
        title: 'a'.repeat(100),
        description: 'Test complaint'
    }, token());

    const invalid = await invokeHandler({
        title: 'a'.repeat(101),
        description: 'Test complaint'
    }, token());

    assert.equal(valid.statusCode, 201);
    assert.equal(invalid.statusCode, 422);
});

test('FR3 generates a unique complaint ID for each successful submission', async () => {
    const first = await invokeHandler({
        title: 'Broken light',
        description: 'Light is not working'
    }, token());

    const second = await invokeHandler({
        title: 'Water leakage',
        description: 'Leak in the kitchen'
    }, token());

    assert.equal(first.statusCode, 201);
    assert.equal(second.statusCode, 201);

    assert.match(
        first.responseBody.complaintId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    assert.match(
        second.responseBody.complaintId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    assert.notEqual(
        first.responseBody.complaintId,
        second.responseBody.complaintId
    );
});

test('FR2 saves the complaint using the authenticated user ID', async () => {
    let savedValues;

    const pool = {
        execute: async (sql, values) => {
            savedValues = values;
            assert.match(sql, /INSERT INTO complaints/i);
            return [{ affectedRows: 1 }];
        }
    };

    const result = await invokeHandler({
        title: 'Broken light',
        description: 'Light is not working'
    }, token(), pool);

    assert.equal(result.statusCode, 201);
    assert.equal(savedValues[1], 'test-user-1');
    assert.equal(savedValues[2], 'Broken light');
    assert.equal(savedValues[3], 'Light is not working');
    assert.equal(savedValues[0], result.responseBody.complaintId);
});

test('complaint submission without a token returns 401', async () => {
    const result = await invokeHandler({
        title: 'Broken light',
        description: 'Light is not working'
    });

    assert.equal(result.statusCode, 401);
});

test('complaint submission returns 500 when database insertion fails', async () => {
    const pool = {
        execute: async () => {
            throw new Error('Simulated database failure');
        }
    };

    const result = await invokeHandler({
        title: 'Broken light',
        description: 'Light is not working'
    }, token(), pool);

    assert.equal(result.statusCode, 500);
    assert.equal(
        result.responseBody.error,
        'Unable to submit complaint. Please try again.'
    );
});

// FR4 tests

test('FR4 retrieves complaints belonging to the authenticated user', async () => {
    let executedSql;
    let executedValues;

    const mockComplaints = [
        {
            complaint_id: 'complaint-123',
            title: 'Broken light',
            description: 'The light is not working',
            status: 'submitted',
            created_at: '2026-10-30 10:00:00',
            updated_at: '2026-10-30 10:00:00'
        }
    ];

    const pool = {
        execute: async (sql, values) => {
            executedSql = sql;
            executedValues = values;
            return [mockComplaints];
        }
    };

    const result = await invokeHandler(
        null,
        token(),
        pool,
        'GET'
    );

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.responseBody.complaints, mockComplaints);
    assert.deepEqual(executedValues, ['test-user-1']);
    assert.match(executedSql, /WHERE user_id\s*=\s*\?/i);
    assert.match(executedSql, /ORDER BY created_at DESC/i);
});

test('FR4 returns an empty array when the user has no complaints', async () => {
    const pool = {
        execute: async () => [[]]
    };

    const result = await invokeHandler(
        null,
        token(),
        pool,
        'GET'
    );

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.responseBody, {
        complaints: []
    });
});

test('FR4 rejects requests without an authentication token', async () => {
    const result = await invokeHandler(
        null,
        null,
        undefined,
        'GET'
    );

    assert.equal(result.statusCode, 401);
});

test('FR4 returns 500 when retrieving complaints fails', async () => {
    const pool = {
        execute: async () => {
            throw new Error('Simulated database failure');
        }
    };

    const result = await invokeHandler(
        null,
        token(),
        pool,
        'GET'
    );

    assert.equal(result.statusCode, 500);
    assert.equal(
        result.responseBody.error,
        'Unable to retrieve complaints. Please try again.'
    );
});

// FR5 tests

test('FR5 filters complaints by status and category', async () => {
    let executedSql;
    let executedValues;

    const pool = {
        execute: async (sql, values) => {
            executedSql = sql;
            executedValues = values;

            return [[
                {
                    complaint_id: 'complaint-123',
                    title: 'Broken light',
                    description: 'Light is not working',
                    status: 'resolved',
                    category: 'Electrical'
                }
            ]];
        }
    };

    const result = await invokeHandler(
        null,
        token(),
        pool,
        'GET',
        '/complaints?status=resolved&category=Electrical'
    );

    assert.equal(result.statusCode, 200);
    assert.match(executedSql, /status\s*=\s*\?/i);
    assert.match(executedSql, /category\s*=\s*\?/i);

    assert.deepEqual(executedValues, [
        'test-user-1',
        'resolved',
        'Electrical'
    ]);
});

test('FR5 filters complaints by date range', async () => {
    let executedSql;
    let executedValues;

    const pool = {
        execute: async (sql, values) => {
            executedSql = sql;
            executedValues = values;
            return [[]];
        }
    };

    const result = await invokeHandler(
        null,
        token(),
        pool,
        'GET',
        '/complaints?startDate=2026-01-01&endDate=2026-01-31'
    );

    assert.equal(result.statusCode, 200);
    assert.match(executedSql, /created_at\s*>=\s*\?/i);
    assert.match(executedSql, /DATE_ADD/i);

    assert.deepEqual(executedValues, [
        'test-user-1',
        '2026-01-01 00:00:00',
        '2026-01-31'
    ]);
});

test('FR5 rejects an invalid status filter', async () => {
    const result = await invokeHandler(
        null,
        token(),
        undefined,
        'GET',
        '/complaints?status=unknown'
    );

    assert.equal(result.statusCode, 400);
});

test('FR5 allows administrators to update a complaint category', async () => {
    let executedSql;
    let executedValues;

    const pool = {
        execute: async (sql, values) => {
            executedSql = sql;
            executedValues = values;
            return [{ affectedRows: 1 }];
        }
    };

    const result = await invokeHandler(
        { category: 'Electrical' },
        adminToken(),
        pool,
        'PATCH',
        '/complaints/complaint-123/category'
    );

    assert.equal(result.statusCode, 200);
    assert.match(executedSql, /UPDATE complaints/i);

    assert.deepEqual(executedValues, [
        'Electrical',
        'complaint-123'
    ]);

    assert.equal(result.responseBody.category, 'Electrical');
});

test('FR5 prevents regular users from updating complaint categories', async () => {
    let databaseCalled = false;

    const pool = {
        execute: async () => {
            databaseCalled = true;
            return [{ affectedRows: 1 }];
        }
    };

    const result = await invokeHandler(
        { category: 'Electrical' },
        token(),
        pool,
        'PATCH',
        '/complaints/complaint-123/category'
    );

    assert.equal(result.statusCode, 403);
    assert.equal(databaseCalled, false);
});

test('FR5 returns 404 when the complaint does not exist', async () => {
    const pool = {
        execute: async () => [{ affectedRows: 0 }]
    };

    const result = await invokeHandler(
        { category: 'Electrical' },
        adminToken(),
        pool,
        'PATCH',
        '/complaints/missing-complaint/category'
    );

    assert.equal(result.statusCode, 404);
});


// ==================================================
// FR7 tests: Update and resolve complaints
// Lifecycle: Submitted -> Assigned -> In Progress -> Resolved -> Closed
// ==================================================

function createMockPoolForStatus({
    initialStatus = 'submitted',
    complaintExists = true,
    failOnInsertHistory = false,
    updateAffectedRows = 1
} = {}) {
    let transactionBegan = false;
    let committed = false;
    let rolledBack = false;
    let released = false;
    const executedQueries = [];

    const mockConnection = {
        beginTransaction: async () => {
            transactionBegan = true;
        },
        commit: async () => {
            committed = true;
        },
        rollback: async () => {
            rolledBack = true;
        },
        release: () => {
            released = true;
        },
        execute: async (sql, params) => {
            executedQueries.push({ sql, params });

            if (/SELECT complaint_id, status/i.test(sql)) {
                if (!complaintExists) {
                    return [[]];
                }
                return [[{ complaint_id: params[0], status: initialStatus }]];
            }

            if (/UPDATE complaints/i.test(sql)) {
                return [{ affectedRows: updateAffectedRows }];
            }

            if (/INSERT INTO complaint_status_history/i.test(sql)) {
                if (failOnInsertHistory) {
                    throw new Error('Database error during history recording');
                }
                return [{ insertId: 1 }];
            }

            return [[]];
        }
    };

    const mockPool = {
        execute: async () => [[]],
        getConnection: async () => mockConnection,
        get state() {
            return {
                transactionBegan,
                committed,
                rolledBack,
                released,
                executedQueries
            };
        }
    };

    return mockPool;
}

// --------------------------------------------------
// Valid Status Transitions
// --------------------------------------------------

test('FR7 allows valid transition: submitted -> assigned with remark', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'submitted' });

    const result = await invokeHandler(
        { status: 'assigned', remark: 'Assigned to maintenance department' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 200);
    assert.equal(result.responseBody.complaint.oldStatus, 'submitted');
    assert.equal(result.responseBody.complaint.newStatus, 'assigned');
    assert.equal(result.responseBody.complaint.complaintId, 'complaint-101');
    assert.equal(result.responseBody.complaint.remark, 'Assigned to maintenance department');
    assert.equal(result.responseBody.complaint.updatedBy, 'test-admin-1');
    assert.equal(mockPool.state.transactionBegan, true);
    assert.equal(mockPool.state.committed, true);
    assert.equal(mockPool.state.rolledBack, false);
    assert.equal(mockPool.state.released, true);
});

test('FR7 allows valid transition: assigned -> in_progress with remark', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'assigned' });

    const result = await invokeHandler(
        { status: 'in_progress', remark: 'Technician has started work on-site' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 200);
    assert.equal(result.responseBody.complaint.oldStatus, 'assigned');
    assert.equal(result.responseBody.complaint.newStatus, 'in_progress');
    assert.equal(mockPool.state.committed, true);
    assert.equal(mockPool.state.released, true);
});

test('FR7 allows valid transition: in_progress -> resolved with resolution note remark', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'in_progress' });

    const result = await invokeHandler(
        { status: 'resolved', remark: 'Replaced faulty circuit breaker. System tested and functional.' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 200);
    assert.equal(result.responseBody.complaint.oldStatus, 'in_progress');
    assert.equal(result.responseBody.complaint.newStatus, 'resolved');
    assert.equal(result.responseBody.complaint.remark, 'Replaced faulty circuit breaker. System tested and functional.');
    assert.equal(mockPool.state.committed, true);
    assert.equal(mockPool.state.released, true);

    const historyInsert = mockPool.state.executedQueries.find(q =>
        /INSERT INTO complaint_status_history/i.test(q.sql)
    );
    assert.ok(historyInsert, 'history insert recorded');
    assert.deepEqual(historyInsert.params, [
        'complaint-101',
        'in_progress',
        'resolved',
        'test-admin-1',
        'Replaced faulty circuit breaker. System tested and functional.'
    ]);
});

test('FR7 allows valid transition: resolved -> closed with remark', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'resolved' });

    const result = await invokeHandler(
        { status: 'closed', remark: 'Feedback received from user. Closing complaint.' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 200);
    assert.equal(result.responseBody.complaint.oldStatus, 'resolved');
    assert.equal(result.responseBody.complaint.newStatus, 'closed');
    assert.equal(mockPool.state.committed, true);
    assert.equal(mockPool.state.released, true);
});

// --------------------------------------------------
// Invalid Status Transitions (Must return 409)
// --------------------------------------------------

test('FR7 rejects invalid transition: submitted -> in_progress (bypassing assigned)', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'submitted' });

    const result = await invokeHandler(
        { status: 'in_progress', remark: 'Attempting to bypass assigned state' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from submitted to in_progress/i);
    assert.equal(mockPool.state.committed, false);
    assert.equal(mockPool.state.rolledBack, true);
    assert.equal(mockPool.state.released, true);
});

test('FR7 rejects invalid transition: submitted -> resolved (direct resolve attempt)', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'submitted' });

    const result = await invokeHandler(
        { status: 'resolved', remark: 'Direct resolve attempt' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from submitted to resolved/i);
    assert.equal(mockPool.state.committed, false);
    assert.equal(mockPool.state.rolledBack, true);
});

test('FR7 rejects invalid transition: submitted -> closed', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'submitted' });

    const result = await invokeHandler(
        { status: 'closed', remark: 'Premature close' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from submitted to closed/i);
});

test('FR7 rejects invalid backward transition: assigned -> submitted', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'assigned' });

    const result = await invokeHandler(
        { status: 'submitted', remark: 'Move back to submitted' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from assigned to submitted/i);
});

test('FR7 rejects invalid transition: assigned -> resolved (bypassing in_progress)', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'assigned' });

    const result = await invokeHandler(
        { status: 'resolved', remark: 'Resolving without in_progress' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from assigned to resolved/i);
});

test('FR7 rejects invalid transition: assigned -> closed', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'assigned' });

    const result = await invokeHandler(
        { status: 'closed', remark: 'Closing assigned complaint directly' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from assigned to closed/i);
});

test('FR7 rejects invalid backward transition: in_progress -> submitted', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'in_progress' });

    const result = await invokeHandler(
        { status: 'submitted', remark: 'Demoting to submitted' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from in_progress to submitted/i);
});

test('FR7 rejects invalid backward transition: in_progress -> assigned', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'in_progress' });

    const result = await invokeHandler(
        { status: 'assigned', remark: 'Demoting to assigned' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from in_progress to assigned/i);
});

test('FR7 rejects invalid transition: in_progress -> closed', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'in_progress' });

    const result = await invokeHandler(
        { status: 'closed', remark: 'Closing in_progress complaint without resolution' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from in_progress to closed/i);
});

test('FR7 rejects invalid backward transition: resolved -> submitted', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'resolved' });

    const result = await invokeHandler(
        { status: 'submitted', remark: 'Reopening to submitted' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from resolved to submitted/i);
});

test('FR7 rejects invalid backward transition: resolved -> assigned', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'resolved' });

    const result = await invokeHandler(
        { status: 'assigned', remark: 'Reassigning resolved' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from resolved to assigned/i);
});

test('FR7 rejects invalid backward transition: resolved -> in_progress', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'resolved' });

    const result = await invokeHandler(
        { status: 'in_progress', remark: 'Returning to in_progress' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from resolved to in_progress/i);
});

test('FR7 rejects transitions from terminal closed status', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'closed' });

    const result = await invokeHandler(
        { status: 'resolved', remark: 'Reopening closed complaint' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from closed to resolved/i);
});

test('FR7 rejects transition to identical status', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'assigned' });

    const result = await invokeHandler(
        { status: 'assigned', remark: 'No state change' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 409);
    assert.match(result.responseBody.error, /Invalid status transition from assigned to assigned/i);
});

// --------------------------------------------------
// Remark Validation (Fewer than 500 characters, max 499)
// --------------------------------------------------

test('FR7 accepts boundary remark of exactly 499 characters', async () => {
    const mockPool = createMockPoolForStatus({ initialStatus: 'submitted' });
    const remark499 = 'r'.repeat(499);

    const result = await invokeHandler(
        { status: 'assigned', remark: remark499 },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 200);
    assert.equal(result.responseBody.complaint.remark.length, 499);
});

test('FR7 rejects boundary remark of exactly 500 characters with 400', async () => {
    const remark500 = 'r'.repeat(500);

    const result = await invokeHandler(
        { status: 'assigned', remark: remark500 },
        adminToken(),
        undefined,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 400);
    assert.match(result.responseBody.error, /must be less than 500 characters/i);
});

test('FR7 rejects remark exceeding 500 characters (501 chars) with 400', async () => {
    const remark501 = 'r'.repeat(501);

    const result = await invokeHandler(
        { status: 'assigned', remark: remark501 },
        adminToken(),
        undefined,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 400);
    assert.match(result.responseBody.error, /must be less than 500 characters/i);
});

test('FR7 rejects missing, empty, or whitespace-only remark with 400', async () => {
    const missing = await invokeHandler(
        { status: 'assigned' },
        adminToken(),
        undefined,
        'PATCH',
        '/complaints/complaint-101/status'
    );
    assert.equal(missing.statusCode, 400);

    const empty = await invokeHandler(
        { status: 'assigned', remark: '' },
        adminToken(),
        undefined,
        'PATCH',
        '/complaints/complaint-101/status'
    );
    assert.equal(empty.statusCode, 400);

    const whitespace = await invokeHandler(
        { status: 'assigned', remark: '   ' },
        adminToken(),
        undefined,
        'PATCH',
        '/complaints/complaint-101/status'
    );
    assert.equal(whitespace.statusCode, 400);
});

// --------------------------------------------------
// Status Name Validation
// --------------------------------------------------

test('FR7 rejects unknown status and returns 400', async () => {
    const result = await invokeHandler(
        { status: 'rejected', remark: 'Rejected is not in documented lifecycle' },
        adminToken(),
        undefined,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 400);
    assert.equal(result.responseBody.error, 'Invalid complaint status.');
});

// --------------------------------------------------
// Authorization Checks
// --------------------------------------------------

test('FR7 rejects unauthenticated requests with 401', async () => {
    const result = await invokeHandler(
        { status: 'assigned', remark: 'No token provided' },
        null,
        undefined,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 401);
});

test('FR7 prevents non-admin users from updating status with 403', async () => {
    const result = await invokeHandler(
        { status: 'assigned', remark: 'Regular user attempt' },
        token(),
        undefined,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 403);
});

// --------------------------------------------------
// Nonexistent Complaints & Transaction Rollback
// --------------------------------------------------

test('FR7 returns 404 when complaint does not exist', async () => {
    const mockPool = createMockPoolForStatus({ complaintExists: false });

    const result = await invokeHandler(
        { status: 'assigned', remark: 'Valid remark' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/nonexistent-id/status'
    );

    assert.equal(result.statusCode, 404);
    assert.equal(result.responseBody.error, 'Complaint not found.');
    assert.equal(mockPool.state.committed, false);
    assert.equal(mockPool.state.rolledBack, true);
    assert.equal(mockPool.state.released, true);
});

test('FR7 rolls back transaction and returns 500 when history insertion fails', async () => {
    const mockPool = createMockPoolForStatus({
        initialStatus: 'submitted',
        failOnInsertHistory: true
    });

    const result = await invokeHandler(
        { status: 'assigned', remark: 'Valid remark' },
        adminToken(),
        mockPool,
        'PATCH',
        '/complaints/complaint-101/status'
    );

    assert.equal(result.statusCode, 500);
    assert.equal(result.responseBody.error, 'Unable to update complaint status.');
    assert.equal(mockPool.state.committed, false);
    assert.equal(mockPool.state.rolledBack, true);
    assert.equal(mockPool.state.released, true);
});
