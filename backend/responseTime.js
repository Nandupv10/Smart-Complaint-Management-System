const { performance } = require('node:perf_hooks');

function responseTime(req, res, next) {
    const startTime = performance.now();

    res.on('finish', () => {
        const durationMs = performance.now() - startTime;

        console.log(
            `${req.method} ${req.path} - ${res.statusCode} - ${durationMs.toFixed(2)} ms`
        );
    });

    next();
}

module.exports = responseTime;