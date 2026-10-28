
const express = require('express');
const { createPool } = require('./db');
const {
    createToken,
    hashPassword,
    verifyPassword
} = require('./auth');

const router = express.Router();

let pool;

function getPool() {
    if (!pool) {
        pool = createPool();
    }
    return pool;
}

// Register a new user
router.post('/register', async (req, res) => {
    const { email, password } = req.body || {};

    if (
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== 'string' ||
    password.length < 12
) {
        return res.status(400).json({
            error: 'A valid email and password of at least 12 characters are required.'
        });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const passwordHash = await hashPassword(password);

        const [result] = await getPool().execute(
            'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
            [normalizedEmail, passwordHash, 'user']
        );

        return res.status(201).json({
            message: 'Registration successful.',
            userId: String(result.insertId)
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'An account with this email already exists.'
            });
        }

        console.error('Registration failed:', error.message);

        return res.status(500).json({
            error: 'Registration could not be completed.'
        });
    }
});

// Log in an existing user
router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            error: 'Email and password are required.'
        });
    }

    try {
        const [rows] = await getPool().execute(
            `SELECT id, email, password_hash, role,
                    failed_login_attempts, locked_until
             FROM users
             WHERE email = ?`,
            [email.trim().toLowerCase()]
        );

        const user = rows[0];

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password.'
            });
        }

        if (
            user.locked_until &&
            new Date(user.locked_until).getTime() > Date.now()
        ) {
            return res.status(423).json({
                error: 'Account temporarily locked. Please try again later.'
            });
        }

        const validPassword = await verifyPassword(
            password,
            user.password_hash
        );

        if (!validPassword) {
            const attempts = Number(user.failed_login_attempts) + 1;
            const maxAttempts = 5;
            const locked = attempts >= maxAttempts;

            await getPool().execute(
                `UPDATE users
                 SET failed_login_attempts = ?,
                     locked_until = ?
                 WHERE id = ?`,
                [
                    locked ? 0 : attempts,
                    locked ? new Date(Date.now() + 15 * 60 * 1000) : null,
                    user.id
                ]
            );

            return res.status(401).json({
                error: 'Invalid email or password.'
            });
        }

        await getPool().execute(
            `UPDATE users
             SET failed_login_attempts = 0, locked_until = NULL
             WHERE id = ?`,
            [user.id]
        );

        const token = createToken({
            id: user.id,
            role: user.role
        });

        return res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: String(user.id),
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login failed:', error.message);

        return res.status(500).json({
            error: 'Login could not be completed.'
        });
    }
});

module.exports = router;
