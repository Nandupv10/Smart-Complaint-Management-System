# Smart Complaint Management System (SCMS)

A centralized web-based platform for submitting, tracking, managing, and resolving complaints through a structured complaint lifecycle.

## 1. Project Overview

The **Smart Complaint Management System (SCMS)** is a web application designed to simplify complaint management by providing a common platform for users and administrators.

Users can register, log in, submit complaints, track their status, and provide feedback after resolution. Administrators can review complaints, categorize them, update their status, and manage the resolution process.

This project is developed as a Software Engineering Mini-Project, applying software engineering principles across requirements engineering, system design, implementation, testing, and project management.

## 2. Problem Statement

Traditional complaint management processes can be manual, fragmented, and difficult to track. Users may lack visibility into complaint progress, while administrators may find it difficult to organize complaints and monitor their resolution.

SCMS addresses these challenges through a centralized platform that maintains complaint records and supports structured complaint processing, status tracking, and post-resolution feedback.

## 3. Project Objectives

- Provide a centralized platform for complaint submission and management.
- Generate unique identifiers for complaints.
- Allow users to track complaint progress.
- Enable administrators to categorize and manage complaints.
- Maintain structured complaint status transitions.
- Allow users to submit ratings and feedback after resolution.
- Provide authentication and role-based authorization.
- Maintain records of important complaint status changes.

## 4. Key Features

### User Features
- User registration and login.
- Complaint submission.
- Unique complaint ID generation.
- Complaint status tracking.
- Viewing complaint information.
- Feedback and rating submission after resolution.

### Administrator Features
- Administrator authentication.
- Viewing submitted complaints.
- Complaint categorization.
- Complaint status management.
- Complaint resolution workflow.

### Security and Accountability
- JWT-based authentication.
- Role-based authorization.
- Password hashing.
- Complaint ownership validation.
- Complaint status history.
- Duplicate feedback prevention.

## 5. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Database Driver | mysql2 |
| Authentication | JSON Web Tokens (JWT) |
| Password Security | bcrypt |
| Testing | Node.js built-in test runner |
| Version Control | Git and GitHub |

## 6. System Architecture

SCMS follows a layered web application architecture.

1. **Presentation Layer:** React-based user interface.
2. **Application Layer:** Express.js backend handling authentication, complaint operations, status management, and feedback.
3. **Data Layer:** MySQL database storing users, complaints, complaint status history, and feedback.

### Architecture Diagram

![Smart Complaint Management System Architecture](Smart%20Complaint%20System%20Architecture.png)

## 7. Repository Structure

```text
Smart-Complaint-Management-System/
│
├── backend/
│   ├── auth.js
│   ├── authRoutes.js
│   ├── complaintRoutes.js
│   ├── db.js
│   ├── responseTime.js
│   ├── schema.sql
│   ├── server.js
│   ├── package.json
│   └── *.test.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── README.md
│
├── docs/
│   ├── nfr4-data-durability.md
│   ├── sprint1-summary.md
│   └── sprint2-progress.md
│
├── scripts/
│
├── .github/
│
├── README.md
├── Smart Complaint System Architecture.png
└── Project documentation PDFs
```

## 8. Database Design

The application uses MySQL for persistent data storage.

The main database tables are:

| Table | Description |
|---|---|
| `users` | Stores user accounts, authentication details, and roles. |
| `complaints` | Stores complaint information, ownership, category, and status. |
| `complaint_status_history` | Maintains records of complaint status transitions and administrator remarks. |
| `complaint_feedback` | Stores post-resolution ratings and optional comments. |

The database schema is available at [`backend/schema.sql`](backend/schema.sql).

## 9. Prerequisites

Install the following before running the application:

- Node.js 20 or later.
- npm.
- MySQL Server.
- Git.

## 10. Installation and Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Nandupv10/Smart-Complaint-Management-System.git
cd Smart-Complaint-Management-System
```

### Step 2: Configure the Database

Start MySQL and create a database:

```sql
CREATE DATABASE scms_nfr3_test;
```

Import the schema from the backend directory:

```bash
mysql -u root -p scms_nfr3_test < backend/schema.sql
```

Replace the database name with your preferred database name if required.

### Step 3: Configure Backend Environment Variables

Navigate to the backend:

```bash
cd backend
```

Create a `.env` file in the `backend` directory:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=scms_nfr3_test
JWT_SECRET=replace_with_a_secure_random_secret_at_least_32_bytes_long
PORT=3000
```

Use your own MySQL credentials and a secure JWT secret. Do not commit the `.env` file.

### Step 4: Install Backend Dependencies

From the `backend` directory:

```bash
npm install
```

### Step 5: Start the Backend

```bash
npm start
```

The backend runs on:

```text
http://localhost:3000
```

The health endpoint is available at:

```text
http://localhost:3000/health
```

### Step 6: Install Frontend Dependencies

Open another terminal at the repository root:

```bash
cd frontend
npm install
```

### Step 7: Start the Frontend

```bash
npm run dev
```

The Vite development server normally runs at:

```text
http://localhost:5173
```

## 11. API Overview

The backend exposes REST API endpoints for authentication and complaint management.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a user |
| POST | `/auth/login` | Authenticate a user |
| POST | `/complaints` | Submit a complaint |
| GET | `/complaints` | Retrieve complaints |
| DELETE | `/complaints/:id` | Delete a complaint |
| PATCH | `/complaints/:id/category` | Update complaint category |
| PATCH | `/complaints/:id/status` | Update complaint status |
| POST | `/complaints/:id/feedback` | Submit post-resolution feedback |
| GET | `/health` | Check backend health |

Protected endpoints require appropriate authentication and authorization.

## 12. Complaint Lifecycle

The complaint status workflow is:

```text
Submitted
    ↓
Assigned
    ↓
In Progress
    ↓
Resolved
    ↓
Closed
```

Users can submit feedback after a complaint reaches the `resolved` status.

Each complaint can receive feedback only once.

## 13. Running Tests

Backend automated tests use Node.js's built-in test runner.

Navigate to the backend:

```bash
cd backend
```

Run the complete test suite:

```bash
npm test
```

The test suite covers authentication, complaint operations, status management, feedback submission, and other backend functionality.

## 14. Project Documentation

The repository includes supporting Software Engineering Mini-Project documentation:

- Software Requirements Specification (SRS).
- Problem Statement Analysis.
- Functional Requirements and Validation.
- Requirements Traceability Matrix.
- Actor Identification.
- Use Case Model and Diagram.
- Test Plan, Architecture Design, and Test Cases.
- System Architecture Diagram.

Additional implementation documentation:

- [NFR4 – Data Durability](docs/nfr4-data-durability.md)
- [Sprint 1 Summary](docs/sprint1-summary.md)
- [Sprint 2 Progress](docs/sprint2-progress.md)

Refer to the project PDFs in the repository root for the detailed requirements and design deliverables.

## 15. Contribution Workflow

Contributions are managed through GitHub.

The general workflow is:

1. Create a feature branch from `main`.
2. Implement the assigned functionality.
3. Add or update automated tests.
4. Run the test suite.
5. Commit changes with a descriptive commit message.
6. Push the feature branch.
7. Open a pull request for review.
8. Merge after approval and successful checks.

## 16. Project Team

Developed as a collaborative Software Engineering Mini-Project.

For contributions, issues, and project discussions, visit the [GitHub Repository](https://github.com/Nandupv10/Smart-Complaint-Management-System).