# NFR04 — Reliable Storage of Information / Data Durability

## Requirements and traceability

The SRS states that SCMS shall “reliably store user and complaint information” (item 12). The Requirements Traceability Matrix identifies this as **NFR04: Reliable storage of information**, applicable to Complaint Management, with the check that complaint data is stored correctly. The test-plan document gives the measurable requirement:

> No committed complaint data shall be lost: all writes are transactional, availability >=99% per month, daily backups kept for 7 days.

The test-plan architecture maps NFR04 to the DAL and MySQL for Complaint Management write APIs. Its **TC14** procedure is: stop the API server during submission and restart it; restore the database from a daily backup. Its expected result is: partial rows rolled back, committed data intact, and successful restore.

## Implementation mapping

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Atomic complaint/user writes | `backend/schema.sql` explicitly uses InnoDB for `users` and `complaints`. Existing write endpoints are each one parameterised SQL statement, so InnoDB makes each successful statement atomic; no unnecessary multi-statement transaction was introduced. | `backend/durability.test.js` |
| No partial multi-step writes | There are no current multi-statement complaint operations in this repository. Any future operation that writes related rows must acquire one pool connection, call `beginTransaction`, commit after every write succeeds, roll back in `catch`, and release in `finally`. Rollback errors must be logged without replacing the original error. | Code-review requirement before adding such an operation |
| Daily backups, seven-day retention | `scripts/backup-database.ps1` creates UTC-timestamped SQL backups, checks `mysqldump` and output success, then removes only expired, script-named backups. | Node durability test and PowerShell safety smoke test |

### Transaction design and failure handling

`complaintRoutes.js`, registration, login lockout changes, category updates, and deletes currently issue one SQL write each. A transaction around one independent statement would add a connection lifecycle without making the statement more atomic. InnoDB's statement atomicity is therefore relied on for the current implementation.

If a future feature writes a complaint plus an assignment, feedback, or audit row, it must use the same connection for all of those statements. On any failure it must roll back, return the existing endpoint's safe error response, and release the connection in `finally`. This is necessary to meet TC14's “partial rows rolled back” expectation for a multi-write operation.

## Backups

### Prerequisites and secure configuration

Install MySQL client tools so `mysqldump.exe` is on `PATH`, or set `MYSQLDUMP_PATH` to its full path. The backup account needs at least the privileges needed to read the SCMS schema (typically `SELECT`, `SHOW VIEW`, `TRIGGER`, and `EVENT`; include routine access when routines are used). Do not use a database administrator account for scheduled backups.

Create a protected option file outside the repository, for example `C:\SCMS\secrets\backup-client.cnf`:

```ini
[client]
host=127.0.0.1
port=3306
user=scms_backup
password=replace-with-a-secret-not-stored-in-git
```

Restrict that file to the Windows account running the scheduled task. Set these environment variables for that account (or pass the equivalent script parameters):

```powershell
[Environment]::SetEnvironmentVariable('DB_NAME', 'scms', 'User')
[Environment]::SetEnvironmentVariable('SCMS_BACKUP_DIR', 'C:\SCMS\backups', 'User')
[Environment]::SetEnvironmentVariable('SCMS_MYSQL_DEFAULTS_FILE', 'C:\SCMS\secrets\backup-client.cnf', 'User')
[Environment]::SetEnvironmentVariable('MYSQLDUMP_PATH', 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe', 'User')
```

Open a new PowerShell session after setting user-level variables, then run:

```powershell
PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1
```

The script uses `--defaults-extra-file`; it does not put the password in source, logs, or a command-line password argument. Do not add the option file, backups, or a `.env` containing credentials to Git.

### Retention and failure behaviour

Each file is named `scms-<database>-yyyyMMddTHHmmssZ.sql`; the timestamp is UTC. After a verified non-empty dump, the script deletes only files in the configured output directory whose names exactly match `scms-[A-Za-z0-9_]+-yyyyMMddTHHmmssZ.sql` and whose `LastWriteTimeUtc` is older than seven days. Other files, including similarly located arbitrary `.sql` files, are not eligible.

The script exits non-zero and reports a clear error for missing configuration, missing client tools, inaccessible output folders, an unsuccessful dump, or an empty dump. A failed dump's newly-created partial output is removed. Retention cleanup failures are also reported as failure so operators can investigate; the successfully written backup is left in place.

### Windows Task Scheduler (manual setup; not installed by this change)

1. Confirm the manual command above creates a non-empty backup while signed in as the planned task account.
2. Open **Task Scheduler** → **Create Task**. Choose the dedicated account and configure it to run whether the user is logged on or not.
3. On **Triggers**, create a daily trigger at the desired time.
4. On **Actions**, choose *Start a program*: Program/script: `PowerShell.exe`; Add arguments: `-NoProfile -ExecutionPolicy Bypass -File "D:\Sem-5\SW\SCMS-remote-check\scripts\backup-database.ps1"`; Start in: `D:\Sem-5\SW\SCMS-remote-check`.
5. Ensure that account can read the option file, execute `mysqldump`, and write the backup directory. Do not put a password in Task Scheduler arguments.
6. Run the task once using **Run**, then inspect **Last Run Result** (`0x0` indicates success) and the timestamped backup file. Enable task history to diagnose scheduling failures.

For “mysqldump not found,” set `MYSQLDUMP_PATH`. For access denied, check the task account's NTFS permissions and MySQL backup-account grants. For an empty/failed dump, run the same command interactively as that account and inspect the script's error without exposing credentials.

## Backup verification and safe restoration

1. Confirm the script exited `0` and the new `scms-*.sql` file exists and is non-empty (`Get-Item <path>`).
2. For a lightweight syntax/integrity check, review the dump for expected `CREATE`/`INSERT` statements. The authoritative check is a restore into an isolated database.
3. Create a separate local test database, never the shared/development database: `mysql --defaults-extra-file=C:\SCMS\secrets\backup-client.cnf -e "CREATE DATABASE scms_restore_test"`.
4. Restore into it: `mysql --defaults-extra-file=C:\SCMS\secrets\backup-client.cnf scms_restore_test < C:\SCMS\backups\scms-scms-<timestamp>.sql`. The script does not use `--databases`, so this command targets the isolated test database. Do not redirect it at shared data.
5. In the isolated target, query `complaints` and its related `users`, verify a known complaint ID and its user relationship, then drop the isolated database only when it is no longer needed.

A real MySQL restore was not executed in this repository because no isolated MySQL instance or credentials were supplied.

## TC14 procedure and status

**Automated coverage completed:** InnoDB table configuration and backup-script safety/retention rules are covered by `backend/durability.test.js`. The existing complaint-route tests cover a database error returning HTTP 500 without a successful complaint response. The PowerShell smoke test checks rejected configuration without invoking `mysqldump`, then exercises retention isolation with a fake successful client; it does not perform a real MySQL backup or restore.

**Manual TC14 still required:**

1. Start a disposable local SCMS database and the API with the normal environment variables.
2. Submit one complaint; query it by `complaint_id` and record it as the committed control record.
3. During a separate submission, stop the API process before its request completes; restart the API. Check that the control record remains. For any future multi-write submission, inject a failure after its first write and check that no related partial row remains.
4. Run the backup script, verify the exit status and non-empty file, and restore it only into a disposable isolated MySQL instance as described above.
5. Confirm the control complaint and related user are present after restore.

This manual procedure has **not been run** here: no live isolated MySQL server, credentials, scheduled task, or safe process-interruption test environment was available. Written steps are not a passed manual test.

If a request reaches MySQL and commits but the client loses the response (for example, API interruption), the client must treat the outcome as uncertain and look up the complaint before retrying. SCMS does not currently provide idempotency keys; automatically retrying a submission could create a duplicate complaint.

## Restart, recovery, and availability limits

An API restart does not reset the schema or erase committed rows: `backend/server.js` creates a pool and mounts routes, but it does not run schema DDL. If a process stops before a single statement completes, MySQL either commits that statement or does not; for future multi-write transactions it must commit all related writes or roll them back. An API restart cannot recover a lost or corrupted database: recovery requires a valid backup and a tested restore.

The >=99% monthly availability target is an operational SLO, not something this repository can demonstrate. Measure it as `(total minutes - unplanned unavailable minutes) / total minutes * 100` for the API and its required database, using independent health checks and recorded incidents. Meeting or verifying it additionally requires production deployment redundancy, MySQL durability/replication and monitoring choices, alerting, backup-restore drills, and operational ownership. This change adds no fabricated uptime result and a backup alone does not guarantee availability.

## Commands and actual results

Run from `backend`:

```powershell
npm test
```

Run the safe backup configuration smoke test from repository root:

```powershell
PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\backup-database.tests.ps1
```

Actual verification on 2 November 2026:

- `npm test`: **38 passed, 0 failed**. This includes the existing authentication, complaint-route, and response-time tests plus the two NFR04 tests.
- `PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\backup-database.tests.ps1`: **passed**. It intentionally prints two configuration errors while confirming that missing option files and unsafe database names fail safely, then uses a fake client to verify that retention removes only an expired backup for the current database while preserving another database's backup and an unrelated SQL file. No real MySQL backup or restore was performed.

Full backup creation, task scheduling, interruption, and restoration require the manual prerequisites above.
