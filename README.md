# Job Tracker

Private job-application tracking app with AI-powered analysis and advice.

🌐 **Live:** [tienmai.space/jobtracker](https://tienmai.space/jobtracker)

> Split out of the **tienmai-space** monorepo into a standalone service: own repo, own
> MongoDB cluster, own JWT secret, backend on port 8001 — served under the same domain
> at `/jobtracker` via Nginx.

---

## Overview

- **Tracker board** — Table view with filters (mode, status, month, year) + search, sortable columns, a Reset button. Row text is colour-coded by status. Filter & sort state persists per user across reloads.
- **Profile editor** — Name, title, skills, work experience (month/year dropdowns), education. Resume upload with AI auto-fill.
- **AI Chatbot** — Reads the user's resume + all saved JDs; evaluates job fit honestly (not flattering), calls out gaps, recommends Nên / Không nên / Cân nhắc apply. Vietnamese-first.
- **JT Admin** (`/jobtracker/admin`) — Accessible only to the `admin` account (no second login — reuses the regular token). Manage users, view/edit any user's jobs, choose the AI model.

UI is in Vietnamese; dark theme with orange accent (matches the tienmai.space portfolio).

---

## Tech Stack

### Backend
| Tool | Purpose |
|---|---|
| Python 3 / FastAPI | REST API framework |
| Uvicorn | ASGI server (port 8001) |
| Motor | Async MongoDB driver |
| MongoDB Atlas | Database `jobtracker` (separate cluster) |
| google-genai | Gemini AI (resume import, chat) |
| python-jose | JWT authentication |
| bcrypt | Password hashing |
| pdfplumber / python-docx | Resume + JD text extraction |

### Frontend
| Tool | Purpose |
|---|---|
| React 19 + Vite | UI framework + build (2 entries: app + admin) |
| Google Fonts | Syne + DM Mono |

### Infrastructure
| Tool | Purpose |
|---|---|
| Hostinger VPS (Ubuntu) | Shared with tienmai-space |
| Nginx | Static serving + proxy to port 8001 |
| systemd | `jobtracker.service` |
| GitLab CI/CD | Auto-deploy on push to `main` |

---

## Project Structure

```
job-tracker/
├── main.py                  # FastAPI entry point
├── api.py                   # All API routes (/api/jobtracker/*, /api/jtadmin/*)
├── auth.py                  # JWT auth (jt token + admin = jt token with sub==admin)
├── database.py              # MongoDB operations (db "jobtracker")
├── config.py                # Env var loader
├── requirements.txt
├── .env.example
├── .gitlab-ci.yml           # CI/CD pipeline (deploy on push to main)
├── deploy/
│   ├── jobtracker.service   # systemd unit (port 8001)
│   └── nginx-snippet.conf   # Nginx location blocks
└── frontend/
    ├── index.html           # Job Tracker app entry
    ├── admin.html           # JT Admin entry
    ├── vite.config.js       # 2 entries, base "/jobtracker/"
    └── src/
        ├── main.jsx             # Mounts JobTrackerApp
        ├── admin.jsx            # Mounts JtAdminApp
        ├── index.css            # Dark theme CSS vars
        ├── JobTrackerApp.jsx    # User app router
        ├── JtAdminApp.jsx       # Admin dashboard (Users / Jobs / AI Models)
        └── components/
            ├── jobtracker/      # TrackerPage, JtProfilePage, LoginPage, JobModal,
            │                    # JtChat, MultiSelect, JdViewModal, ResumeViewModal
            └── jtadmin/         # UsersTab, JobsTab, AITab
```

---

## API Routes

### Job Tracker (user JWT)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/jobtracker/login` | Login → JWT |
| GET/PUT | `/api/jobtracker/jobs/{username}` | Get / update job list |
| GET/PUT | `/api/jobtracker/profile/{username}` | Get / update profile |
| GET/POST/DELETE | `/api/jobtracker/resume/{username}` | Resume file management |
| GET | `/api/jobtracker/resume/{username}/check` | Resume exists? |
| GET/DELETE | `/api/jobtracker/chat/{username}/history` | Chat history |
| POST | `/api/jobtracker/chat/{username}` `/file` | AI chat (+ file) |

### JT Admin (admin JWT — `sub == "admin"`)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/jtadmin/users` | List / create users |
| PUT/DELETE | `/api/jtadmin/users/{username}` | Change password / delete |
| GET/PUT | `/api/jtadmin/jobs/{username}` | View / replace jobs |
| GET/PUT | `/api/jtadmin/ai-settings` | Get / set active model |

---

## Environment Variables

```env
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=random_64char_string        # separate from tienmai-space
GEMINI_API_KEY=your_gemini_api_key     # can reuse tienmai-space's key
RESUME_DIR=/root/job-tracker/resumes
```

---

## Local Development

```bash
# Backend
python -m venv job-tracker-venv
source job-tracker-venv/bin/activate    # Windows: job-tracker-venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                     # fill in your values
uvicorn main:app --port 8001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                              # proxies /api/ to http://127.0.0.1:8001
```

> **MongoDB Atlas:** whitelist your local IP under Network Access first.

---

## Deployment

Auto-deploy via GitLab CI/CD. Every push to `main` runs `deploy-job-tracker.sh` on the VPS:

```bash
git pull origin main
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
systemctl restart jobtracker
```

See [SETUP.md](SETUP.md) for full first-time VPS setup (cluster, service, Nginx, admin seed, CI/CD).
