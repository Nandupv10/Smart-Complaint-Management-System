
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';

const { hashPassword, verifyToken } = require('./auth');

const mockPool = {
    execute: async () => [[], []]
};

require('./db').createPool = () => mockPool;

const app = express();
app.use(express.json());
app.use('/auth', require('./authRoutes'));

test('registration rejects a missing email', async () => {
    const response = await request(app)
        .post('/auth/register')
        .send({ password: 'SecurePassword123!' });

    assert.equal(response.status, 400);
});

test('registration rejects a short password', async () => {
    const response = await request(app)
        .post('/auth/register')
        .send({
            email: 'user@example.com',
            password: 'short'
        });

    assert.equal(response.status, 400);
});

test('login rejects missing credentials', async () => {
    const response = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com' });

    assert.equal(response.status, 400);
});

test('login rejects an unknown email', async () => {
    mockPool.execute = async () => [[], []];

    const response = await request(app)
        .post('/auth/login')
        .send({
            email: 'unknown@example.com',
            password: 'SecurePassword123!'
        });

    assert.equal(response.status, 401);
    assert.equal(response.body.error, 'Invalid email or password.');
});

test('registration creates an account successfully', async () => {
    mockPool.execute = async (sql, params) => {
        assert.match(sql, /INSERT INTO users/);
        assert.equal(params[0], 'newuser@example.com');
        assert.notEqual(params[1], 'SecurePassword123!');
        assert.equal(params[2], 'user');

        return [{ insertId: 42 }, []];
    };

    const response = await request(app)
        .post('/auth/register')
        .send({
            email: 'NewUser@Example.com',
            password: 'SecurePassword123!'
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.userId, '42');
});

test('registration rejects duplicate email addresses', async () => {
    mockPool.execute = async () => {
        const error = new Error('Duplicate entry');
        error.code = 'ER_DUP_ENTRY';
        throw error;
    };

    const response = await request(app)
        .post('/auth/register')
        .send({
            email: 'existing@example.com',
            password: 'SecurePassword123!'
        });

    assert.equal(response.status, 409);
});

test('login succeeds and returns a valid JWT', async () => {
    const passwordHash = await hashPassword('SecurePassword123!');

    mockPool.execute = async (sql) => {
        if (/SELECT id, email, password_hash, role/.test(sql)) {
            return [[{
                id: 42,
                email: 'user@example.com',
                password_hash: passwordHash,
                role: 'user',
                failed_login_attempts: 0,
                locked_until: null
            }], []];
        }

        return [{ affectedRows: 1 }, []];
    };

    const response = await request(app)
        .post('/auth/login')
        .send({
            email: 'user@example.com',
            password: 'SecurePassword123!'
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, 'user');
    assert.equal(response.body.user.id, '42');
    assert.ok(verifyToken(response.body.token));
});

test('login rejects an incorrect password', async () => {
    const passwordHash = await hashPassword('SecurePassword123!');

    mockPool.execute = async (sql) => {
        if (/SELECT id, email, password_hash, role/.test(sql)) {
            return [[{
                id: 42,
                email: 'user@example.com',
                password_hash: passwordHash,
                role: 'user',
                failed_login_attempts: 0,
                locked_until: null
            }], []];
        }

        return [{ affectedRows: 1 }, []];
    };

    const response = await request(app)
        .post('/auth/login')
        .send({
            email: 'user@example.com',
            password: 'WrongPassword123!'
        });

    assert.equal(response.status, 401);
    assert.equal(response.body.error, 'Invalid email or password.');
});

test('login rejects an account that is currently locked', async () => {
    mockPool.execute = async () => [[{
        id: 42,
        email: 'user@example.com',
        password_hash: 'unused',
        role: 'user',
        failed_login_attempts: 0,
        locked_until: new Date(Date.now() + 10 * 60 * 1000)
    }], []];

    const response = await request(app)
        .post('/auth/login')
        .send({
            email: 'user@example.com',
            password: 'SecurePassword123!'
        });

    assert.equal(response.status, 423);
});
test('registration rejects an invalid email format', async () => {
    const response = await request(app)
        .post('/auth/register')
        .send({
            email: 'not-an-email',
            password: 'SecurePassword123!'
        });

    assert.equal(response.status, 400);
});
