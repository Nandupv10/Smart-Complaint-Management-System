const express = require('express');
const authRoutes = require('./authRoutes');
const { createPool } = require('./db');
const { createComplaintRouter } = require('./complaintRoutes');
const cors = require('cors');
const responseTime = require('./responseTime');

const app = express();

// Trust reverse proxy (Nginx terminating TLS)
app.set('trust proxy', 1);

app.use(responseTime);

// NFR05: Ensure data travels only over HTTPS.
// When running behind reverse proxy with ENFORCE_HTTPS=true,
// redirect plain HTTP requests to HTTPS via 301.
app.use((req, res, next) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (process.env.ENFORCE_HTTPS === 'true' && !isHttps) {
        const host = req.headers.host || 'localhost';
        return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    next();
});
app.use(cors({ origin: 'http://localhost:5173' }));

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

app.use('/auth', authRoutes);
app.use('/', createComplaintRouter(createPool()));

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

if (require.main === module) {
    const port = Number(process.env.PORT || 3000);

    app.listen(port, () => {
        console.log(`SCMS backend listening on port ${port}`);
    });
}

module.exports = app;