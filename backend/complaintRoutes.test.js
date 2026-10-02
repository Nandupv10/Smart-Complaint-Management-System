const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

function loadComplaintHandler() {
    let handler;
    const router = {
        post(routePath, routeHandler) {
            assert.equal(routePath, '/complaints');
            handler = routeHandler;
        }
    };
    const module = { exports: {} };

    runInNewContext(readFileSync(path.join(__dirname, 'complaintRoutes.js'), 'utf8'), {
        require: (name) => {
            assert.equal(name, 'express');
            return { Router: () => router };
        },
        module
    });

    assert.equal(typeof handler, 'function');
    return handler;
}

function submitTitle(handler, title) {
    const response = {
        statusCode: undefined,
        body: undefined,
        status(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };

    handler({ body: { title, description: 'Complaint details' } }, response);
    return response;
}

test('SCMS TC03 accepts 100-character titles and rejects 101-character titles', () => {
    const handler = loadComplaintHandler();

    assert.equal(submitTitle(handler, 'a'.repeat(100)).statusCode, 201);
    assert.equal(submitTitle(handler, 'a'.repeat(101)).statusCode, 422);
});