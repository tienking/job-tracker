# Job Tracker

Private job application tracking app with AI-powered analysis and advice.

---

## Overview

A full-stack SaaS app for tracking job applications, built as a standalone service.

- **Tracker board** — Table view with filters (mode, status, month, year), sortable columns, search. Filter & sort state persists per user across reloads.
- **Profile editor** — Name, title, skills, work experience, education. Resume upload with AI auto-fill.
- **AI Chatbot** — Reads resume + all JDs; evaluates job fit honestly, calls out skill gaps, recommends Nên / Không nên / Cân nhắc apply.
- **Admin dashboard** — Manage users (create, delete, change password) and view/edit jobs. Accessible only to the `admin` account.

---

## Tech Stack

### Backend
| Tool | Purpose |
|---|---|
| Python 3 / FastAPI | REST API framework |
| Motor | Async MongoDB driver |
| MongoDB Atlas | Database |
| google-genai | Gemini AI (resume import, chat, JD analysis) |
| python-jose | JWT authentication |
| bcrypt | Password hashing |
| pdfplumber | PDF text extraction |
| python-docx | Word document parsing |
| Uvicorn | ASGI server |

### Frontend
| Tool | Purpose |
|---|---|
| React 19 + Vite | UI framework + build tool |
| Google Fonts | Syne + DM Mono typography |

---

## Project Structure

```
job-tracker/
├── main.py              # FastAPI entry point
├── api.py               # All API routes
├── auth.py              # JWT auth (user + admin tokens)
├── database.py          # MongoDB operations
├── config.py            # Env var loader
├── requirements.txt
├── .env.example
├── deploy/
│   ├── jobtracker.service   # systemd service (port 8001)
│   └── nginx-snippet.conf   # Nginx location blocks
└── frontend/
    ├── index.html           # Job Tracker SPA entry
    ├── admin.html           # JT Admin SPA entry
    ├── vite.config.js
    └── src/
        ├── main.jsx             # Mounts JobTrackerApp
        ├── admin.jsx            # Mounts JtAdminApp
        ├── index.css            # Dark theme CSS vars
        ├── JobTrackerApp.jsx    # App router
        ├── JtAdminApp.jsx       # Admin dashboard
        └── components/
            ├── jobtracker/      # TrackerPage, JtProfilePage, LoginPage,
            │                    # JobModal, JtChat, MultiSelect, ...
            └── jtadmin/         # LoginPage, UsersTab, JobsTab
```

---

## API Routes

### Job Tracker (user JWT required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/jobtracker/login` | Login, returns JWT |
| GET/PUT | `/api/jobtracker/jobs/{username}` | Get / update job list |
| GET/PUT | `/api/jobtracker/profile/{username}` | Get / update profile |
| GET/POST/DELETE | `/api/jobtracker/resume/{username}` | Resume file management |
| GET | `/api/jobtracker/resume/{username}/check` | Check if resume exists |
| GET/DELETE | `/api/jobtracker/chat/{username}/history` | Chat history |
| POST | `/api/jobtracker/chat/{username}` | AI chat |
| POST | `/api/jobtracker/chat/{username}/file` | AI chat with file |

### JT Admin (admin JWT required — username must be `admin`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/jtadmin/login` | Admin login |
| GET | `/api/jtadmin/users` | List all users |
| POST | `/api/jtadmin/users` | Create user |
| PUT | `/api/jtadmin/users/{username}` | Change password |
| DELETE | `/api/jtadmin/users/{username}` | Delete user |
| GET/PUT | `/api/jtadmin/jobs/{username}` | View / replace jobs |

---

## Environment Variables

```env
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=generate_a_random_64char_string
GEMINI_API_KEY=your_gemini_api_key
RESUME_DIR=/root/job-tracker/resumes
```

Generate a JWT secret:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## Local Development

```bash
# Backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in your values

SKIP_WEBHOOK=1 uvicorn main:app --port 8001   # Linux/Mac
# Windows PowerShell:
$env:SKIP_WEBHOOK="1"; python -m uvicorn main:app --port 8001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # proxies /api/ to http://127.0.0.1:8001
```

> **MongoDB Atlas:** add your local IP to Network Access whitelist before running.

---

## Deployment (VPS)

### 1. Clone & Setup

```bash
cd /root
git clone git@gitlab.com:tienking/job-tracker.git job-tracker
cd job-tracker

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

mkdir -p resumes
cp .env.example .env
nano .env   # fill in all values
```

### 2. Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Systemd Service

```bash
cp deploy/jobtracker.service /etc/systemd/system/jobtracker.service
systemctl daemon-reload
systemctl enable jobtracker
systemctl start jobtracker
systemctl status jobtracker
```

Verify startup:
```bash
journalctl -u jobtracker -n 30
# Look for: Application startup complete.
```

### 4. Nginx

Add the contents of `deploy/nginx-snippet.conf` to your existing Nginx server block, then:

```bash
nginx -t
systemctl reload nginx
```

### 5. Seed Admin User

Run once to create the `admin` account:

```bash
source venv/bin/activate
python3 - <<'EOF'
import asyncio, os, bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
db = client["jobtracker"]

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

Then log in at `yourdomain/jobtracker` with username `admin` and change the password via the Admin dashboard.

---

## CI/CD

Uses GitLab CI/CD with a self-hosted runner on the VPS.

```yaml
# .gitlab-ci.yml (add to repo)
stages:
  - deploy

deploy:
  stage: deploy
  tags:
    - job-tracker-vps
  only:
    - master
  script:
    - sudo /usr/local/bin/deploy-job-tracker.sh
```

Deploy script (`/usr/local/bin/deploy-job-tracker.sh`):
```bash
#!/bin/bash
set -e
cd /root/job-tracker
git pull origin master
source venv/bin/activate
pip install -r requirements.txt --quiet
cd frontend && npm install --silent && npm run build && cd ..
systemctl restart jobtracker
```
