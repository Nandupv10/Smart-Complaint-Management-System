# Smart Complaint Management System
## Unit Test Report

**Project:** Smart Complaint Management System (SCMS)  
**Report:** Unit Test Report  
**Test execution command:** `node --test --experimental-test-coverage`  
**Backend runtime recorded:** Node.js v24.11.0  
**Execution environment:** Windows PowerShell  
**Report scope:** Backend automated test suite

---

## 1. Objective

The objective of this report is to record the results of the backend automated tests executed for SCMS. The tests verify implemented backend behaviour and negative/error paths across authentication, complaint handling, feedback, privacy-related behaviour and supporting modules.

## 2. Test environment

| Item | Environment / value |
|---|---|
| Application | Smart Complaint Management System |
| Test scope | Backend automated tests |
| Runtime | Node.js v24.11.0 |
| Test runner | Node.js built-in test runner (`node:test`) |
| Coverage option | `--experimental-test-coverage` |
| Execution interface | Windows PowerShell |
| Database | MySQL is used by the application; this report records the automated test-run output and does not claim a separate production-database test |

## 3. Test files included

The backend test suite contains the following test files:

- `auth.test.js`
- `authRoutes.test.js`
- `complaintRoutes.test.js`
- `durability.test.js`
- `fr8Feedback.test.js`
- `nfr05Privacy.test.js`
- `responseTime.test.js`

Together, these files exercise authentication and route behaviour, complaint operations, durability-related behaviour, feedback rules, privacy/ownership checks and response-time behaviour.

## 4. Execution procedure

The test suite was executed from the `backend` directory using:

```powershell
node --test --experimental-test-coverage
```

The command runs the Node.js automated tests and prints the test summary and coverage information.

## 5. Test execution summary

| Metric | Result |
|---|---:|
| Total tests | 92 |
| Passed | 92 |
| Failed | 0 |
| Skipped | 0 |
| Cancelled | 0 |
| Todo | 0 |
| Test duration | Approximately 8.97 seconds |

**Result: 92/92 tests passed.**

The automated test run completed with no failed, skipped, cancelled or todo tests.

## 6. Observations

- Authentication and complaint route tests are included in the automated suite.
- Feedback and privacy-related test files are included, corresponding to FR08 and NFR05 work.
- Durability and response-time test files are also included.
- Console messages relating to simulated database failures can appear during negative-path tests. Such messages are expected when tests deliberately exercise failure handling; they do not by themselves indicate that the test run failed.
- The test summary reported zero failures.

## 7. Limitations

This report records the backend automated test execution only. It does not claim that the following separately planned activities were completed:

- Full browser-based Selenium system testing.
- JMeter testing with 100 concurrent virtual users for 10 minutes.
- Usability testing with five first-time users.
- Full database backup-and-restore validation.
- OWASP ZAP baseline scanning or infrastructure penetration testing.

Those activities require separate execution evidence and should be documented in the System Validation Report where applicable.

## 8. Conclusion

The recorded backend automated test execution completed successfully: all 92 tests passed, with zero failures. This provides automated test evidence for the backend functionality covered by the listed test files. The result should be considered alongside the separate system validation and coverage reports for an overall assessment of SCMS.

---

**Evidence source:** Console output from the backend command `node --test --experimental-test-coverage`.
