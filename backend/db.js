const mysql = require('mysql2/promise');

function createPool() {
    const {
        DB_HOST,
        DB_PORT,
        DB_USER,
        DB_PASSWORD,
        DB_NAME
    } = process.env;

    if (!DB_HOST || !DB_USER || !DB_NAME) {
        throw new Error(
            'DB_HOST, DB_USER, and DB_NAME must be configured.'
        );
    }

    return mysql.createPool({
        host: DB_HOST,
        port: Number(DB_PORT || 3306),
        user: DB_USER,
        password: DB_PASSWORD || '',
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

module.exports = { createPool };
