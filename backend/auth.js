const crypto = require('node:crypto');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_LIFETIME_SECONDS = 60 * 60;

function createToken(user) {
    if (!JWT_SECRET || JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be configured with at least 32 characters.');
    }

    const now = Math.floor(Date.now() / 1000);

    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const payload = {
        sub: String(user.id),
        role: user.role,
        iat: now,
        exp: now + TOKEN_LIFETIME_SECONDS
    };

    const encode = value =>
        Buffer.from(JSON.stringify(value)).toString('base64url');

    const unsignedToken = `${encode(header)}.${encode(payload)}`;

    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(unsignedToken)
        .digest('base64url');

    return `${unsignedToken}.${signature}`;
}

function verifyToken(token) {
    if (!JWT_SECRET || JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be configured with at least 32 characters.');
    }

    if (typeof token !== 'string') {
        return null;
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
        return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(unsignedToken)
        .digest();

    let providedSignature;

    try {
        providedSignature = Buffer.from(signature, 'base64url');
    } catch {
        return null;
    }

    if (
        providedSignature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(providedSignature, expectedSignature)
    ) {
        return null;
    }

    try {
        const header = JSON.parse(
            Buffer.from(encodedHeader, 'base64url').toString('utf8')
        );

        const payload = JSON.parse(
            Buffer.from(encodedPayload, 'base64url').toString('utf8')
        );

        if (
            header.alg !== 'HS256' ||
            header.typ !== 'JWT' ||
            !payload.sub ||
            !['user', 'admin'].includes(payload.role) ||
            !Number.isInteger(payload.exp) ||
            payload.exp <= Math.floor(Date.now() / 1000)
        ) {
            return null;
        }

        return payload;
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

    return bcrypt.compare(password, passwordHash);
}

function requireAuth(req, res, next) {
    const authorization = req.headers.authorization || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return res.status(401).json({
            error: 'Authentication required.'
        });
    }

    const payload = verifyToken(match[1]);

    if (!payload) {
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
