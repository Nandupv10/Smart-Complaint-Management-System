const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const { createToken } = require('./auth');
const router = require('./complaintRoutes');

process.env.JWT_SECRET =
    'test-secret-key-at-least-32-characters-long';

function invokeHandler(body, token) {
    return new Promise(resolve => {
        const app = express();
        app.use(express.json());
        app.use(router);

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

const token = () => createToken({ id: 'test-user-1', role: 'user' });

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

test('complaint submission without a token returns 401', async () => {
    const result = await invokeHandler({
        title: 'Broken light',
        description: 'Light is not working'
    });

    assert.equal(result.statusCode, 401);
});
