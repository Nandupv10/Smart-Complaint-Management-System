# SCMS Documentation Index

This folder contains the Software Engineering documentation, implementation notes, API reference, and testing reports for the Smart Complaint Management System (SCMS).

Use this index to navigate the available project documents.

## 1. API and implementation documentation

| Document | Description |
|---|---|
| [API Reference](api-reference.md) | Backend REST API reference and endpoint information. |
| [NFR04 – Data Durability](nfr4-data-durability.md) | Documentation related to the data durability non-functional requirement. |
| [NFR05 – Privacy and HTTPS](nfr5-privacy-and-https.md) | Documentation related to privacy, complaint ownership and HTTPS. |

## 2. Sprint documentation

| Document | Description |
|---|---|
| [Sprint 1 Summary](sprint1-summary.md) | Summary of Sprint 1 work and progress. |
| [Sprint 2 Progress](sprint2-progress.md) | Progress and implementation details recorded for Sprint 2. |

## 3. Testing and validation documents

| Document | Description |
|---|---|
| [Updated Test Cases](updated-test-cases.md) | Updated baseline test cases TC01–TC16, including sprint-related updates. |
| [Unit Test Report](unit-test-report.md) | Backend automated test execution summary. |
| [System Validation Report](system-validation-report.md) | Available evidence from local application and system validation. |
| [Code Coverage Report](code-coverage-report.md) | Aggregate and file-wise line and function coverage results. |
| [Branch Coverage Report](branch-coverage-report.md) | Aggregate and file-wise branch coverage results. |

## 4. Test execution summary

The recorded backend automated test run used:

```powershell
node --test --experimental-test-coverage
```

Recorded results:

| Metric | Result |
|---|---:|
| Total tests | 92 |
| Passed | 92 |
| Failed | 0 |
| Aggregate line coverage | 87.23% |
| Aggregate branch coverage | 79.79% |
| Aggregate function coverage | 96.15% |

These results describe the recorded backend automated test execution. Refer to the individual reports for file-wise coverage, test scope, validation evidence, and limitations.

## 5. Main project documents

The Software Requirements Specification, test plan, architecture and design specification, and other project submission artefacts are maintained in the repository outside this documentation index where applicable.

For a project overview, installation instructions, environment configuration, run commands, and technology stack, see the [root README](../README.md).
