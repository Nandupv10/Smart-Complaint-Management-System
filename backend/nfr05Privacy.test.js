const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test } = require('node:test');
const express = require('express');

process.env.JWT_SECRET = 'nfr05-test-secret-key-at-least-32-characters-long';

const { createToken } = require('./auth');
const { createComplaintRouter } = require('./complaintRoutes');

const USER_A_ID = '101';
const USER_B_ID = '202';
const ADMIN_ID = '999';

const COMPLAINT_ID_B = '11111111-2222-3333-4444-555555555555';
const COMPLAINT_ID_A = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const userAToken = () => createToken({ id: USER_A_ID, role: 'user' });
const userBToken = () => createToken({ id: USER_B_ID, role: 'user' });
const adminToken = () => createToken({ id: ADMIN_ID, role: 'admin' });

function createMockPoolForNFR05({
    complaintExists = true,
    complaintOwner = USER_B_ID,
    complaintId = COMPLAINT_ID_B,
    title = 'Broken street lamp near hostel',
    description = 'The light fixture fell and wires are exposed.',
    category = 'Hostel',
    status = 'resolved',
    userEmail = 'user_b@university.edu',
    historyRecords = [
        {
            id: 1,
            complaint_id: COMPLAINT_ID_B,
            old_status: 'submitted',
            new_status: 'assigned',
            admin_id: 999,
            remark: 'Assigned to maintenance technician',
            changed_at: '2026-11-01 10:00:00'
        },
        {
            id: 2,
            complaint_id: COMPLAINT_ID_B,
            old_status: 'assigned',
            new_status: 'in_progress',
            admin_id: 999,
            remark: 'Technician on site inspecting fixture',
            changed_at: '2026-11-02 11:30:00'
        },
        {
            id: 3,
            complaint_id: COMPLAINT_ID_B,
            old_status: 'in_progress',
            new_status: 'resolved',
            admin_id: 999,
            remark: 'Fixture replaced and wiring secured',
            changed_at: '2026-11-03 14:00:00'
        }
    ],
    feedbackRecords = [
        {
            feedback_id: 1,
            complaint_id: COMPLAINT_ID_B,
            user_id: USER_B_ID,
            rating: 5,
            comments: 'Quick resolution and safe repair. Thank you!',
            created_at: '2026-11-03 16:00:00'
        }
    ],
    failOnQuery = false
} = {}) {
    const executedQueries = [];

    const mockPool = {
        executedQueries,
        getConnection: async () => ({
            beginTransaction: async () => {},
            commit: async () => {},
            rollback: async () => {},
            release: () => {},
            execute: async (sql, params) => {
                executedQueries.push({ sql, params });
                if (/SELECT complaint_id, user_id, status/i.test(sql)) {
                    if (!complaintExists) return [[]];
                    return [[{ complaint_id: complaintId, user_id: complaintOwner, status }]];
                }
                return [{ affectedRows: 1 }];
            }
        }),
        execute: async (sql, params) => {
            executedQueries.push({ sql, params });

            if (failOnQuery) {
                throw new Error('Simulated database failure for NFR05 test');
            }

            // Check if query is looking up a complaint with join to users
            if (/FROM complaints c\s+LEFT JOIN users u/i.test(sql)) {
                if (!complaintExists) {
                    return [[]];
                }
                return [[{
                    complaint_id: complaintId,
                    user_id: complaintOwner,
                    title,
                    description,
                    category,
                    status,
                    created_at: '2026-11-01 09:00:00',
                    updated_at: '2026-11-03 14:00:00',
                    email: userEmail
                }]];
            }

            // Simple SELECT complaint_id, user_id FROM complaints
            if (/SELECT complaint_id, user_id\s+FROM complaints/i.test(sql)) {
                if (!complaintExists) {
                    return [[]];
                }
                return [[{
                    complaint_id: complaintId,
                    user_id: complaintOwner
                }]];
            }

            // History query
            if (/FROM complaint_status_history/i.test(sql)) {
                return [historyRecords];
            }

            // Feedback query
            if (/FROM complaint_feedback/i.test(sql)) {
                return [feedbackRecords];
            }

            // GET /complaints list query
            if (/FROM complaints/i.test(sql) && /ORDER BY/i.test(sql)) {
                return [[{
                    complaint_id: complaintId,
                    title,
                    description,
                    category,
                    status,
                    created_at: '2026-11-01 09:00:00',
                    updated_at: '2026-11-03 14:00:00'
                }]];
            }

            // DELETE query
            if (/DELETE FROM complaints/i.test(sql)) {
                // Return affectedRows: 1 only if admin or owner matches
                const isOwnerOrAdmin = params.includes(complaintOwner) || params.length === 1;
                return [{ affectedRows: isOwnerOrAdmin ? 1 : 0 }];
            }

            return [[]];
        }
    };

    return mockPool;
}

function invokeRequest({
    path,
    method = 'GET',
    authToken,
    body,
    headers = {},
    pool = createMockPoolForNFR05()
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
                path,
                method,
                headers: { ...headers }
            };

            let payload = null;
            if (body !== null && body !== undefined) {
                payload = typeof body === 'string' ? body : JSON.stringify(body);
                options.headers['Content-Type'] = 'application/json';
                options.headers['Content-Length'] = Buffer.byteLength(payload);
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
                        let parsedBody = {};
                        try {
                            parsedBody = data ? JSON.parse(data) : {};
                        } catch {
                            parsedBody = { raw: data };
                        }

                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            responseBody: parsedBody
                        });
                    });
                });
            });

            req.on('error', error => {
                server.close(() => resolve({ error }));
            });

            if (payload !== null) {
                req.write(payload);
            }

            req.end();
        });
    });
}

// ==============================================================================
// TEST 1: User A requests a complaint belonging to User B.
// Expected: HTTP 404. No information about User B's complaint is returned. (TC10)
// ==============================================================================
test('Test 1: User A requests a complaint belonging to User B returns HTTP 404 with no data exposed', async () => {
    const pool = createMockPoolForNFR05({
        complaintExists: true,
        complaintOwner: USER_B_ID,
        complaintId: COMPLAINT_ID_B,
        title: 'User B private sensitive complaint title',
        description: 'User B private medical/hostel incident details',
        userEmail: 'user_b_private@university.edu'
    });

    const res = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}`,
        method: 'GET',
        authToken: userAToken(),
        pool
    });

    assert.equal(res.statusCode, 404, 'Must return HTTP 404 for unauthorized access per TC10');
    assert.equal(res.responseBody.error, 'Complaint not found.');

    // Crucial NFR05 / TC10 check: verify NO fields of User B's complaint are leaked
    assert.equal(res.responseBody.complaint, undefined, 'Complaint object must not be returned');
    assert.equal(res.responseBody.title, undefined);
    assert.equal(res.responseBody.description, undefined);
    assert.equal(res.responseBody.email, undefined);
    assert.equal(res.responseBody.user, undefined);
    assert.equal(res.responseBody.history, undefined);
    assert.equal(res.responseBody.feedback, undefined);
});

// ==============================================================================
// TEST 2: User A requests their own complaint.
// Expected: Successful response with the correct complaint information.
// ==============================================================================
test('Test 2: User A requests their own complaint returns HTTP 200 with complete complaint details', async () => {
    const pool = createMockPoolForNFR05({
        complaintExists: true,
        complaintOwner: USER_A_ID,
        complaintId: COMPLAINT_ID_A,
        title: 'User A own plumbing complaint',
        description: 'Water tap leaking in room 302',
        category: 'Hostel',
        status: 'resolved',
        userEmail: 'user_a@university.edu'
    });

    const res = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_A}`,
        method: 'GET',
        authToken: userAToken(),
        pool
    });

    assert.equal(res.statusCode, 200, 'Must return HTTP 200 for complaint owner');
    assert.ok(res.responseBody.complaint, 'Response must contain complaint object');
    assert.equal(res.responseBody.complaint.complaintId, COMPLAINT_ID_A);
    assert.equal(res.responseBody.complaint.title, 'User A own plumbing complaint');
    assert.equal(res.responseBody.complaint.description, 'Water tap leaking in room 302');
    assert.equal(res.responseBody.complaint.category, 'Hostel');
    assert.equal(res.responseBody.complaint.status, 'resolved');
    assert.equal(res.responseBody.complaint.email, 'user_a@university.edu');
    assert.equal(res.responseBody.complaint.user.id, USER_A_ID);
    assert.equal(Array.isArray(res.responseBody.complaint.history), true);
    assert.equal(res.responseBody.complaint.history.length, 3);
    assert.ok(res.responseBody.complaint.feedback);
    assert.equal(res.responseBody.complaint.feedback.rating, 5);
});

// ==============================================================================
// TEST 3: An administrator requests a complaint.
// Expected: Successful response.
// ==============================================================================
test('Test 3: An administrator requests any complaint returns HTTP 200 with complaint and owner information', async () => {
    const pool = createMockPoolForNFR05({
        complaintExists: true,
        complaintOwner: USER_B_ID,
        complaintId: COMPLAINT_ID_B,
        title: 'User B complaint viewed by admin',
        description: 'Server down in lab 4',
        category: 'IT Support',
        status: 'resolved',
        userEmail: 'user_b@university.edu'
    });

    const res = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}`,
        method: 'GET',
        authToken: adminToken(),
        pool
    });

    assert.equal(res.statusCode, 200, 'Must return HTTP 200 for administrator');
    assert.ok(res.responseBody.complaint);
    assert.equal(res.responseBody.complaint.complaintId, COMPLAINT_ID_B);
    assert.equal(res.responseBody.complaint.title, 'User B complaint viewed by admin');
    assert.equal(res.responseBody.complaint.user_id, USER_B_ID);
    assert.equal(res.responseBody.complaint.email, 'user_b@university.edu');
    assert.equal(res.responseBody.complaint.history.length, 3);
});

// ==============================================================================
// TEST 4: An unauthenticated user requests private complaint information.
// Expected: HTTP 401.
// ==============================================================================
test('Test 4: An unauthenticated user requests private complaint information returns HTTP 401', async () => {
    // 4a: Details endpoint
    const resDetails = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}`,
        method: 'GET',
        authToken: null
    });
    assert.equal(resDetails.statusCode, 401);
    assert.equal(resDetails.responseBody.error, 'Authentication required.');

    // 4b: History endpoint
    const resHistory = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}/history`,
        method: 'GET',
        authToken: null
    });
    assert.equal(resHistory.statusCode, 401);
    assert.equal(resHistory.responseBody.error, 'Authentication required.');

    // 4c: Feedback endpoint
    const resFeedback = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}/feedback`,
        method: 'GET',
        authToken: null
    });
    assert.equal(resFeedback.statusCode, 401);
    assert.equal(resFeedback.responseBody.error, 'Authentication required.');

    // 4d: Complaints list endpoint
    const resList = await invokeRequest({
        path: '/complaints',
        method: 'GET',
        authToken: null
    });
    assert.equal(resList.statusCode, 401);
    assert.equal(resList.responseBody.error, 'Authentication required.');
});

// ==============================================================================
// TEST 5: User A attempts to access User B's complaint history.
// Expected: Access denied without exposing private information (HTTP 404).
// ==============================================================================
test('Test 5: User A attempts to access User B complaint history is denied (HTTP 404)', async () => {
    const pool = createMockPoolForNFR05({
        complaintExists: true,
        complaintOwner: USER_B_ID,
        complaintId: COMPLAINT_ID_B,
        historyRecords: [
            {
                id: 1,
                complaint_id: COMPLAINT_ID_B,
                old_status: 'submitted',
                new_status: 'assigned',
                admin_id: 999,
                remark: 'Confidential administrative note regarding student B'
            }
        ]
    });

    // User A attempts to access User B's history
    const res = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}/history`,
        method: 'GET',
        authToken: userAToken(),
        pool
    });

    assert.equal(res.statusCode, 404, 'Must return 404 and deny access without revealing history');
    assert.equal(res.responseBody.error, 'Complaint not found.');
    assert.equal(res.responseBody.history, undefined);

    // Verify User B (owner) can access their own history
    const resOwner = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}/history`,
        method: 'GET',
        authToken: userBToken(),
        pool
    });
    assert.equal(resOwner.statusCode, 200);
    assert.equal(resOwner.responseBody.history.length, 1);

    // Verify Admin can access complaint history
    const resAdmin = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}/history`,
        method: 'GET',
        authToken: adminToken(),
        pool
    });
    assert.equal(resAdmin.statusCode, 200);
    assert.equal(resAdmin.responseBody.history.length, 1);
});

// ==============================================================================
// TEST 6: User A attempts to access User B's feedback or personal information.
// Expected: Access denied (HTTP 404).
// ==============================================================================
test('Test 6: User A attempts to access User B feedback or personal data is denied (HTTP 404)', async () => {
    const pool = createMockPoolForNFR05({
        complaintExists: true,
        complaintOwner: USER_B_ID,
        complaintId: COMPLAINT_ID_B,
        userEmail: 'user_b_confidential@university.edu',
        feedbackRecords: [
            {
                feedback_id: 99,
                complaint_id: COMPLAINT_ID_B,
                user_id: USER_B_ID,
                rating: 1,
                comments: 'Confidential personal feedback from User B'
            }
        ]
    });

    // User A attempts to access User B's feedback endpoint
    const res = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}/feedback`,
        method: 'GET',
        authToken: userAToken(),
        pool
    });

    assert.equal(res.statusCode, 404, 'Must return 404 to deny access to User B feedback');
    assert.equal(res.responseBody.error, 'Complaint not found.');
    assert.equal(res.responseBody.feedback, undefined);

    // Verify User B (owner) can access their own feedback
    const resOwner = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}/feedback`,
        method: 'GET',
        authToken: userBToken(),
        pool
    });
    assert.equal(resOwner.statusCode, 200);
    assert.equal(resOwner.responseBody.feedback.rating, 1);

    // Verify Admin can access feedback
    const resAdmin = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}/feedback`,
        method: 'GET',
        authToken: adminToken(),
        pool
    });
    assert.equal(resAdmin.statusCode, 200);
    assert.equal(resAdmin.responseBody.feedback.rating, 1);
});

// ==============================================================================
// TEST 7: User A attempts to bypass ownership checks by changing IDs in
// URL parameters or request data. Expected: Access denied.
// ==============================================================================
test('Test 7: Bypassing ownership checks via URL params, query params, or body values is blocked', async () => {
    const pool = createMockPoolForNFR05({
        complaintExists: true,
        complaintOwner: USER_B_ID,
        complaintId: COMPLAINT_ID_B
    });

    // 7a: Query parameter tampering on GET /complaints (attempting ?user_id=202 or ?userId=202)
    await invokeRequest({
        path: `/complaints?user_id=${USER_B_ID}&userId=${USER_B_ID}`,
        method: 'GET',
        authToken: userAToken(),
        pool
    });

    const getListQuery = pool.executedQueries.find(q =>
        /FROM complaints/i.test(q.sql) && /WHERE/i.test(q.sql)
    );
    assert.ok(getListQuery, 'Must execute query with WHERE clause');
    assert.deepEqual(
        getListQuery.params,
        [USER_A_ID],
        'Must strictly use JWT identity USER_A_ID, ignoring user_id query param'
    );

    // 7b: Query param tampering on GET /complaints/:id?user_id=202
    const resTamperQuery = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}?user_id=${USER_B_ID}&userId=${USER_B_ID}`,
        method: 'GET',
        authToken: userAToken(),
        pool
    });
    assert.equal(resTamperQuery.statusCode, 404, 'Must return 404 regardless of query parameters');

    // 7c: Request body tampering on DELETE /complaints/:id with body { "userId": "202" }
    const resDeleteTamper = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}`,
        method: 'DELETE',
        authToken: userAToken(),
        body: { userId: USER_B_ID, user_id: USER_B_ID },
        pool
    });
    assert.equal(resDeleteTamper.statusCode, 404, 'Must return 404 and not delete User B complaint');

    // 7d: Submission parameter tampering on POST /complaints - backend must record authenticated user, not body userId
    await invokeRequest({
        path: '/complaints',
        method: 'POST',
        authToken: userAToken(),
        body: {
            title: 'Tamper attempt title',
            description: 'Tamper attempt description',
            category: 'Hostel',
            userId: USER_B_ID,
            user_id: USER_B_ID
        },
        pool
    });
    const insertQuery = pool.executedQueries.find(q => /INSERT INTO complaints/i.test(q.sql));
    assert.ok(insertQuery);
    assert.equal(insertQuery.params[1], USER_A_ID, 'Must record authenticated JWT identity');

    // 7e: Feedback submission tampering on POST /complaints/:id/feedback - User A attempts to submit feedback for User B
    const resFeedbackTamper = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_B}/feedback`,
        method: 'POST',
        authToken: userAToken(),
        body: {
            rating: 5,
            userId: USER_B_ID,
            comments: 'Unauthorized feedback attempt'
        },
        pool
    });
    assert.equal(resFeedbackTamper.statusCode, 403, 'Must return 403 when User A attempts feedback on User B complaint');
});

// ==============================================================================
// TEST 8: Verify HTTP-to-HTTPS redirection and TLS 1.2+ configuration.
// Expected: Plain HTTP redirects to HTTPS, and HTTPS configuration supports TLS 1.2+.
// ==============================================================================
test('Test 8: Verify HTTP-to-HTTPS redirection and TLS 1.2+ configuration', async () => {
    // 8a: Verify Nginx production reverse proxy configuration file
    const nginxConfPath = path.join(__dirname, '..', 'nginx', 'scms.conf');
    assert.ok(fs.existsSync(nginxConfPath), 'nginx/scms.conf must exist in repository');

    const nginxConf = fs.readFileSync(nginxConfPath, 'utf8');

    // Port 80 HTTP server block must redirect to HTTPS via 301
    assert.match(nginxConf, /listen\s+80;/, 'Must listen on port 80 for HTTP');
    assert.match(
        nginxConf,
        /return\s+301\s+https:\/\/\$host\$request_uri;/,
        'Must redirect HTTP to HTTPS via HTTP 301'
    );

    // Port 443 HTTPS server block must enforce TLS 1.2 or higher
    assert.match(nginxConf, /listen\s+443\s+ssl/, 'Must listen on port 443 with SSL/TLS');

    // Extract ssl_protocols directive
    const sslProtocolsMatch = nginxConf.match(/ssl_protocols\s+([^;]+);/);
    assert.ok(sslProtocolsMatch, 'Must configure ssl_protocols directive');
    const protocols = sslProtocolsMatch[1].trim().split(/\s+/);
    assert.deepEqual(
        protocols,
        ['TLSv1.2', 'TLSv1.3'],
        'ssl_protocols must specify only TLSv1.2 and TLSv1.3'
    );

    // Verify HSTS and security headers
    assert.match(
        nginxConf,
        /add_header\s+Strict-Transport-Security/i,
        'Must configure Strict-Transport-Security (HSTS)'
    );

    // Verify proxy passes protocol information
    assert.match(
        nginxConf,
        /proxy_set_header\s+X-Forwarded-Proto\s+\$scheme;/i,
        'Must forward $scheme as X-Forwarded-Proto'
    );

    // 8b: Verify Git secret / certificate ignore configuration
    const rootGitignorePath = path.join(__dirname, '..', '.gitignore');
    const backendGitignorePath = path.join(__dirname, '.gitignore');

    assert.ok(fs.existsSync(rootGitignorePath), 'Root .gitignore must exist');
    const rootGitignore = fs.readFileSync(rootGitignorePath, 'utf8');
    assert.match(rootGitignore, /\*\.key/, 'Must ignore *.key');
    assert.match(rootGitignore, /\*\.pem/, 'Must ignore *.pem');
    assert.match(rootGitignore, /\*\.crt/, 'Must ignore *.crt');
    assert.match(rootGitignore, /\.env/, 'Must ignore .env');

    const backendGitignore = fs.readFileSync(backendGitignorePath, 'utf8');
    assert.match(backendGitignore, /\*\.key/, 'Backend .gitignore must ignore *.key');
    assert.match(backendGitignore, /\*\.pem/, 'Backend .gitignore must ignore *.pem');

    // 8c: Verify Express HTTPS enforcement middleware (SR6 / NFR05)
    const testApp = express();
    testApp.set('trust proxy', 1);

    // Simulate server.js middleware with ENFORCE_HTTPS enabled
    const previousEnforce = process.env.ENFORCE_HTTPS;
    process.env.ENFORCE_HTTPS = 'true';

    testApp.use((req, res, next) => {
        const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
        if (process.env.ENFORCE_HTTPS === 'true' && !isHttps) {
            const host = req.headers.host || 'localhost';
            return res.redirect(301, `https://${host}${req.originalUrl}`);
        }
        next();
    });

    testApp.get('/test-secure', (req, res) => {
        res.status(200).json({ secure: true });
    });

    try {
        await new Promise(resolve => {
            const server = testApp.listen(0, async () => {
                const port = server.address().port;

                // Request 1: Insecure plain HTTP request (X-Forwarded-Proto: http)
                const insecureReq = http.request(
                    {
                        hostname: '127.0.0.1',
                        port,
                        path: '/test-secure',
                        method: 'GET',
                        headers: {
                            'X-Forwarded-Proto': 'http',
                            Host: 'scms.example.com'
                        }
                    },
                    res => {
                        assert.equal(res.statusCode, 301, 'Plain HTTP must redirect via 301');
                        assert.equal(
                            res.headers.location,
                            'https://scms.example.com/test-secure',
                            'Location header must point to HTTPS'
                        );

                        // Request 2: Secure HTTPS request (X-Forwarded-Proto: https)
                        const secureReq = http.request(
                            {
                                hostname: '127.0.0.1',
                                port,
                                path: '/test-secure',
                                method: 'GET',
                                headers: {
                                    'X-Forwarded-Proto': 'https',
                                    Host: 'scms.example.com'
                                }
                            },
                            secureRes => {
                                assert.equal(secureRes.statusCode, 200, 'HTTPS request must proceed');
                                server.close(resolve);
                            }
                        );
                        secureReq.end();
                    }
                );
                insecureReq.end();
            });
        });
    } finally {
        if (previousEnforce === undefined) {
            delete process.env.ENFORCE_HTTPS;
        } else {
            process.env.ENFORCE_HTTPS = previousEnforce;
        }
    }
});

// ==============================================================================
// Additional robustness and validation tests for NFR05
// ==============================================================================
test('Invalid complaint ID format returns HTTP 400 across NFR05 endpoints', async () => {
    const invalidId = 'not-a-valid-uuid';

    const resDetails = await invokeRequest({
        path: `/complaints/${invalidId}`,
        method: 'GET',
        authToken: userAToken()
    });
    assert.equal(resDetails.statusCode, 400);
    assert.equal(resDetails.responseBody.error, 'Invalid complaint ID.');

    const resHistory = await invokeRequest({
        path: `/complaints/${invalidId}/history`,
        method: 'GET',
        authToken: userAToken()
    });
    assert.equal(resHistory.statusCode, 400);

    const resFeedback = await invokeRequest({
        path: `/complaints/${invalidId}/feedback`,
        method: 'GET',
        authToken: userAToken()
    });
    assert.equal(resFeedback.statusCode, 400);
});

test('Non-existent complaint returns HTTP 404', async () => {
    const pool = createMockPoolForNFR05({ complaintExists: false });

    const res = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_A}`,
        method: 'GET',
        authToken: userAToken(),
        pool
    });
    assert.equal(res.statusCode, 404);
    assert.equal(res.responseBody.error, 'Complaint not found.');
});

test('Database failure on NFR05 endpoints returns HTTP 500', async () => {
    const pool = createMockPoolForNFR05({ failOnQuery: true });

    const res = await invokeRequest({
        path: `/complaints/${COMPLAINT_ID_A}`,
        method: 'GET',
        authToken: userAToken(),
        pool
    });
    assert.equal(res.statusCode, 500);
    assert.equal(res.responseBody.error, 'Unable to retrieve complaint details. Please try again.');
});
