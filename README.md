# Smart Complaint Management System (SCMS)

A centralized web-based complaint management application that allows users to submit and track complaints while enabling administrators to review, categorize, assign, update, and resolve them.

This project was developed as a Software Engineering Mini-Project, applying requirements engineering, architecture and design, iterative development, testing, and project documentation practices.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Objectives](#objectives)
- [Features](#features)
- [Complaint Lifecycle](#complaint-lifecycle)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Database](#database)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing and Quality](#testing-and-quality)
- [Project Documentation](#project-documentation)
- [Repository Structure](#repository-structure)
- [Project Scope and Limitations](#project-scope-and-limitations)

---

## Project Overview

SCMS provides two main user roles:

- **User / Student:** Registers, logs in, submits complaints, tracks complaint status and history, and provides feedback after a complaint is resolved.
- **Administrator:** Views complaints, categorizes and assigns them, updates complaint status, and resolves complaints.

The application centralizes complaint information and provides a traceable workflow from submission through resolution and feedback.

## Problem Statement

Traditional complaint-handling processes can be manual, fragmented, and difficult to track. Users may not know the current status of their complaints, while administrators may find it difficult to organize, assign, and monitor complaints.

SCMS addresses this by providing a centralized web application for complaint submission, administrative handling, status tracking, and post-resolution feedback.

## Objectives

- Provide a centralized complaint submission and management platform.
- Generate a unique identifier for each complaint.
- Allow users to view their complaints and track status history.
- Allow administrators to categorize and assign complaints.
- Enforce valid complaint status transitions.
- Allow feedback only after complaint resolution and prevent duplicate feedback.
- Apply authentication, authorization, and complaint ownership checks.
- Maintain a modular backend structure and automated tests.

## Features

### User features

- User registration and login.
- Complaint submission with title, description, category, and supported attachment handling.
- Unique complaint ID generation.
- Complaint list and complaint details.
- Current status and status-history tracking.
- Feedback rating and optional comment after resolution.

### Administrator features

- Administrator authentication.
- View and manage submitted complaints.
- Filter and categorize complaints.
- Assign complaints to a department.
- Update complaint status through the defined workflow.
- Resolve complaints and provide resolution information.

### Security and reliability features

- JWT-based authentication.
- Role-based authorization.
- Server-side complaint ownership checks.
- Input validation and parameterized database operations.
- Feedback eligibility and duplicate-submission checks.
- Data durability and privacy-related backend tests.
- Separation of shared complaint constants and validation logic into dedicated modules.

---

## Complaint Lifecycle

The intended complaint workflow is:

```text
Submitted
    |
    v
Assigned
    |
    v
In Progress
    |
    v
Resolved
    |
    v
Feedback
```

Status changes are validated by the backend. Invalid transitions are rejected rather than silently applied. Feedback is accepted only for an eligible resolved complaint and duplicate feedback is prevented.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | MySQL |
| API style | REST API with JSON |
| Authentication | JSON Web Tokens (JWT) |
| Testing | Node.js built-in test runner and test coverage |
| Version control | Git and GitHub |
| Development tools | Visual Studio Code, MySQL Workbench, PowerShell |

---

## Architecture

SCMS follows a layered client-server architecture.

```text
+-------------------------------+
|       React Web Client        |
|   User Dashboard / Admin UI   |
+---------------+---------------+
                |
                | REST / JSON
                v
+-------------------------------+
|       Node.js / Express       |
|                               |
|  Routes and Middleware        |
|  Authentication / RBAC        |
|  Complaint Management         |
|  Feedback and Validation      |
|  Shared Constants / Utilities |
+---------------+---------------+
                |
                | Database queries
                v
+-------------------------------+
|          MySQL DB             |
| Users / Complaints / History  |
| Feedback                      |
+-------------------------------+
```

The frontend communicates with the backend through REST endpoints. The backend applies authentication, authorization, validation, and complaint business rules before accessing persistent data.

The architecture and design specification contains the detailed component, sequence, and design views.

---

## Database

The local development database used during project validation is named `scms`.

The following tables were verified in the local MySQL database:

| Table | Purpose |
|---|---|
| `users` | User and administrator account records |
| `complaints` | Complaint information and current state |
| `complaint_status_history` | Complaint status-change history |
| `complaint_feedback` | Feedback submitted for complaints |

Create the database before starting the backend:

```sql
CREATE DATABASE scms;
```

Use the project's database schema / SQL scripts to create the required tables. Do not assume that creating the database alone creates the tables.

---

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js and npm.
- MySQL Server.
- Git.
- A browser such as Chrome, Firefox, or Edge.

### Clone the repository

```bash
git clone https://github.com/Nandupv10/Smart-Complaint-Management-System.git
cd Smart-Complaint-Management-System
```

### Install dependencies

Install backend dependencies:

```bash
cd backend
npm install
```

Then install frontend dependencies from the frontend project directory (the directory containing its `package.json`):

```bash
cd ../frontend
npm install
```

If the frontend directory has a different name in your local checkout, run `npm install` from the directory that contains the frontend `package.json`.

---

## Environment Configuration

Create a `.env` file inside the `backend` directory. Use your own local MySQL credentials and a strong private JWT secret.

Example:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=scms
JWT_SECRET=replace_with_a_long_random_secret
PORT=3000
```

**Important:**

- Replace the placeholder values with your local configuration.
- Never commit `.env` files, passwords, JWT secrets, or other credentials.
- Keep `.env` local and ensure it is excluded through `.gitignore`.
- The database name must match the database created in MySQL.

---

## Running the Application

Run the backend and frontend in separate terminals.

### 1. Start the backend

```powershell
cd backend
npm start
```

The backend health endpoint can be checked at:

```text
http://localhost:3000/health
```

A healthy backend returns a response indicating `status: ok`.

### 2. Start the frontend

From the directory containing the frontend `package.json`, run:

```powershell
npm run dev
```

The local frontend development server used during project validation was:

```text
http://localhost:5173
```

If your frontend package scripts use a different command, follow the scripts defined in that directory's `package.json`.

---

## API Documentation

The backend exposes REST endpoints for authentication and complaint operations. The API reference maintained in this repository is:

- [`docs/api-reference.md`](docs/api-reference.md)

The baseline API design includes operations for:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register an account |
| `POST` | `/api/v1/auth/login` | Authenticate and obtain a token |
| `POST` | `/api/v1/complaints` | Submit a complaint |
| `GET` | `/api/v1/complaints` | List complaints according to the caller's role |
| `GET` | `/api/v1/complaints/{id}` | Retrieve complaint details and history |
| `PATCH` | `/api/v1/complaints/{id}/category` | Update complaint category |
| `PATCH` | `/api/v1/complaints/{id}/assign` | Assign a complaint |
| `PATCH` | `/api/v1/complaints/{id}/status` | Update complaint status |
| `POST` | `/api/v1/complaints/{id}/feedback` | Submit complaint feedback |

Refer to the API reference and backend route implementation for the current request/response formats and route details.

---

## Testing and Quality

### Run backend tests

From the `backend` directory:

```powershell
node --test
```

To run tests and collect coverage:

```powershell
node --test --experimental-test-coverage
```

### Recorded automated test results

The recorded backend test execution produced:

| Metric | Result |
|---|---:|
| Total tests | 92 |
| Passed | 92 |
| Failed | 0 |
| Aggregate line coverage | 87.23% |
| Aggregate branch coverage | 79.79% |
| Aggregate function coverage | 96.15% |

These values represent the recorded backend automated test run. They are not a claim that every planned system, load, usability, backup-restore, or infrastructure security test was executed.

### Test and coverage reports

The detailed reports are available in the `docs/` directory:

- [Updated Test Cases](docs/updated-test-cases.md)
- [Unit Test Report](docs/unit-test-report.md)
- [System Validation Report](docs/system-validation-report.md)
- [Code Coverage Report](docs/code-coverage-report.md)
- [Branch Coverage Report](docs/branch-coverage-report.md)

---

## Project Documentation

The `docs/` directory contains implementation and testing documentation:

| Document | Description |
|---|---|
| [`api-reference.md`](docs/api-reference.md) | Backend API reference |
| [`nfr4-data-durability.md`](docs/nfr4-data-durability.md) | Data durability and NFR04 documentation |
| [`nfr5-privacy-and-https.md`](docs/nfr5-privacy-and-https.md) | Privacy and HTTPS-related documentation |
| [`sprint1-summary.md`](docs/sprint1-summary.md) | Sprint 1 implementation summary |
| [`sprint2-progress.md`](docs/sprint2-progress.md) | Sprint 2 progress |
| [`updated-test-cases.md`](docs/updated-test-cases.md) | Updated test cases |
| [`unit-test-report.md`](docs/unit-test-report.md) | Backend unit test execution results |
| [`system-validation-report.md`](docs/system-validation-report.md) | Available system validation evidence |
| [`code-coverage-report.md`](docs/code-coverage-report.md) | Line and function coverage |
| [`branch-coverage-report.md`](docs/branch-coverage-report.md) | Branch coverage |

The repository also contains the Software Requirements Specification, test planning, architecture and design material, project management evidence, and other coursework deliverables in their respective folders.

---

## Repository Structure

The main implementation and documentation areas are organized as follows:

```text
Smart-Complaint-Management-System/
├── backend/
│   ├── constants/
│   ├── utils/
│   ├── tests/
│   ├── .env                 # Local only; do not commit
│   └── server.js
├── docs/
│   ├── api-reference.md
│   ├── nfr4-data-durability.md
│   ├── nfr5-privacy-and-https.md
│   ├── sprint1-summary.md
│   ├── sprint2-progress.md
│   ├── updated-test-cases.md
│   ├── unit-test-report.md
│   ├── system-validation-report.md
│   ├── code-coverage-report.md
│   └── branch-coverage-report.md
├── README.md
└── ...
```

This is a high-level view of the main backend and documentation areas; other project folders contain the frontend and Software Engineering submission artefacts.

---

## Project Scope and Limitations

The baseline SCMS scope covers account management, complaint lifecycle management, feedback, and administrative handling.

The original requirements document identifies the following as outside the initial scope:

- Email and SMS notifications.
- Native mobile applications.
- Load testing beyond 100 concurrent users.
- Legacy browser support.
- Infrastructure penetration testing.

Refer to the project's requirements and test plan for the complete scope, assumptions, and acceptance criteria.

---

## Contributors

Developed collaboratively as a Software Engineering Mini-Project. Refer to the repository's commit history and project-management artefacts for individual implementation contributions.
