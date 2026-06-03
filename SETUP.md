# Setup Guide — Deploy job-tracker on the VPS

This project runs alongside **tienmai-space** on the same Hostinger VPS, served at
`tienmai.space/jobtracker` through the existing Nginx. It has its own backend
(port 8001), its own MongoDB cluster, and its own JWT secret.

> Assumes the VPS, domain, SSL, and Nginx for tienmai-space are already set up.
> See the tienmai-space SETUP.md for base server provisioning.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [MongoDB Atlas (new cluster)](#2-mongodb-atlas-new-cluster)
3. [Clone & Python Setup](#3-clone--python-setup)
4. [Environment Variables](#4-environment-variables)
5. [Build Frontend](#5-build-frontend)
6. [Systemd Service](#6-systemd-service)
7. [Nginx](#7-nginx)
8. [Seed Admin User](#8-seed-admin-user)
9. [GitLab CI/CD](#9-gitlab-cicd)
10. [Verify](#10-verify)

---

## 1. Prerequisites

| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Database (a **separate** cluster from tienmai-space) |
| Google AI Studio | Gemini API key (can reuse tienmai-space's key) |
| GitLab + GitHub | Version control (2 remotes) |

The VPS must already have: Python 3.12, Node.js 20, Nginx, the GitLab Runner, and the
tienmai-space stack running on port 8000.

---

## 2. MongoDB Atlas (new cluster)

1. Create a **new Project** and **M0 free cluster** (independent from tienmai).
2. **Database Access** → add a user with a strong password.
3. **Network Access** → add the **VPS public IP** (and your local IP for migrations).
   - Atlas rejects un-whitelisted IPs with an `SSL: TLSV1_ALERT_INTERNAL_ERROR`.
4. **Connect → Drivers → Python** → copy the connection string.

Database name used by the app: `jobtracker` (created automatically on first write).

---

## 3. Clone & Python Setup

```bash
cd /root
git clone git@gitlab.com:tienking/job-tracker.git job-tracker
cd job-tracker

python3 -m venv job-tracker-venv
source job-tracker-venv/bin/activate
pip install -r requirements.txt

mkdir -p resumes
```

---

## 4. Environment Variables

```bash
cp .env.example .env
nano .env
```

```env
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=generate_a_random_64char_string
GEMINI_API_KEY=your_gemini_api_key
RESUME_DIR=/root/job-tracker/resumes
```

Generate a JWT secret (different from tienmai-space's):
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## 5. Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

Produces `frontend/dist/` with assets pathed under `/jobtracker/` (via `base` in vite.config.js).

---

## 6. Systemd Service

```bash
cp deploy/jobtracker.service /etc/systemd/system/jobtracker.service
systemctl daemon-reload
systemctl enable jobtracker
systemctl start jobtracker
journalctl -u jobtracker -n 30
```

Look for `Application startup complete.` The service binds `127.0.0.1:8001`.

---

## 7. Nginx

Add the location blocks from `deploy/nginx-snippet.conf` to the **HTTPS server block**
of `/etc/nginx/sites-available/tienmai`. Key points:

- `location = /jobtracker/admin` → serve `admin.html`
- `location /jobtracker/` (trailing slash) + `alias /root/job-tracker/frontend/dist/`
  + `try_files $uri $uri/ /jobtracker/index.html` — serves real JS/CSS, falls back to SPA
- `location /api/jobtracker/` and `location /api/jtadmin/` → `proxy_pass http://127.0.0.1:8001`

> Important: the old tienmai-space `location /jobtracker` (pointing at the tienmai dist)
> must be removed — job-tracker now owns this path.

```bash
nginx -t && systemctl reload nginx
```

---

## 8. Seed Admin User

```bash
cd /root/job-tracker
source job-tracker-venv/bin/activate
python3 - <<'EOF'
import asyncio, bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values

db = AsyncIOMotorClient(dotenv_values(".env")["MONGODB_URL"])["jobtracker"]
PASSWORD = "changeme123"   # change this

async def seed():
    hashed = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
    await db["users"].update_one(
        {"username": "admin"},
        {"$set": {"username": "admin", "hashed_password": hashed}},
        upsert=True
    )
    print("Admin seeded.")

asyncio.run(seed())
EOF
```

Log in at `tienmai.space/jobtracker` with `admin` / your password, then change it via the
Admin → Người dùng tab.

---

## 9. GitLab CI/CD

The runner (`tienmai-space-vps`) is shared with tienmai-space; register a dedicated one
for this project if needed:

```bash
gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com" \
  --token "glrt-xxxxxxxx" \
  --executor "shell" \
  --description "job-tracker-vps"
```
(Token from job-tracker → Settings → CI/CD → Runners → New project runner, tag `tienmai-space-vps`.)

Create the deploy script on the VPS:

```bash
cat > /usr/local/bin/deploy-job-tracker.sh <<'EOF'
#!/bin/bash
set -e
cd /root/job-tracker
git pull origin main
source job-tracker-venv/bin/activate
pip install -r requirements.txt --quiet
cd frontend && npm install --silent && npm run build && cd ..
systemctl restart jobtracker
EOF
chmod +x /usr/local/bin/deploy-job-tracker.sh
```

Ensure `gitlab-runner` has passwordless sudo (already set up for tienmai-space):
```bash
grep gitlab-runner /etc/sudoers || echo "gitlab-runner ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers
```

`.gitlab-ci.yml` is in the repo — every push to `main` triggers the pipeline.

---

## 10. Verify

```
□ tienmai.space/jobtracker            → login page loads (dark theme)
□ Login as a normal user              → tracker board loads
□ Add a job, change status, filter, sort, Reset
□ Profile tab: edit + save; upload resume → AI fills fields
□ Chatbot: opens, reads JDs + resume, responds in Vietnamese
□ Login as admin                      → "Admin" button appears in header
□ tienmai.space/jobtracker/admin      → no second login, dashboard loads
□ Users tab: create / change-password / delete
□ Jobs tab: select user, edit JSON, save
□ AI Models tab: switch active model
□ Push to GitLab main → pipeline runs → site updates
```

---

## Useful Commands

```bash
# Logs
journalctl -u jobtracker -f

# Restart
systemctl restart jobtracker

# Rebuild frontend
cd /root/job-tracker/frontend && npm run build

# Nginx
nginx -t && systemctl reload nginx
```
