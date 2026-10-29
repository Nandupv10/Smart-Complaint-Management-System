
const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const { createToken } = require('./auth');
const { createComplaintRouter } = require('./complaintRoutes');

process.env.JWT_SECRET =
    'test-secret-key-at-least-32-characters-long';

function invokeHandler(body, token, pool = {
    execute: async () => [{}]
}) {
    return new Promise(resolve => {
        const app = express();
        app.use(express.json());
        app.use(createComplaintRouter(pool));

        const server = app.listen(0, () => {
            const address = server.address();
            const options = {
                hostname: '127.0.0.1',
                port: address.port,
                path: '/complaints',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (token) {
                options.headers.Authorization = `Bearer ${token}`;
            }

            const req = require('node:http').request(options, res => {
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

            req.end(JSON.stringify(body));
        });
    });
}

const token = () => createToken({
    id: 'test-user-1',
    role: 'user'
});

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
