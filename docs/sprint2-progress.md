# Sprint 2 Progress

## Project
Smart Complaint Management System (SCMS)

## Sprint Period
26 October 2026 – 30 October 2026

## Continuous Integration
GitHub Actions is configured to run on pushes to main and pull requests targeting main.

## Automated Testing
The CI workflow executes the complaint route regression test using Node.js.

## Completed Features
- **FR6 - Assign Complaints to Person or Department**:
  - Enhanced database schema (`schema.sql`) to store assigned department, assigned staff/person, assignment timestamp, and `'assigned'` complaint status.
  - Implemented `PATCH /complaints/:id/assign` endpoint with RBAC allowing only administrators to assign complaints.
  - Enhanced `GET /complaints` endpoint with `assignmentStatus` filtering (`assigned` vs `awaiting`/`unassigned`).
  - Added full test coverage for FR6 assignment logic, authorization rules, and status filtering in `complaintRoutes.test.js`.
  - Added frontend support for complaint assignment badges, admin assign modal, assignment status filters, and dashboard metrics.

## Remaining Work
- Implement and test assigned Sprint 2 backlog items.
- Review and merge pull requests.
- Record the two-minute product demonstration.
- Complete project documentation before the sprint ends.
