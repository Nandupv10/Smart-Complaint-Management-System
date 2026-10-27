
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');

function createComplaintHandler() {
    return (req, res) => {
        const { title, description } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                error: 'Title and description are required.'
            });
        }

        if (title.length > 100) {
            return res.status(422).json({
                error: 'Title must not exceed 100 characters.'
            });
        }

        return res.status(201).json({
            message: 'Complaint submitted successfully.',
            complaintId: randomUUID()
        });
    };
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
    const handler = createComplaintHandler();

    assert.equal(invokeHandler(handler, {
        title: 'a'.repeat(100),
        description: 'Test complaint'
    }).statusCode, 201);

    assert.equal(invokeHandler(handler, {
        title: 'a'.repeat(101),
        description: 'Test complaint'
    }).statusCode, 422);
});

test('FR3 generates a unique complaint ID for each successful submission', () => {
    const handler = createComplaintHandler();

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

    assert.match(first.responseBody.complaintId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    assert.match(second.responseBody.complaintId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    assert.notEqual(
        first.responseBody.complaintId,
        second.responseBody.complaintId
    );
});
