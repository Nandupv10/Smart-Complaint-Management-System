const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const responseTime = require('./responseTime');

test('health-style requests respond within the provisional 500 ms target', async () => {
    const app = express();
    app.use(responseTime);

    app.get('/test', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    const server = app.listen(0, '127.0.0.1');

    try {
        await new Promise((resolve) => server.once('listening', resolve));

        const address = server.address();
        const durations = [];

        for (let i = 0; i < 20; i++) {
            const start = performance.now();
            const response = await fetch(`http://127.0.0.1:${address.port}/test`);
            await response.json();
            durations.push(performance.now() - start);

            assert.equal(response.status, 200);
        }

        durations.sort((a, b) => a - b);

        const p95 = durations[Math.ceil(durations.length * 0.95) - 1];

        console.log(`Test requests: ${durations.length}`);
        console.log(`Average latency: ${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2)} ms`);
        console.log(`P95 latency: ${p95.toFixed(2)} ms`);

        assert.ok(p95 <= 500, `P95 latency ${p95.toFixed(2)} ms exceeded 500 ms`);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
});