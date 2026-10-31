const express = require('express');
const authRoutes = require('./authRoutes');
const { createPool } = require('./db');
const { createComplaintRouter } = require('./complaintRoutes');
const cors = require('cors');
const responseTime = require('./responseTime');

const app = express();

app.use(responseTime);
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