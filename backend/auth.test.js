const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';

const {
    createToken,
    verifyToken,
    hashPassword,
    verifyPassword,
    requireAuth,
    requireRole
} = require('./auth');

test('creates and verifies a valid JWT', () => {
    const token = createToken({ id: '123', role: 'user' });
    const payload = verifyToken(token);

    assert.ok(payload);
    assert.equal(payload.sub, '123');
    assert.equal(payload.role, 'user');
    assert.ok(payload.exp > payload.iat);
});

test('rejects an invalid token', () => {
    assert.equal(verifyToken('invalid.token.value'), null);
});

test('rejects a token with a modified signature', () => {
    const token = createToken({ id: '123', role: 'user' });
    const parts = token.split('.');
    parts[2] = `${parts[2].slice(0, -1)}x`;

    assert.equal(verifyToken(parts.join('.')), null);
});

test('rejects unsupported user roles when creating a token', () => {
    assert.throws(() => createToken({ id: '123', role: 'superuser' }));
});

test('hashes a password and verifies the correct password', async () => {
    const password = 'SecurePassword123!';
    const hash = await hashPassword(password);

    assert.notEqual(hash, password);
    assert.equal(await verifyPassword(password, hash), true);
    assert.equal(await verifyPassword('WrongPassword123!', hash), false);
});

test('rejects passwords shorter than 12 characters', async () => {
    await assert.rejects(() => hashPassword('short'));
});

test('returns 401 when the authorization token is missing', () => {
    const req = { headers: {} };
    const res = {
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
    let nextCalled = false;

    requireAuth(req, res, () => {
        nextCalled = true;
    });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('denies access when the user role is not permitted', () => {
    const req = { user: { id: '123', role: 'user' } };
    const res = {
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
    let nextCalled = false;

    requireRole('admin')(req, res, () => {
        nextCalled = true;
    });

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});
