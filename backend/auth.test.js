const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';

const {
    createToken,
    verifyToken,
    hashPassword,
    verifyPassword,
    requireAuth,
    requireRole
} = require('./auth');

test('creates and verifies a valid user token', () => {
    const token = createToken({
        id: 123,
        role: 'user'
    });

    const payload = verifyToken(token);

    assert.equal(payload.sub, '123');
    assert.equal(payload.role, 'user');
});

test('rejects an invalid token', () => {
    assert.equal(verifyToken('invalid.token.value'), null);
});

test('rejects a token with a modified signature', () => {
    const token = createToken({
        id: 123,
        role: 'user'
    });

    const parts = token.split('.');
    parts[2] = 'invalidsignature';

    assert.equal(verifyToken(parts.join('.')), null);
});

test('hashes passwords and verifies the correct password', async () => {
    const password = 'A-Strong-Test-Password-123!';
    const hash = await hashPassword(password);

    assert.notEqual(hash, password);
    assert.match(hash, /^\$2[aby]\$/);
    assert.equal(await verifyPassword(password, hash), true);
    assert.equal(await verifyPassword('Wrong-Password-123!', hash), false);
});

test('rejects requests without an authorization token', () => {
    let statusCode;
    let responseBody;

    const req = { headers: {} };

    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(body) {
            responseBody = body;
            return this;
        }
    };

    requireAuth(req, res, () => {
        assert.fail('Unauthorized request must not proceed');
    });

    assert.equal(statusCode, 401);
    assert.equal(responseBody.error, 'Authentication required.');
});

test('allows only authorized roles', () => {
    let statusCode;
    let responseBody;
    let nextCalled = false;

    const req = {
        user: {
            id: '123',
            role: 'user'
        }
    };

    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(body) {
            responseBody = body;
            return this;
        }
    };

    requireRole('admin')(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(statusCode, 403);
    assert.ok(responseBody.error);
});
