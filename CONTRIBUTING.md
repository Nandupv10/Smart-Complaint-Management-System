# Contributing to Smart Complaint Management System

Thank you for contributing to the Smart Complaint Management System (SCMS).

This guide describes the recommended workflow for making changes, running checks, and submitting work to the repository.

## 1. Before you begin

Ensure that you have:

- Git installed.
- Node.js and npm installed.
- MySQL Server available for local database development.
- The SCMS repository cloned locally.

```bash
git clone https://github.com/Nandupv10/Smart-Complaint-Management-System.git
cd Smart-Complaint-Management-System
```

Install dependencies in the backend and frontend directories:

```bash
cd backend
npm install
```

Then run `npm install` from the directory containing the frontend `package.json`.

Follow the root [README](README.md) for environment configuration and application startup instructions.

## 2. Create a working branch

Avoid making feature changes directly on `main`. Create a branch for the task:

```bash
git checkout main
git pull origin main
git checkout -b feature/short-description
```

Use a descriptive branch name. Examples:

- `feature/complaint-feedback`
- `fix/complaint-validation`
- `docs/update-api-reference`

## 3. Make focused changes

- Keep changes limited to the task being addressed.
- Follow the existing project structure and coding conventions.
- Keep validation and authorization on the server side.
- Avoid committing credentials, tokens, local database files, or generated output.
- Update relevant documentation when behaviour, APIs, configuration, or requirements change.
- Add or update automated tests for changed backend behaviour.

## 4. Run tests

From the `backend` directory, run the automated tests:

```bash
node --test
```

To run tests and collect coverage:

```bash
node --test --experimental-test-coverage
```

Review the output and investigate failures before submitting changes. If a change affects frontend behaviour, also run the frontend using the instructions in the root README and verify the affected workflow.

## 5. Review your changes

Before committing, inspect the working tree and diff:

```bash
git status
git diff
git diff --check
```

Make sure that:
- Only intended files are changed.
- No `.env` file, password, JWT secret, or other sensitive value is staged.
- Tests and relevant checks have been run.
- Documentation reflects the implementation.

## 6. Commit changes

Use clear, descriptive commit messages. Recommended prefixes include:

| Prefix | Use |
|---|---|
| `feat:` | New functionality |
| `fix:` | Bug fix |
| `test:` | Test additions or updates |
| `docs:` | Documentation changes |
| `refactor:` | Code restructuring without intended behaviour change |
| `chore:` | Maintenance and tooling |

Example:

```bash
git add <files-to-include>
git commit -m "feat: add complaint feedback validation"
```

For documentation deliverables that are intended to be reviewed independently, use separate focused commits.

## 7. Push and open a pull request

Push your branch:

```bash
git push -u origin feature/short-description
```

Open a pull request against `main` on GitHub. In the pull request description, include:

- What changed and why.
- Requirements or issue addressed.
- Tests and checks executed, with results.
- Screenshots or API examples when they help reviewers.
- Known limitations or follow-up work.

Do not merge until the change has been reviewed and the required checks have passed.

## 8. Keep your branch up to date

If `main` has advanced while you are working:

```bash
git checkout main
git pull origin main
git checkout feature/short-description
git merge main
```

Resolve any conflicts, rerun the relevant tests, and push the updated branch.

## 9. Reporting issues

When reporting a bug, include:

- A concise description of the problem.
- Steps to reproduce it.
- Expected behaviour and actual behaviour.
- Relevant error messages or logs, with secrets removed.
- Environment details when relevant.

For feature requests, describe the use case and the expected outcome.

---

Thank you for helping improve SCMS.
