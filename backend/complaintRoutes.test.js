const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const router = require('./complaintRoutes');

function invokeHandler(body) {
    let statusCode;
    let responseBody;

    const handler = router.stack.find(
        layer => layer.route?.path === '/complaints'
    ).route.stack[0].handle;

    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(data) {
            responseBody = data;
            return this;
        }
    };

    handler({ body }, res);
    return { statusCode, responseBody };
}

test('SCMS TC03 accepts 100-character titles and rejects 101-character titles', () => {
    assert.equal(invokeHandler({
        title: 'a'.repeat(100),
        description: 'Test complaint'
    }).statusCode, 201);

    assert.equal(invokeHandler({
        title: 'a'.repeat(101),
        description: 'Test complaint'
    }).statusCode, 422);
});

test('FR3 generates a unique complaint ID for each successful submission', () => {
    const first = invokeHandler({
        title: 'Broken light',
        description: 'Light is not working'
    });

    const second = invokeHandler({
        title: 'Water leakage',
        description: 'Leak in the kitchen'
    });

    assert.equal(first.statusCode, 201);
    assert.equal(second.statusCode, 201);

    assert.match(first.responseBody.complaintId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    assert.match(second.responseBody.complaintId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    assert.notEqual(
        first.responseBody.complaintId,
        second.responseBody.complaintId
    );
});
