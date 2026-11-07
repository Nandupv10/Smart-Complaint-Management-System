
const COMPLAINT_UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidComplaintId(complaintId) {
    return (
        typeof complaintId === 'string' &&
        COMPLAINT_UUID_PATTERN.test(complaintId)
    );
}

module.exports = {
    isValidComplaintId
};
