# Changelog

All notable project changes are recorded in this file. Entries are grouped by project milestone rather than by release date because exact release dates were not recorded in the available project documentation.

## [Unreleased] – Documentation and final submission updates

### Added
- Updated test-case document retaining the baseline test-case identifiers TC01–TC16.
- Unit Test Report documenting the backend automated test execution.
- System Validation Report documenting the available local validation evidence.
- Code Coverage Report with aggregate and file-wise line and function coverage.
- Branch Coverage Report with aggregate and file-wise branch coverage.
- Root README with project overview, features, architecture, setup instructions, database overview, API reference, testing results and documentation links.
- `docs/README.md` as an index for project documentation.

### Test results recorded
- Backend automated test execution: 92 tests passed, 0 failed.
- Aggregate line coverage: 87.23%.
- Aggregate branch coverage: 79.79%.
- Aggregate function coverage: 96.15%.

## Sprint 3 / Completed sprint enhancements

### Added / Updated
- Feedback handling and validation for FR08, including checks for resolved-complaint eligibility and duplicate feedback.
- Privacy and complaint ownership checks documented under NFR05.
- Backend modularity improvements for NFR06, including extraction of shared complaint constants and complaint validation helpers into dedicated modules.

### Verification
- Automated backend test suite includes feedback and privacy-related test files.
- The modular complaint constants and validation helper modules recorded 100% line and function coverage in the reported coverage run.

## Sprint 2

See [Sprint 2 Progress](docs/sprint2-progress.md) for the implementation progress recorded by the project team.

## Sprint 1

See [Sprint 1 Summary](docs/sprint1-summary.md) for the implementation summary recorded by the project team.

## Initial project baseline

The initial project documentation defines the Smart Complaint Management System as a web application for user complaint submission and tracking, with administrative complaint management.

The baseline scope includes:
- Account registration and login.
- Complaint submission and unique complaint identification.
- Complaint status tracking and history.
- Administrative complaint listing, categorization and assignment.
- Status updates and resolution.
- Feedback for resolved complaints.
- Security, privacy, performance, reliability, usability and maintainability requirements.

For the complete baseline requirements, test plan and architecture/design specification, refer to the project's original Software Engineering documentation.

---

**Note:** This changelog summarizes milestones supported by the available project records. It is not a complete commit-by-commit history; use `git log` for the authoritative source-control history.
