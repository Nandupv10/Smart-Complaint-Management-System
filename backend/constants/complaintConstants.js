
const ALLOWED_CATEGORIES = Object.freeze([
    'Infrastructure',
    'Hostel',
    'Maintenance',
    'Cleanliness',
    'IT Support',
    'Academics',
    'Other'
]);

const VALID_STATUSES = Object.freeze([
    'submitted',
    'assigned',
    'in_progress',
    'resolved',
    'closed'
]);

const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
    submitted: Object.freeze(['assigned']),
    assigned: Object.freeze(['in_progress']),
    in_progress: Object.freeze(['resolved']),
    resolved: Object.freeze(['closed']),
    closed: Object.freeze([])
});

module.exports = {
    ALLOWED_CATEGORIES,
    VALID_STATUSES,
    ALLOWED_STATUS_TRANSITIONS
};
