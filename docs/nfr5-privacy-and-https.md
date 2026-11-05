# NFR05 — Privacy and Data Protection

## 1. Specification and Traceability

### Exact Requirement

> **NFR05 – Privacy:**  
> "A complaint and its owner's personal data shall be visible only to that owner and to administrators; data shall travel only over HTTPS."

### Project Traceability Matrix

| Document | Section / ID | Specification | Implementation Mapping |
|---|---|---|---|
| **Software Requirements Specification (SRS)** | Section II.D, Item 13 | "The system should ensure privacy and protection of user data." | Server-side ownership verification; zero leakage of another user's complaint data. |
| **SRS – External Interfaces** | Section II.E | "Communication: HTTPS (TLS 1.2 or higher) only." | Nginx TLS 1.2+ termination, HTTP-to-HTTPS 301 redirect, Express HTTPS middleware. |
| **SRS – Security Requirements** | SR3 | "RBAC and ownership checks shall be enforced server-side on every request." | `requireAuth` JWT middleware and Complaint Service ownership validation. |
| **SRS – Security Requirements** | SR6 | "Transport: Nginx terminates TLS 1.2+ and redirects HTTP to HTTPS." | `nginx/scms.conf` with port 80 redirect and port 443 TLS 1.2/1.3. |
| **Test Plan** | TC10 | "User A requests GET /complaints/{id} for a complaint owned by User B. Expected: 404 returned; response contains no field of B's complaint." | `GET /complaints/:id` returns 404 on ownership mismatch. |
| **Test Plan** | TC12 | "Plain HTTP request ... HTTP redirects to HTTPS via 301." | Nginx port 80 301 redirect and Express `ENFORCE_HTTPS` middleware. |
| **Architecture Specification** | Table VI & Section IV.C | `GET /api/v1/complaints/{id}` (Role: Owner/Admin) for details and history. | `GET /complaints/:id`, `GET /complaints/:id/history`, `GET /complaints/:id/feedback`. |

---

## 2. Architecture and Data Flow

The project architecture specifies a multi-tier structure:

```text
Browser Client
     │ (HTTPS / TLS 1.2+)
     ▼
Nginx Reverse Proxy (:80 -> :443 301 Redirect; :443 TLS Termination)
     │ (HTTP loopback with X-Forwarded-Proto: https)
     ▼
Node.js / Express API (:3000)
     │ (Pooled connection, parameterized SQL)
     ▼
MySQL Database (:3306 InnoDB)
```

1. **Browser Client:** Requests travel exclusively over HTTPS.
2. **Nginx Reverse Proxy:** Terminate TLS (supporting only TLS 1.2 and TLS 1.3), redirects any plain HTTP port 80 request to HTTPS via 301, injects security headers (including HSTS), and forwards requests to Express with `X-Forwarded-Proto`, `Host`, and `X-Real-IP`.
3. **Express Application:** Authenticates the caller via signed HS256 JWT, extracts the caller ID and role from the cryptographically verified token payload (`req.user.id`, `req.user.role`), and enforces owner-based access control.
4. **Data Access Layer:** Queries MySQL using parameterized SQL, restricting query criteria by `user_id = ?` for non-administrators.

---

## 3. Owner-Based Privacy Protection Implementation

### 3.1 Authenticated Identity Enforcement

- **Never Trust Client-Supplied User IDs:** The backend never extracts or trusts `userId`, `user_id`, or `email` from query parameters (`req.query`) or request bodies (`req.body`) when evaluating permissions or recording records.
- **JWT Identity:** The authenticated user identity is extracted strictly by `requireAuth` from the cryptographically verified JWT payload (`req.user = { id: payload.sub, role: payload.role }`).

### 3.2 Access Rules by Role

| Operation | Regular User | Administrator | Unauthenticated |
|---|---|---|---|
| `GET /complaints` | Returns only complaints owned by caller (`WHERE user_id = ?`) | Returns all complaints across all users | HTTP 401 Unauthorized |
| `GET /complaints/:id` | Returns details, status history, and feedback **only if caller is the owner**. Returns **404** if owned by another user. | Returns details, status history, feedback, and owner email for any complaint. | HTTP 401 Unauthorized |
| `GET /complaints/:id/history` | Returns audit history only if caller is owner. Returns **404** if owned by another user. | Returns audit history for any complaint. | HTTP 401 Unauthorized |
| `GET /complaints/:id/feedback` | Returns feedback only if caller is owner. Returns **404** if owned by another user. | Returns feedback for any complaint. | HTTP 401 Unauthorized |
| `POST /complaints/:id/feedback` | Allowed only for owner after complaint reaches `resolved`. | Only if administrator owns the complaint. | HTTP 401 Unauthorized |
| `DELETE /complaints/:id` | Allowed only for own complaints. Returns 404 if not found or not owned. | Allowed for any complaint. | HTTP 401 Unauthorized |
| `PATCH /complaints/:id/*` | HTTP 403 Forbidden | Allowed | HTTP 401 Unauthorized |

### 3.3 Return 404 on Unauthorized Complaint Access (TC10)

When User A attempts to access a complaint belonging to User B (e.g. by modifying the UUID in `/complaints/:id`, `/complaints/:id/history`, or `/complaints/:id/feedback`):
- The server performs an ownership check: `req.user.role !== 'admin' && String(complaint.user_id) !== String(req.user.id)`.
- If the caller is not the owner and not an administrator, the server responds with **HTTP 404 Not Found** (`{ "error": "Complaint not found." }`).
- **Privacy Assurance:** Returning 404 instead of 403 prevents resource enumeration and leaks zero information about whether User B's complaint exists, its title, status, history, feedback, or personal user data.

---

## 4. HTTPS and TLS 1.2+ Configuration

### 4.1 Nginx Reverse Proxy Configuration (`nginx/scms.conf`)

The production Nginx configuration file is maintained at [`nginx/scms.conf`](../nginx/scms.conf):

1. **HTTP to HTTPS Redirection (Port 80):**
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name _;

       location /.well-known/acme-challenge/ {
           root /var/www/certbot;
       }

       location / {
           return 301 https://$host$request_uri;
       }
   }
   ```
2. **TLS 1.2+ Enforcement (Port 443):**
   ```nginx
   server {
       listen 443 ssl http2;
       listen [::]:443 ssl http2;
       server_name _;

       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
       ssl_prefer_server_ciphers on;

       ssl_certificate /etc/ssl/certs/scms.crt;
       ssl_certificate_key /etc/ssl/private/scms.key;

       add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-Frame-Options "DENY" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "strict-origin-when-cross-origin" always;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

### 4.2 Application Defense-in-Depth (`backend/server.js`)

- `app.set('trust proxy', 1);` enables Express to inspect proxy headers (`X-Forwarded-Proto`).
- In production, when `ENFORCE_HTTPS=true` is set, any request arriving without TLS or with `X-Forwarded-Proto: http` is redirected to HTTPS via HTTP 301.

### 4.3 Secrets, Certificates, and Private Key Git Hygiene

- Root [`.gitignore`](../.gitignore) and [`backend/.gitignore`](../backend/.gitignore) ignore:
  - `*.key` (private keys)
  - `*.pem` (certificate and private key bundles)
  - `*.crt` and `*.cert` (certificates)
  - `*.pfx` and `*.p12` (PKCS certificates)
  - `.env` and `.env.*` (environment secrets)
  - `secrets/` (local secrets directories)
- Certificates and private keys must never be committed to Git.

---

## 5. Production Deployment Guide (Ubuntu 22.04 LTS)

Follow these steps to deploy SCMS with full HTTPS termination in production:

### Step 1: Install Nginx and Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Install Node.js 20 and Deploy Backend

```bash
# Clone repository
git clone https://github.com/Nandupv10/Smart-Complaint-Management-System.git /var/www/scms
cd /var/www/scms/backend

# Configure production environment variables in /var/www/scms/backend/.env
# (Ensure permissions are 600, owner: scms user)
sudo chown -R scms:scms /var/www/scms
sudo chmod 600 /var/www/scms/backend/.env

# Install backend dependencies
npm ci --production
```

### Step 3: Obtain a Trusted CA Certificate via Let's Encrypt

```bash
# Obtain automated TLS certificates for your domain
sudo certbot --nginx -d complaints.university.edu
```

Certbot places the certificate at `/etc/letsencrypt/live/complaints.university.edu/fullchain.pem` and the private key at `/etc/letsencrypt/live/complaints.university.edu/privkey.pem`.

### Step 4: Configure and Enable Nginx

Copy `nginx/scms.conf` to `/etc/nginx/sites-available/scms.conf`, update `server_name` with your production domain, and set the certificate paths:

```bash
sudo cp /var/www/scms/nginx/scms.conf /etc/nginx/sites-available/scms.conf
sudo ln -s /etc/nginx/sites-available/scms.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Verify syntax and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Start Backend with Systemd or Process Manager

Create `/etc/systemd/system/scms-backend.service`:

```ini
[Unit]
Description=SCMS Node.js Backend API
After=network.target mysql.service

[Service]
Type=simple
User=scms
WorkingDirectory=/var/www/scms/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=ENFORCE_HTTPS=true

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now scms-backend
```

---

## 6. Automated Verification and Test Suite

Automated verification for NFR05 is located at [`backend/nfr05Privacy.test.js`](../backend/nfr05Privacy.test.js).

### Test Case Results

| Test ID | Description | Specification | Result |
|---|---|---|---|
| **Test 1** | User A requests a complaint belonging to User B | HTTP 404; no data or fields of B's complaint returned (TC10) | **PASS** |
| **Test 2** | User A requests their own complaint | HTTP 200 with complaint details, status history, and feedback | **PASS** |
| **Test 3** | Administrator requests any complaint | HTTP 200 with complaint details, status history, and owner email | **PASS** |
| **Test 4** | Unauthenticated user requests private complaint information | HTTP 401 across details, history, feedback, and list endpoints | **PASS** |
| **Test 5** | User A attempts to access User B's complaint history | HTTP 404; access denied without exposing history | **PASS** |
| **Test 6** | User A attempts to access User B's feedback or personal information | HTTP 404; access denied without exposing feedback | **PASS** |
| **Test 7** | Tampering attempts (query parameters, request bodies, IDs) | Access denied; server strictly uses authenticated JWT identity | **PASS** |
| **Test 8** | HTTP-to-HTTPS redirect, TLS 1.2+ configuration, Git hygiene | Port 80 301 redirect, TLS 1.2/1.3, HSTS header, secrets ignored | **PASS** |
| **Test 9** | Invalid complaint ID format validation | HTTP 400 across all NFR05 endpoints | **PASS** |
| **Test 10** | Non-existent complaint ID | HTTP 404 Complaint not found | **PASS** |
| **Test 11** | Database failure handling | HTTP 500 without leaking database internals | **PASS** |

### Regression Test Results

- Total tests: 92
- Passed: 92 (81 existing FR01–FR08/NFR01–NFR04 tests + 11 NFR05 tests)
- Failed: 0
- Skipped / Cancelled: 0

---

## 7. Verification Scope and Deployment Limitations

### What Was Tested and Verified

1. Server-side owner-only privacy controls (`GET /complaints/:id`, `GET /complaints/:id/history`, `GET /complaints/:id/feedback`).
2. TC10 requirement: User A querying User B's complaint receives HTTP 404 with no fields of User B's data returned.
3. Administrator privilege to inspect complaints, status history, and owner personal information.
4. HTTP 401 rejection for unauthenticated requests.
5. Immunity against query parameter and request body identity tampering.
6. Nginx configuration syntax, TLS 1.2+ restrictions, port 80 301 redirect, and HSTS headers.
7. Git ignore rules for certificates, private keys, and environment files.
8. Express-level HTTPS redirection when `ENFORCE_HTTPS=true`.

### What Requires Production Deployment

- **Public CA TLS Certificate:** A genuine public CA certificate (e.g. Let's Encrypt) can only be issued and validated on a publicly resolvable DNS domain with live port 80/443 traffic during deployment.
- **Production TLS Termination:** Full end-to-end TLS handshake verification between browser and production server must occur on the target Ubuntu/Nginx production host. Local testing verified the Nginx configuration rules and application HTTPS enforcement. Localhost HTTP functionality does not substitute for production TLS termination.
