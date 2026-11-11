# Smart Complaint Management System
## Updated Test Case Document

**Document:** SCMS Updated Test Cases  
**Baseline:** *Smart Complaint Management System: Software Requirements, Test Plan, and Architecture & Design Specification*  
**Baseline Test Plan ID:** SCMS-TP-1.0  
**Version:** 1.1  
**Purpose:** Update the original test cases to reflect the completed sprint changes while retaining the original test-case identifiers and requirement traceability.

---

## 1. Scope and update approach

The baseline document defines 16 test cases, TC01–TC16, covering FR01–FR08, NFR01–NFR06 and SR1–SR6. This update retains those identifiers and their original intent.

The completed sprint work particularly affects:

- **FR08 – Feedback:** feedback validation, one-feedback-per-complaint enforcement and resolved-complaint eligibility.
- **NFR05 – Privacy:** server-side complaint ownership checks and protection against access to another user's complaint.
- **NFR06 – Maintainability:** extraction of shared complaint constants and validation logic into separate modules, reducing coupling in complaint routes.

The updated cases below clarify the expected checks for these areas. A test is marked as executed only where execution evidence is available in the project test results. The full-system browser, usability, load, backup-restore and infrastructure security tests must not be treated as executed solely on the basis of the backend automated test run.

## 2. Updated test cases

| Test Case | Requirement | Type | Test description / input | Expected result |
|---|---|---|---|---|
| TC01 | FR01 | Functional | Register using a new email and valid password; attempt registration again with the same email. | First registration succeeds; duplicate email is rejected. |
| TC02 | FR01 | Functional | Log in using valid user credentials and valid administrator credentials. | Authentication succeeds and the correct role/dashboard is returned. |
| TC03 | FR02 | Functional – BVA | Submit complaints using title lengths of 100 and 101 characters and attachments at 5.0 MB and 5.1 MB. | Inputs within the specified limits are accepted; inputs exceeding the limits are rejected. |
| TC04 | FR02, FR03 | Functional | Submit two valid complaints sequentially. | Both complaints are saved and receive distinct IDs in the required `CMP-YYYY-NNNNNN` format. |
| TC05 | FR04 | Functional | Open a complaint after it has moved through Assigned and In Progress states. | The owner sees the current status and timestamped status history. |
| TC06 | FR05, FR06, SR6 | Functional / Security | Admin filters complaints, changes a category and assigns a complaint to a department. | The complaint list reflects the filter; category and assignment are saved; the status/history and applicable audit information are updated. |
| TC07 | FR07 | Functional – State transition | Admin performs valid status transitions and attempts an invalid transition such as Resolved → Submitted. | Valid transitions are saved; invalid transitions are rejected and do not change the complaint status. |
| **TC08 (updated)** | **FR08** | **Functional – BVA / Negative** | Submit feedback for a resolved complaint with a valid rating (1–5); attempt a second feedback submission; attempt feedback on an unresolved complaint; submit an out-of-range rating. | One valid feedback entry is accepted. Duplicate feedback and feedback before resolution are rejected. Ratings outside 1–5 are rejected. Optional comment length is validated against the specified limit. |
| TC09 | NFR01, SR2, SR3 | Security | Attempt an administrator-only action with a user token; call a protected API without a token or with an expired token. | Role violations are denied; missing or expired authentication is rejected; no unauthorised data is modified. |
| **TC10 (updated)** | **NFR05, SR3** | **Security / Privacy** | User A requests the details of a complaint owned by User B. Also verify that a user can access their own complaint while another user's complaint remains inaccessible. | The owner can access their own complaint. Cross-user access is denied (the documented design specifies 404) and does not disclose the other user's complaint data. |
| TC11 | SR1, SR4 | Security | Enter an incorrect password five consecutive times, then attempt another login; inspect stored password values. | The account is locked according to the specified lockout policy; stored passwords are bcrypt hashes, not plaintext. |
| TC12 | SR5, SR6 | Security | Submit SQL-injection and script-like input; test HTTP-to-HTTPS redirection and perform the planned security scan. | Inputs are safely handled; transport uses HTTPS as specified; scan results meet the baseline test plan's acceptance criteria. |
| TC13 | NFR03 | Performance | Run the planned JMeter workload with 100 concurrent virtual users for 10 minutes using the specified track/submit/login distribution. | 95th-percentile response time is below 2 seconds and error rate is below 1%. |
| TC14 | NFR04 | Reliability | Interrupt the API during a submission, restart it and perform the planned database backup-restore verification. | Incomplete writes are rolled back; committed data remains intact; backup restoration succeeds. |
| TC15 | NFR02 | Usability | Ask five first-time users to submit and track a complaint without training. | Each user completes submission within 3 minutes and reaches main tasks within the specified click limit. |
| **TC16 (updated)** | **NFR06** | **Maintainability** | Inspect the backend layering and extracted modules. Verify that complaint constants and validation helpers are maintained separately from route handling. Run the backend automated tests with coverage; run the project's lint check if configured. | Shared constants and validation logic are separated into reusable modules; route handling consumes those modules; automated tests pass; service-layer coverage and lint results are assessed against the NFR06 targets. |

## 3. Sprint-related clarification

### 3.1 TC08 – Feedback (FR08)

The original feedback scenario is retained and made more explicit. Verification must cover:
- Rating boundary: 1 through 5.
- Feedback is permitted only after the complaint is Resolved.
- A complaint can have only one feedback entry from its owner.
- Optional comment length is validated against the requirement.

### 3.2 TC10 – Privacy (NFR05)

The original cross-user access test is retained. The test must verify both sides of the ownership rule: the owner can access their complaint, while a different user cannot access it. The expected denial must not expose complaint details.

### 3.3 TC16 – Maintainability (NFR06)

The original maintainability test is updated to reflect the modularity work. The backend now separates shared complaint constants and complaint validation helpers into dedicated modules, rather than keeping all such logic inside the complaint route implementation.

The baseline NFR06 acceptance criteria remain:
- Layered/modular code structure.
- Service-layer unit-test coverage greater than 70%.
- Zero ESLint errors.

Coverage figures in the separate Code Coverage and Branch Coverage Reports must be used when assessing coverage. A successful automated test run alone does not establish that the ESLint criterion has passed.

## 4. Available automated test execution evidence

The backend automated test run recorded for this project used:

```powershell
node --test --experimental-test-coverage
```

Recorded result:

- Tests: **92**
- Passed: **92**
- Failed: **0**
- Skipped/cancelled/todo: **0**

The aggregate coverage reported by that run was:

- Line coverage: **87.23%**
- Branch coverage: **79.79%**
- Function coverage: **96.15%**

These figures describe the measured backend test run. They do not, by themselves, establish completion of the separately planned Selenium system tests, JMeter load tests, five-user usability tests, backup-restore exercise, or OWASP ZAP scan. Those activities require their own execution evidence in the corresponding reports.

## 5. Traceability

| Requirement | Baseline test case(s) |
|---|---|
| FR01 | TC01, TC02 |
| FR02 | TC03, TC04 |
| FR03 | TC04 |
| FR04 | TC05 |
| FR05 | TC06 |
| FR06 | TC06 |
| FR07 | TC07 |
| FR08 | TC08 |
| NFR01 | TC09 |
| NFR02 | TC15 |
| NFR03 | TC13 |
| NFR04 | TC14 |
| NFR05 | TC10 |
| NFR06 | TC16 |
| SR1, SR4 | TC11 |
| SR2, SR3 | TC09, TC10 |
| SR5, SR6 | TC06, TC12 |

---

**Document note:** This is an update to the original test-case specification, not a claim that every planned test has been executed. Execution outcomes and supporting evidence belong in the Unit Test, System Validation, Code Coverage and Branch Coverage Reports.
