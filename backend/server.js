
const express = require('express');
const authRoutes = require('./authRoutes');
const complaintRoutes = require('./complaintRoutes');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

app.use('/auth', authRoutes);
app.use('/', complaintRoutes);

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
