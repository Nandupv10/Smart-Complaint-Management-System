# Smart Complaint Management System
## System Validation Report

**Project:** Smart Complaint Management System (SCMS)  
**Report:** System Validation Report  
**Application:** React frontend, Node.js/Express backend and MySQL database  
**Validation environment:** Local Windows development environment  
**Purpose:** Record the available system-level validation evidence for the completed project.

---

## 1. Objective

The objective of system validation is to confirm that the major SCMS components can be started and that the application is accessible in the local development environment. This report records the checks for which results are available and distinguishes them from broader system tests for which detailed evidence was not supplied.

## 2. System under validation

The application consists of:

1. **Frontend:** React web application.
2. **Backend:** Node.js/Express API server.
3. **Database:** MySQL database named `scms`.

The frontend is accessed locally at `http://localhost:5173`, and the backend health endpoint is available at `http://localhost:3000/health`.

## 3. Validation environment

| Component | Recorded environment |
|---|---|
| Operating environment | Windows development machine |
| Backend runtime | Node.js v24.11.0 |
| Frontend local URL | `http://localhost:5173` |
| Backend health URL | `http://localhost:3000/health` |
| Database | Local MySQL |
| Database name | `scms` |

The backend uses local environment configuration. Credentials and secrets are intentionally not reproduced in this report.

## 4. Validation checks and results

| ID | Validation check | Expected result | Recorded result | Status |
|---|---|---|---|---|
| SV01 | Start backend server and access `/health`. | Backend responds successfully and reports healthy status. | The health endpoint returned a response with `status: ok`. | Pass |
| SV02 | Start frontend and open the local application. | Application page loads in the browser. | The frontend opened at `http://localhost:5173` and rendered the CampusCare student dashboard. | Pass |
| SV03 | Inspect the visible student dashboard and complaint form. | Main dashboard interface and complaint form are rendered. | Dashboard and form were visible; the user confirmed that the frontend was working. | Pass |
| SV04 | Verify local MySQL database and required tables. | Database exists and the application's tables are present. | Database `scms` and the tables `complaint_feedback`, `complaint_status_history`, `complaints` and `users` were verified in MySQL Workbench. | Pass |
| SV05 | Run backend automated test suite. | Automated tests complete without failures. | 92 tests passed and 0 failed using `node --test --experimental-test-coverage`. | Pass |
| SV06 | Broader end-to-end website verification by project teammates. | Team verifies the implemented website workflows. | The project team reported that full website verification had already been performed. Detailed test logs and individual scenario outcomes were not provided for this report. | Team-reported; detailed evidence not attached |

## 5. Backend automated test result

The backend automated suite was executed from the `backend` directory:

```powershell
node --test --experimental-test-coverage
```

Recorded summary:

| Metric | Result |
|---|---:|
| Total tests | 92 |
| Passed | 92 |
| Failed | 0 |
| Skipped / cancelled / todo | 0 |
| Duration | Approximately 8.97 seconds |

The detailed test execution summary is documented separately in `unit-test-report.md`. Coverage measurements are documented in the Code Coverage and Branch Coverage Reports.

## 6. Database validation

The local MySQL database `scms` was inspected using MySQL Workbench. The following tables were confirmed to exist:

- `complaint_feedback`
- `complaint_status_history`
- `complaints`
- `users`

This check confirms the presence of these tables in the local database. It is not, by itself, evidence of a complete backup-and-restore test or validation of every database constraint and transaction scenario.

## 7. Limitations and outstanding evidence

The following planned checks are not marked as independently passed in this report because detailed execution evidence was not available:

- Selenium end-to-end test logs for all user and administrator workflows.
- JMeter execution results for 100 concurrent users over 10 minutes.
- Timed usability results from five first-time users.
- Database interruption and backup-restore test evidence.
- OWASP ZAP scan output and infrastructure-level HTTPS verification.

The baseline test plan also excludes loads above 100 concurrent users, legacy browsers and infrastructure penetration testing.

## 8. Conclusion

The available evidence confirms that the local backend health endpoint responded successfully, the frontend dashboard and complaint form rendered in the browser, the expected local MySQL tables were present, and the backend automated test suite completed with 92 passing tests and no failures.

The project team also reported completing broader website verification. Since detailed logs for those team-run scenarios were not supplied, this report identifies that result as team-reported rather than presenting unsupported individual test outcomes. The outstanding activities listed above should be supported with separate logs or screenshots if they are required for formal evaluation.

---

**Evidence basis:** Local execution results and confirmations recorded during project validation. No database credentials, tokens or secrets are included.
