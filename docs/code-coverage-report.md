# Smart Complaint Management System
## Code Coverage Report

**Project:** Smart Complaint Management System (SCMS)  
**Report:** Code Coverage Report  
**Test command:** `node --test --experimental-test-coverage`  
**Coverage tool:** Node.js built-in test coverage  
**Scope:** Backend JavaScript files included in the recorded automated test run

---

## 1. Objective

This report records the line and function coverage measured during the backend automated test execution. It identifies the extent to which the executed tests exercised the backend source files.

## 2. Measurement method

Coverage was collected using Node.js's built-in test coverage option. The command was run from the `backend` directory:

```powershell
node --test --experimental-test-coverage
```

The test execution completed with 92 tests passed and 0 failed.

## 3. Aggregate coverage results

| Coverage metric | Measured coverage |
|---|---:|
| Line coverage | **87.23%** |
| Function coverage | **96.15%** |

The aggregate line coverage is above the 70% threshold specified for service-layer coverage in NFR06. However, the reported aggregate includes all measured backend files, not only service-layer files. Therefore, it should not be interpreted as a standalone measurement of service-layer-only coverage.

## 4. File-wise coverage

| Backend file | Line coverage | Function coverage |
|---|---:|---:|
| `auth.js` | 86.26% | 100% |
| `authRoutes.js` | 92.57% | 100% |
| `complaintRoutes.js` | 87.92% | 100% |
| `constants/complaintConstants.js` | 100% | 100% |
| `db.js` | 18.75% | 0% |
| `responseTime.js` | 100% | 100% |
| `utils/complaintValidation.js` | 100% | 100% |
| **All measured files** | **87.23%** | **96.15%** |

## 5. Analysis

- `constants/complaintConstants.js`, `responseTime.js` and `utils/complaintValidation.js` achieved 100% line and function coverage in the recorded run.
- `authRoutes.js` achieved 92.57% line coverage and 100% function coverage.
- `complaintRoutes.js` achieved 87.92% line coverage and 100% function coverage.
- `auth.js` achieved 86.26% line coverage and 100% function coverage.
- `db.js` achieved 18.75% line coverage and 0% function coverage. Database pool initialization and related code paths were not substantially exercised by the automated tests in this run. This low value is retained as measured rather than excluded or estimated.

## 6. Relation to NFR06

The baseline NFR06 specifies a layered code structure, service-layer unit-test coverage greater than 70%, and zero ESLint errors.

The recorded aggregate line coverage is 87.23%. Since the available coverage summary is an aggregate across the measured backend files, a separate service-layer-only percentage cannot be asserted from these figures. ESLint results are also not established by the coverage command.

The modularity work includes dedicated modules for complaint constants and validation helpers. Both recorded 100% line and function coverage.

## 7. Conclusion

The backend automated test run recorded 87.23% aggregate line coverage and 96.15% aggregate function coverage. Coverage was 100% for the complaint constants, complaint validation helper and response-time modules. The database module had comparatively low coverage (18.75% line and 0% function), which is explicitly reported for transparency.

Branch coverage is documented separately in `branch-coverage-report.md`.

---

**Evidence source:** Coverage summary produced by the backend command `node --test --experimental-test-coverage`.
