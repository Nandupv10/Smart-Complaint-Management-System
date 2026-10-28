const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const TOKEN_LIFETIME = '1h';

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
        throw new Error(
            'JWT_SECRET must be configured with at least 32 bytes.'
        );
    }

    return secret;
}

function createToken(user) {
    if (
        !user ||
        user.id === undefined ||
        user.id === null ||
        !['user', 'admin'].includes(user.role)
    ) {
        throw new Error('A valid user ID and role are required.');
    }

    return jwt.sign(
        { role: user.role },
        getJwtSecret(),
        {
            algorithm: 'HS256',
            subject: String(user.id),
            expiresIn: TOKEN_LIFETIME
        }
    );
}

function verifyToken(token) {
    if (typeof token !== 'string' || !token.trim()) {
        return null;
    }

    try {
        return jwt.verify(token, getJwtSecret(), {
            algorithms: ['HS256']
        });
    } catch {
        return null;
    }
}

async function hashPassword(password) {
    if (typeof password !== 'string' || password.length < 12) {
        throw new Error('Password must contain at least 12 characters.');
    }

    return bcrypt.hash(password, 12);
}

async function verifyPassword(password, passwordHash) {
    if (
        typeof password !== 'string' ||
        typeof passwordHash !== 'string'
    ) {
        return false;
    }

    try {
        return await bcrypt.compare(password, passwordHash);
    } catch {
        return false;
    }
}

function requireAuth(req, res, next) {
    const authorization = req.headers.authorization || '';
    const match = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
        return res.status(401).json({
            error: 'Authentication required.'
        });
    }

    const payload = verifyToken(match[1]);

    if (
        !payload ||
        typeof payload.sub !== 'string' ||
        !['user', 'admin'].includes(payload.role)
    ) {
        return res.status(401).json({
            error: 'Invalid or expired token.'
        });
    }

    req.user = {
        id: payload.sub,
        role: payload.role
    };

    return next();
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'You do not have permission to access this resource.'
            });
        }

        return next();
    };
}

module.exports = {
    createToken,
    verifyToken,
    hashPassword,
    verifyPassword,
    requireAuth,
    requireRole
};
