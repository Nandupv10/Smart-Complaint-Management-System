# Smart Complaint Management System
## Branch Coverage Report

**Project:** Smart Complaint Management System (SCMS)  
**Report:** Branch Coverage Report  
**Test command:** `node --test --experimental-test-coverage`  
**Coverage tool:** Node.js built-in test coverage  
**Scope:** Backend JavaScript files included in the recorded automated test run

---

## 1. Objective

This report records the branch coverage measured during the backend automated test execution. Branch coverage indicates how many decision outcomes (for example, true/false paths of conditional expressions) were exercised by the tests.

## 2. Measurement method

Branch coverage was collected as part of the Node.js built-in test coverage output. The command was executed from the `backend` directory:

```powershell
node --test --experimental-test-coverage
```

The associated test run completed with 92 tests passed and 0 failed.

## 3. Aggregate branch coverage

| Metric | Measured coverage |
|---|---:|
| Aggregate branch coverage | **79.79%** |

## 4. File-wise branch coverage

| Backend file | Branch coverage |
|---|---:|
| `auth.js` | 77.78% |
| `authRoutes.js` | 81.82% |
| `complaintRoutes.js` | 78.51% |
| `constants/complaintConstants.js` | 100% |
| `db.js` | 100% |
| `responseTime.js` | 100% |
| `utils/complaintValidation.js` | 100% |
| **All measured files** | **79.79%** |

## 5. Analysis

- `constants/complaintConstants.js`, `db.js`, `responseTime.js` and `utils/complaintValidation.js` recorded 100% branch coverage.
- `auth.js` recorded 77.78% branch coverage.
- `authRoutes.js` recorded 81.82% branch coverage.
- `complaintRoutes.js` recorded 78.51% branch coverage.
- The aggregate branch coverage for the measured backend files was 79.79%.

A file can have low line coverage and high branch coverage when the limited lines that are executed cover all the decision outcomes measured in that file. Therefore, the 100% branch result for `db.js` does not mean that all of its lines or functions were exercised; its recorded line coverage was 18.75% and function coverage was 0%.

## 6. Relation to NFR06

The baseline NFR06 requires a layered code structure, service-layer unit-test coverage greater than 70%, and zero ESLint errors. The baseline does not state a separate numeric branch-coverage threshold.

The measured aggregate branch coverage is 79.79%. This is reported as an additional test-quality metric and should not be substituted for the specific service-layer coverage or ESLint criteria in NFR06.

## 7. Conclusion

The backend automated test run recorded 79.79% aggregate branch coverage. The constants, database, response-time and complaint-validation modules recorded 100% branch coverage, while the authentication and complaint route files recorded branch coverage between 77.78% and 81.82%.

These results provide branch-level coverage evidence for the executed backend tests. They should be read together with `unit-test-report.md` and `code-coverage-report.md`.

---

**Evidence source:** Branch coverage summary produced by the backend command `node --test --experimental-test-coverage`.
