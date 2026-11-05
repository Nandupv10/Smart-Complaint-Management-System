# Smart Complaint Management System – REST API Reference

## 1. Overview

The Smart Complaint Management System (SCMS) backend exposes RESTful APIs for user authentication, complaint management, administrative operations, and post-resolution feedback.

### Base URL

```text
http://localhost:3000
```

### API Conventions

- Request and response bodies use JSON.
- Protected endpoints require JWT authentication.
- Authentication uses the HTTP Bearer token scheme.
- Complaint identifiers are UUIDs.
- HTTP status codes indicate the outcome of each request.

### Authentication Header

Include the following header when accessing protected endpoints:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 2. Authentication APIs

### 2.1 Register a User

Creates a new user account. Newly registered accounts receive the `user` role automatically.

**Endpoint**

```http
POST /auth/register
```

**Authentication:** Not required.

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Validation Rules**

- Email must be valid.
- Email is trimmed and converted to lowercase.
- Email must not exceed 254 characters.
- Password must contain at least 12 characters.
- Duplicate email addresses are not permitted.

**Success Response – 201 Created**

```json
{
  "message": "Registration successful.",
  "userId": "101"
}
```

**Error Responses**

| Status | Description |
|---|---|
| 400 | Invalid email or password |
| 409 | Account with this email already exists |
| 500 | Registration could not be completed |

---

### 2.2 Login

Authenticates an existing user and generates a JWT access token.

**Endpoint**

```http
POST /auth/login
```

**Authentication:** Not required.

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response – 200 OK**

```json
{
  "message": "Login successful.",
  "token": "<JWT_TOKEN>",
  "user": {
    "id": "101",
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Security Behaviour**

- Passwords are verified using bcrypt.
- JWT tokens use the HS256 signing algorithm.
- Token lifetime is one hour.
- Five consecutive failed login attempts trigger a temporary account lock.
- The account remains locked for 15 minutes.
- Successful authentication resets the failed login counter.

**Error Responses**

| Status | Description |
|---|---|
| 400 | Invalid email or missing password |
| 401 | Invalid email or password |
| 423 | Account temporarily locked |
| 500 | Login could not be completed |

---

## 3. Complaint Management APIs

### 3.1 Submit a Complaint

Creates a new complaint associated with the authenticated user.

**Endpoint**

```http
POST /complaints
```

**Authentication:** Required.

**Request Body**

```json
{
  "title": "Hostel water supply issue",
  "description": "There has been no water supply since morning.",
  "category": "Hostel"
}
```

The category field is optional. If omitted, it defaults to `Uncategorized`.

**Allowed Categories for Complaint Submission**

- Infrastructure
- Hostel
- Maintenance
- Cleanliness
- IT Support
- Academics
- Other
- Uncategorized (default)

**Validation Rules**

- Title is required and must not exceed 100 characters.
- Description is required.
- Title and description must not be empty.
- Category must be one of the permitted submission categories or `Uncategorized`.

**Success Response – 201 Created**

```json
{
  "message": "Complaint submitted successfully.",
  "complaintId": "123e4567-e89b-12d3-a456-426614174000",
  "submittedBy": "101"
}
```

The complaint ID is generated automatically.

**Error Responses**

| Status | Description |
|---|---|
| 400 | Missing title, description, or invalid category |
| 401 | Authentication required or invalid token |
| 422 | Title exceeds 100 characters |
| 500 | Unable to submit complaint |

---

### 3.2 Retrieve Complaints

Retrieves complaints with optional filtering.

**Endpoint**

```http
GET /complaints
```

**Authentication:** Required.

**Query Parameters**

| Parameter | Description | Format |
|---|---|---|
| `status` | Filter by complaint status | String |
| `category` | Filter by complaint category | String |
| `startDate` | Filter complaints from a date | YYYY-MM-DD |
| `endDate` | Filter complaints up to a date | YYYY-MM-DD |

All query parameters are optional.

**Valid Status Values**

- `submitted`
- `assigned`
- `in_progress`
- `resolved`
- `closed`

**Example Requests**

Retrieve all accessible complaints:

```http
GET /complaints
```

Retrieve complaints by status:

```http
GET /complaints?status=resolved
```

Retrieve complaints by category:

```http
GET /complaints?category=Hostel
```

Retrieve complaints within a date range:

```http
GET /complaints?startDate=2026-01-01&endDate=2026-01-31
```

Combine multiple filters:

```http
GET /complaints?status=submitted&category=Infrastructure
```

**Authorization Behaviour**

- Regular users can retrieve only their own complaints.
- Administrators can retrieve complaints from all users.

**Success Response – 200 OK**

```json
{
  "complaints": [
    {
      "complaint_id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Hostel water supply issue",
      "description": "There has been no water supply since morning.",
      "status": "submitted",
      "created_at": "2026-11-05T08:30:00.000Z",
      "updated_at": "2026-11-05T08:30:00.000Z",
      "category": "Hostel"
    }
  ]
}
```

The response fields represent the complaint records returned by the database.

**Error Responses**

| Status | Description |
|---|---|
| 400 | Invalid status or date filter |
| 401 | Authentication required |
| 500 | Unable to retrieve complaints |

---

### 3.3 Delete a Complaint

Deletes a complaint using its UUID.

**Endpoint**

```http
DELETE /complaints/:id
```

**Authentication:** Required.

**Path Parameter**

| Parameter | Description |
|---|---|
| `id` | UUID of the complaint |

**Authorization Behaviour**

- Users can delete only their own complaints.
- Administrators can delete any complaint.

**Example Request**

```http
DELETE /complaints/123e4567-e89b-12d3-a456-426614174000
```

**Success Response – 200 OK**

```json
{
  "message": "Complaint deleted successfully.",
  "complaintId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Error Responses**

| Status | Description |
|---|---|
| 400 | Invalid complaint ID |
| 401 | Authentication required |
| 404 | Complaint not found or not accessible to the user |
| 500 | Unable to delete complaint |

---

### 3.4 Retrieve Complaint Details and Status History

Retrieves detailed information, status change history, and feedback for a specific complaint.

**Endpoint**

```http
GET /complaints/:id
```

**Authentication:** Required.

**Authorization:**
- Complaint owner can retrieve their own complaint.
- Administrators can retrieve any complaint.
- Other users receive **404 Not Found** (TC10) to protect privacy.

**Path Parameter**

| Parameter | Description |
|---|---|
| `id` | UUID of the complaint |

**Success Response – 200 OK**

```json
{
  "complaint": {
    "complaintId": "123e4567-e89b-12d3-a456-426614174000",
    "complaint_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Hostel water supply issue",
    "description": "There has been no water supply since morning.",
    "category": "Hostel",
    "status": "in_progress",
    "created_at": "2026-11-05T08:30:00.000Z",
    "updated_at": "2026-11-05T10:00:00.000Z",
    "user_id": "101",
    "email": "user@example.com",
    "user": {
      "id": "101",
      "email": "user@example.com"
    },
    "history": [
      {
        "id": 1,
        "complaint_id": "123e4567-e89b-12d3-a456-426614174000",
        "old_status": "submitted",
        "new_status": "assigned",
        "admin_id": 201,
        "remark": "Assigned to plumbing team",
        "changed_at": "2026-11-05T09:00:00.000Z"
      }
    ],
    "feedback": null
  }
}
```

**Error Responses**

| Status | Description |
|---|---|
| 400 | Invalid complaint ID format |
| 401 | Authentication required |
| 404 | Complaint not found or belongs to another user (TC10) |
| 500 | Unable to retrieve complaint details |

---

### 3.5 Retrieve Complaint History

Retrieves the lifecycle status history records for a complaint.

**Endpoint**

```http
GET /complaints/:id/history
```

**Authentication:** Required.

**Authorization:** Owner or Administrator only. Other users receive 404 Not Found.

**Success Response – 200 OK**

```json
{
  "complaintId": "123e4567-e89b-12d3-a456-426614174000",
  "history": [
    {
      "id": 1,
      "complaint_id": "123e4567-e89b-12d3-a456-426614174000",
      "old_status": "submitted",
      "new_status": "assigned",
      "admin_id": 201,
      "remark": "Assigned to plumbing team",
      "changed_at": "2026-11-05T09:00:00.000Z"
    }
  ]
}
```

---

### 3.6 Retrieve Complaint Feedback

Retrieves post-resolution feedback for a complaint.

**Endpoint**

```http
GET /complaints/:id/feedback
```

**Authentication:** Required.

**Authorization:** Owner or Administrator only. Other users receive 404 Not Found.

**Success Response – 200 OK**

```json
{
  "complaintId": "123e4567-e89b-12d3-a456-426614174000",
  "feedback": {
    "feedback_id": 1,
    "complaint_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": 101,
    "rating": 5,
    "comments": "Excellent service.",
    "created_at": "2026-11-05T12:00:00.000Z"
  }
}
```

---

## 4. Administrative APIs

The following endpoints require an authenticated administrator account.

### 4.1 Update Complaint Category

Updates the category associated with an existing complaint.

**Endpoint**

```http
PATCH /complaints/:id/category
```

**Authentication:** Required.

**Authorization:** Admin only.

**Request Body**

```json
{
  "category": "Infrastructure"
}
```

**Validation Rules**

- Category must be a non-empty string.
- Category must contain between 1 and 100 characters after trimming.
- The administrative endpoint accepts category names beyond the predefined complaint submission options.

**Success Response – 200 OK**

```json
{
  "message": "Complaint category updated successfully.",
  "complaintId": "123e4567-e89b-12d3-a456-426614174000",
  "category": "Infrastructure"
}
```

**Error Responses**

| Status | Description |
|---|---|
| 400 | Invalid category |
| 401 | Authentication required |
| 403 | Administrator permission required |
| 404 | Complaint not found |
| 500 | Unable to update complaint category |

---

### 4.2 Update Complaint Status

Allows administrators to update complaint status according to the defined complaint lifecycle.

**Endpoint**

```http
PATCH /complaints/:id/status
```

**Authentication:** Required.

**Authorization:** Admin only.

**Request Body**

```json
{
  "status": "assigned",
  "remark": "Complaint reviewed and assigned to the maintenance department."
}
```

**Allowed Status Transitions**

| Current Status | Permitted Next Status |
|---|---|
| submitted | assigned |
| assigned | in_progress |
| in_progress | resolved |
| resolved | closed |
| closed | None |

Status transitions must follow this sequence. Skipping a stage or moving backwards is not permitted.

**Validation Rules**

- Status must be a valid status value.
- A remark is mandatory.
- Remark must contain fewer than 500 characters after trimming.
- Only administrators can perform status updates.

**Success Response – 200 OK**

```json
{
  "message": "Complaint status updated successfully.",
  "complaint": {
    "complaintId": "123e4567-e89b-12d3-a456-426614174000",
    "oldStatus": "submitted",
    "newStatus": "assigned",
    "remark": "Complaint reviewed and assigned to the maintenance department.",
    "updatedBy": "201"
  }
}
```

**Database Behaviour**

- A database transaction is initiated.
- The complaint record is locked using `SELECT ... FOR UPDATE`.
- The complaint status is updated.
- A record is inserted into `complaint_status_history`.
- Both operations are committed together.
- The transaction is rolled back if an error occurs.

**Error Responses**

| Status | Description |
|---|---|
| 400 | Invalid status or remark |
| 401 | Authentication required |
| 403 | Administrator permission required |
| 404 | Complaint not found |
| 409 | Invalid status transition |
| 500 | Unable to update complaint status |

---

## 5. User Feedback API

### 5.1 Submit Feedback After Resolution

Allows a user to submit a rating and optional comments for their resolved complaint.

**Endpoint**

```http
POST /complaints/:id/feedback
```

**Authentication:** Required.

**Authorization:** Only the owner of the complaint can submit feedback.

**Request Body**

```json
{
  "rating": 5,
  "comments": "The issue was resolved quickly. Excellent service."
}
```

**Request Fields**

| Field | Type | Required | Validation |
|---|---|---|---|
| `rating` | Integer | Yes | Between 1 and 5 |
| `comments` | String | No | Maximum 1000 characters |

Comments containing only whitespace are stored as `null`.

**Business Rules**

- The complaint must exist.
- The authenticated user must own the complaint.
- The complaint status must be `resolved`.
- Feedback can be submitted only once per complaint.
- The complaint and feedback operations use transaction handling.
- A unique database constraint prevents duplicate feedback.

**Success Response – 201 Created**

```json
{
  "message": "Feedback submitted successfully.",
  "feedback": {
    "complaintId": "123e4567-e89b-12d3-a456-426614174000",
    "rating": 5,
    "comments": "The issue was resolved quickly. Excellent service."
  }
}
```

**Error Responses**

| Status | Description |
|---|---|
| 400 | Invalid complaint ID, rating, or comments |
| 401 | Authentication required |
| 403 | User does not own the complaint |
| 404 | Complaint not found |
| 409 | Complaint is not resolved or feedback already exists |
| 500 | Unable to submit feedback |

---

## 6. Health Check API

### 6.1 Check Backend Availability

Checks whether the backend HTTP application is responding.

**Endpoint**

```http
GET /health
```

**Authentication:** Not required.

**Success Response – 200 OK**

```json
{
  "status": "ok"
}
```

This endpoint confirms that the application responds to an HTTP health-check request. It does not independently verify database connectivity.

---

## 7. Authentication and Security

### JWT Authentication

Protected endpoints use JSON Web Tokens.

The token is generated after successful login and must be included in subsequent requests.

**Header Format**

```http
Authorization: Bearer <JWT_TOKEN>
```

### Token Properties

| Property | Value |
|---|---|
| Signing Algorithm | HS256 |
| Token Lifetime | 1 hour |
| User Identity | JWT subject (`sub`) |
| Role | `user` or `admin` |
| Secret | `JWT_SECRET` environment variable |

The configured JWT secret must contain at least 32 bytes.

### Password Security

- Passwords are hashed using bcrypt.
- Passwords must contain at least 12 characters.
- Password verification uses bcrypt comparison.

### Role-Based Access Control

| Operation | User | Admin |
|---|---|---|
| Register | Yes | Yes (new accounts receive user role) |
| Login | Yes | Yes |
| Submit complaint | Yes | Yes |
| Retrieve complaints | Own complaints | All complaints |
| View complaint details & history | Own complaints | All complaints |
| View complaint history | Own complaints | All complaints |
| View complaint feedback | Own complaints | All complaints |
| Delete complaint | Own complaints | Any complaint |
| Update category | No | Yes |
| Update status | No | Yes |
| Submit feedback | Own resolved complaints | Only if the administrator also owns the complaint |

---

## 8. General HTTP Status Codes

| HTTP Status | Meaning |
|---|---|
| 200 OK | Request completed successfully |
| 201 Created | Resource successfully created |
| 400 Bad Request | Invalid request or validation failure |
| 401 Unauthorized | Missing, invalid, or expired authentication |
| 403 Forbidden | Insufficient permissions or ownership |
| 404 Not Found | Requested complaint does not exist or is not accessible |
| 409 Conflict | Duplicate feedback or invalid status transition |
| 422 Unprocessable Entity | Complaint title exceeds the permitted length |
| 423 Locked | Account temporarily locked |
| 500 Internal Server Error | Unexpected server-side failure |

Most error responses use the following JSON structure:

```json
{
  "error": "Description of the error."
}
```

---

## 9. Example API Requests Using cURL

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword123"}'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword123"}'
```

### Submit Complaint

```bash
curl -X POST http://localhost:3000/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Water supply issue","description":"No water supply since morning.","category":"Hostel"}'
```

### Retrieve Complaints

```bash
curl -X GET "http://localhost:3000/complaints?status=submitted" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Complaint Status

```bash
curl -X PATCH http://localhost:3000/complaints/COMPLAINT_UUID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"status":"assigned","remark":"Assigned to the maintenance department."}'
```

### Submit Feedback

```bash
curl -X POST http://localhost:3000/complaints/COMPLAINT_UUID/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"rating":5,"comments":"Excellent service."}'
```

### Health Check

```bash
curl http://localhost:3000/health
```

---

## 10. Implementation References

The API implementation is maintained in the following backend files:

| File | Responsibility |
|---|---|
| `backend/server.js` | Express application and route mounting |
| `backend/authRoutes.js` | Registration and login endpoints |
| `backend/auth.js` | JWT authentication, authorization, and password utilities |
| `backend/complaintRoutes.js` | Complaint, administration, and feedback endpoints |
| `backend/db.js` | MySQL connection pool |
| `backend/schema.sql` | Database schema |

For database structure and table relationships, refer to [`backend/schema.sql`](../backend/schema.sql).

For the overall project description and installation instructions, refer to the [main README](../README.md).

---

**Project:** Smart Complaint Management System (SCMS)

**Repository:** https://github.com/Nandupv10/Smart-Complaint-Management-System