
const assert = require('node:assert/strict');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');

function loadComplaintHandler() {
    let handler;

    const router = {
        post(routePath, routeHandler) {
            assert.equal(routePath, '/complaints');
            handler = routeHandler;
        }
    };

    const mockExpress = {
        Router: () => router
    };

    const mockCrypto = {
        randomUUID: () => require('node:crypto').randomUUID()
    };

    const module = { exports: {} };

    runInNewContext(
        `
        const express = require('express');
        const { randomUUID } = require('node:crypto');
        ${require('node:fs').readFileSync(
            require('node:path').join(__dirname, 'complaintRoutes.js'),
            'utf8'
        )}
        `,
        {
            require: (name) => {
                if (name === 'express') return mockExpress;
                if (name === 'node:crypto') return mockCrypto;
                throw new Error(`Unexpected module: ${name}`);
            },
            module,
            exports: module.exports
        }
    );

    return handler;
}

function invokeHandler(handler, body) {
    let statusCode;
    let responseBody;

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
    const handler = loadComplaintHandler();

    assert.equal(
        invokeHandler(handler, {
            title: 'a'.repeat(100),
            description: 'Test complaint'
        }).statusCode,
        201
    );

    assert.equal(
        invokeHandler(handler, {
            title: 'a'.repeat(101),
            description: 'Test complaint'
        }).statusCode,
        422
    );
});

test('FR3 generates a unique complaint ID for each successful submission', () => {
    const handler = loadComplaintHandler();

    const first = invokeHandler(handler, {
        title: 'Broken light',
        description: 'Light is not working'
    });

    const second = invokeHandler(handler, {
        title: 'Water leakage',
        description: 'Leak in the kitchen'
    });

    assert.equal(first.statusCode, 201);
    assert.equal(second.statusCode, 201);
    assert.match(first.responseBody.complaintId, /^[0-9a-f-]{36}$/i);
    assert.match(second.responseBody.complaintId, /^[0-9a-f-]{36}$/i);
    assert.notEqual(
        first.responseBody.complaintId,
        second.responseBody.complaintId
    );
});
