# Files cần xóa khỏi tienmai-space sau khi deploy jobtracker

Sau khi jobtracker đã chạy ổn định trên VPS, xóa các file sau khỏi repo tienmai-space:

## Frontend — xóa hoàn toàn
- `frontend/jobtracker.html`
- `frontend/src/jobtracker.jsx`
- `frontend/src/JobTrackerApp.jsx`
- `frontend/src/components/jobtracker/` (toàn bộ thư mục)

## Frontend — chỉnh sửa
- `frontend/vite.config.js` → xóa entry `jobtracker: resolve(__dirname, "jobtracker.html")`
- `frontend/src/components/admin/AdminApp.jsx` → xóa import JobTrackerTab + tab "jobtracker"
- `frontend/src/components/admin/tabs/JobTrackerTab.jsx` → xóa file

## Backend — xóa các route trong api.py
Xóa toàn bộ section "Job Tracker" (từ dòng `# ── Job Tracker ───`) bao gồm:
- `POST /api/jobtracker/login`
- `GET/PUT /api/jobtracker/jobs/{username}`
- `GET/POST/PUT/DELETE /api/jobtracker/resume/{username}`
- `GET/PUT /api/jobtracker/profile/{username}`
- `GET/DELETE/POST/POST /api/jobtracker/chat/{username}/*`
- `GET/POST/PUT/DELETE /api/admin/jobtracker/*`

Và xóa các import liên quan:
- `get_jobtracker_users, get_jobtracker_user, create_jobtracker_user,`
  `update_jobtracker_password, delete_jobtracker_user,`
  `get_jobtracker_jobs, set_jobtracker_jobs, get_jt_profile, update_jt_profile`
- `create_jobtracker_token, verify_jobtracker_token`
- Classes: `JobTrackerLoginRequest, JobTrackerPasswordUpdate, JobTrackerUserCreate, JtProfileUpdate`
- Functions: `build_jt_system_prompt, build_jd_context`

## Backend — xóa khỏi database.py
- `jobtracker_users_col`, `jobtracker_jobs_col`, `jobtracker_profiles_col`
- Tất cả functions `get_jobtracker_*`, `create_jobtracker_*`, `update_jobtracker_*`,
  `delete_jobtracker_*`, `get_jt_profile`, `update_jt_profile`, `get_jobtracker_jobs`, `set_jobtracker_jobs`

## Backend — xóa khỏi auth.py
- `create_jobtracker_token`
- `verify_jobtracker_token`

## Nginx (VPS) — cập nhật
- Xóa `location /api/admin/jobtracker/` khỏi port 8000 block
- Xóa `location /api/jobtracker/` khỏi port 8000 block (đã chuyển sang 8001)
- Xóa `location /jobtracker` khỏi port 8000 block (đã chuyển sang dist mới)
- Áp dụng nginx-snippet.conf từ repo jobtracker

## gitignore tienmai-space — xóa
- Không cần thay đổi .gitignore
