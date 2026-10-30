
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
