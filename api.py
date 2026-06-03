from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
from config import GEMINI_API_KEY
from database import (
    get_ai_settings, update_ai_settings, save_message, get_chat_history, delete_chat_history,
    get_all_users, get_user, create_user, update_password, delete_user,
    get_jobs, set_jobs, get_profile, update_profile,
)
from auth import (
    create_jt_token, verify_jt_token,
    create_jtadmin_token, verify_jtadmin_token,
    hash_password, check_password,
)
import asyncio
import os
import io
import re
import json
import base64
import shutil
import docx
import pdfplumber

client = genai.Client(api_key=GEMINI_API_KEY)
router = APIRouter()

RESUME_DIR = os.getenv("RESUME_DIR", "/root/jobtracker/resumes")
os.makedirs(RESUME_DIR, exist_ok=True)

# ── Models ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class PasswordUpdate(BaseModel):
    password: str

class UserCreate(BaseModel):
    username: str
    password: str

class ChatRequest(BaseModel):
    message: str
    session_id: str = "main"
    analyze_context: Optional[str] = None

class JtProfileUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    about: Optional[str] = None
    skills: Optional[List[str]] = None
    experiences: Optional[List[dict]] = None
    educations: Optional[List[dict]] = None

# ── Helpers ────────────────────────────────────────────────────────────────────

def extract_docx_text(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

def extract_pdf_text(source) -> str:
    src = io.BytesIO(source) if isinstance(source, bytes) else source
    with pdfplumber.open(src) as pdf:
        return "\n".join(p.extract_text() or "" for p in pdf.pages).strip()

_STATUS_MAP = {
    "not_applied": "Chưa apply", "applied": "Đã apply", "viewed": "Đã xem CV",
    "downloaded": "Đã tải CV", "interviewing": "Đang phỏng vấn",
    "waiting": "Chờ kết quả", "rejected": "Đã từ chối", "failed": "Rớt",
}
_MAX_JD_CHARS = 3000
_MAX_TOTAL_JD_CHARS = 150000

def build_jt_system_prompt(username: str, jobs: list, resume_exists: bool, profile: dict) -> str:
    active = [j for j in jobs if j.get("status") not in ("rejected", "failed")]
    job_lines = [
        f"{i}. {j.get('title','')} tại {j.get('company','')} | {j.get('loc','')} | {j.get('mode','')} | "
        f"{j.get('month','')}/{j.get('year','')} | {_STATUS_MAP.get(j.get('status',''), j.get('status',''))} | "
        f"{'có JD' if j.get('jd') else 'chưa có JD'}"
        for i, j in enumerate(active, 1)
    ]
    profile_section = ""
    if profile:
        name = profile.get("name") or username
        parts = []
        if profile.get("title"):      parts.append(f"Vị trí mục tiêu: {profile['title']}")
        if profile.get("location"):   parts.append(f"Địa điểm: {profile['location']}")
        if profile.get("about"):      parts.append(f"Giới thiệu: {profile['about']}")
        if profile.get("skills"):     parts.append(f"Kỹ năng: {', '.join(profile['skills'])}")
        if profile.get("experiences"):
            exps = "\n".join(f"  - {e.get('role','')} tại {e.get('company','')} ({e.get('period','')}): {e.get('description','')}" for e in profile["experiences"])
            parts.append(f"Kinh nghiệm:\n{exps}")
        if profile.get("educations"):
            edus = "\n".join(f"  - {e.get('degree','')} tại {e.get('school','')} ({e.get('period','')})" for e in profile["educations"])
            parts.append(f"Học vấn:\n{edus}")
        if parts:
            profile_section = f"\nHồ sơ cá nhân của {name}:\n" + "\n".join(parts) + "\n"
    resume_note = (
        "Resume của người dùng đã được đính kèm trong cuộc trò chuyện này."
        if resume_exists else
        "Người dùng chưa upload resume. Khi phù hợp, nhắc nhở upload resume để được hỗ trợ tốt hơn."
    )
    return f"""Bạn là AI hỗ trợ tìm kiếm việc làm cho {username}. Nhiệm vụ:
- Phân tích danh sách job đã apply, đưa ra nhận xét và thống kê
- Đánh giá JD mới xem có nên apply không, dựa trên resume và hồ sơ người dùng
- So sánh JD với các job đã apply, tránh trùng lặp
- Tư vấn chiến lược tìm việc, cải thiện hồ sơ
Luôn ưu tiên trả lời bằng tiếng Việt. Thân thiện, thực tế và cụ thể.

NGUYÊN TẮC ĐÁNH GIÁ — BẮT BUỘC TUÂN THỦ:
- Đánh giá công tâm, thẳng thắn. Không xu nịnh, không an ủi sáo rỗng.
- Nếu hồ sơ thiếu kỹ năng hoặc kinh nghiệm so với JD, hãy nói rõ ràng.
- Không kết luận "phù hợp" hay "nên apply" khi có khoảng cách rõ ràng giữa hồ sơ và yêu cầu JD.
- Khi đánh giá mức độ phù hợp, ưu tiên các yêu cầu bắt buộc (must-have) của JD.
- Nếu được hỏi "có nên apply không", đưa ra khuyến nghị rõ ràng: Nên / Không nên / Cân nhắc — kèm lý do cụ thể.

⚠️ PHÂN BIỆT QUAN TRỌNG:
- "Danh sách job đã apply" là các công ty/vị trí người dùng ĐÃ NỘP ĐƠN — KHÔNG PHẢI nơi họ đã làm việc.
- Kinh nghiệm làm việc thực tế CHỈ có trong phần "Hồ sơ cá nhân".
{profile_section}
Danh sách {len(jobs)} job đã apply:
{chr(10).join(job_lines) if job_lines else "Chưa có job nào."}

{resume_note}"""

def build_jd_context(jobs: list) -> str:
    parts, total = [], 0
    for i, j in enumerate(jobs, 1):
        if not j.get("jd"):
            continue
        jd_text = j["jd"][:_MAX_JD_CHARS] + ("\n... [bị cắt]" if len(j["jd"]) > _MAX_JD_CHARS else "")
        entry = f"[JD #{i}: {j.get('company','')} — {j.get('title','')}]\n{jd_text}\n"
        if total + len(entry) > _MAX_TOTAL_JD_CHARS:
            parts.append("[Một số JD đã bị bỏ qua do tổng nội dung quá lớn.]")
            break
        parts.append(entry)
        total += len(entry)
    return "\n".join(parts)

# ── JT User: Login ─────────────────────────────────────────────────────────────

@router.post("/api/jobtracker/login")
async def jt_login(data: LoginRequest):
    user = await get_user(data.username)
    if not user or not check_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"access_token": create_jt_token(data.username), "token_type": "bearer", "username": data.username}

# ── JT User: Jobs ──────────────────────────────────────────────────────────────

@router.get("/api/jobtracker/jobs/{username}")
async def jt_get_jobs(username: str, me: str = Depends(verify_jt_token)):
    if me != username:
        raise HTTPException(status_code=403)
    return {"jobs": await get_jobs(username)}

@router.put("/api/jobtracker/jobs/{username}")
async def jt_set_jobs(username: str, jobs: List[Dict[str, Any]], me: str = Depends(verify_jt_token)):
    if me != username:
        raise HTTPException(status_code=403)
    await set_jobs(username, jobs)
    return {"ok": True}

# ── JT User: Profile ───────────────────────────────────────────────────────────

@router.get("/api/jobtracker/profile/{username}")
async def jt_get_profile(username: str, me: str = Depends(verify_jt_token)):
    if me != username:
        raise HTTPException(status_code=403)
    return await get_profile(username)

@router.put("/api/jobtracker/profile/{username}")
async def jt_update_profile(username: str, data: JtProfileUpdate, me: str = Depends(verify_jt_token)):
    if me != username:
        raise HTTPException(status_code=403)
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        await update_profile(username, updates)
    return {"ok": True}

# ── JT User: Resume ────────────────────────────────────────────────────────────

@router.get("/api/jobtracker/resume/{username}/check")
async def jt_resume_check(username: str, me: str = Depends(verify_jt_token)):
    if me != username:
        raise HTTPException(status_code=403)
    return {"exists": os.path.exists(os.path.join(RESUME_DIR, f"{username}.pdf"))}

@router.post("/api/jobtracker/resume/{username}")
async def jt_resume_upload(
    username: str,
    file: UploadFile = File(...),
    do_import: bool = Query(False, alias="import"),
    me: str = Depends(verify_jt_token),
):
    if me != username:
        raise HTTPException(status_code=403)
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    content = await file.read()
    with open(os.path.join(RESUME_DIR, f"{username}.pdf"), "wb") as f:
        f.write(content)
    if not do_import:
        return {"ok": True, "profile": None}
    try:
        resume_text = extract_pdf_text(content)
        ai = await get_ai_settings()
        prompt = (
            "Extract information from this resume and return ONLY valid JSON, no other text:\n"
            '{"name":"full name or null","title":"current or target job title or null","location":"city/country or null",'
            '"email":"email or null","phone":"phone number or null","linkedin":"linkedin URL or null",'
            '"about":"copy the EXACT summary / profile / about section verbatim from the resume, preserving all details — do NOT summarize; null if not present",'
            '"skills":["skill1","skill2"],'
            '"experiences":[{"role":"job title","company":"company name","period":"MMM YYYY · MMM YYYY or MMM YYYY · Present","description":"copy EXACT bullet points verbatim"}],'
            '"educations":[{"degree":"degree name","school":"school name","period":"date range"}]}'
            "\n\nResume:\n" + resume_text
        )
        response = client.models.generate_content(
            model=ai["active_model"],
            contents=[types.Content(role="user", parts=[types.Part(text=prompt)])]
        )
        raw = re.sub(r"^```(?:json)?\s*", "", response.text.strip()).rstrip("` \n")
        profile_data = {k: v for k, v in json.loads(raw).items() if v is not None}
        return {"ok": True, "profile": profile_data}
    except Exception as e:
        print(f"Resume import error: {e}")
        return {"ok": True, "profile": None}

@router.get("/api/jobtracker/resume/{username}")
async def jt_resume_get(username: str, me: str = Depends(verify_jt_token)):
    if me != username:
        raise HTTPException(status_code=403)
    path = os.path.join(RESUME_DIR, f"{username}.pdf")
    if not os.path.exists(path):
        raise HTTPException(status_code=404)
    return FileResponse(path, media_type="application/pdf")

@router.delete("/api/jobtracker/resume/{username}")
async def jt_resume_delete(username: str, me: str = Depends(verify_jt_token)):
    if me != username:
        raise HTTPException(status_code=403)
    path = os.path.join(RESUME_DIR, f"{username}.pdf")
    if os.path.exists(path):
        os.remove(path)
    return {"ok": True}

# ── JT User: Chat ──────────────────────────────────────────────────────────────

@router.get("/api/jobtracker/chat/{username}/history")
async def jt_chat_history(username: str, me: str = Depends(verify_jt_token)):
    if me != username:
        raise HTTPException(status_code=403)
    history = await get_chat_history(f"jt_{username}_main", limit=60)
    return {"messages": [{"role": "assistant" if m["role"] == "model" else m["role"], "content": m["content"]} for m in history]}

@router.delete("/api/jobtracker/chat/{username}/history")
async def jt_clear_chat(username: str, me: str = Depends(verify_jt_token)):
    if me != username:
        raise HTTPException(status_code=403)
    await delete_chat_history(f"jt_{username}_main")
    return {"ok": True}

@router.post("/api/jobtracker/chat/{username}")
async def jt_chat(username: str, request: ChatRequest, me: str = Depends(verify_jt_token)):
    if me != username:
        raise HTTPException(status_code=403)
    sid = f"jt_{username}_{request.session_id}"
    jobs, profile = await asyncio.gather(get_jobs(username), get_profile(username))
    resume_path = os.path.join(RESUME_DIR, f"{username}.pdf")
    resume_exists = os.path.exists(resume_path)
    system_prompt = build_jt_system_prompt(username, jobs, resume_exists, profile)
    ai = await get_ai_settings()
    await save_message(sid, "user", request.message)
    history = await get_chat_history(sid, limit=20)
    contents = []
    if resume_exists:
        resume_text = extract_pdf_text(resume_path)
        contents += [
            types.Content(role="user", parts=[types.Part(text=f"Đây là resume của tôi:\n\n{resume_text}")]),
            types.Content(role="model", parts=[types.Part(text="Đã đọc resume của bạn.")]),
        ]
    jd_ctx = build_jd_context(jobs)
    if jd_ctx:
        contents += [
            types.Content(role="user", parts=[types.Part(text=f"Đây là toàn bộ JD của các job tôi đã apply:\n\n{jd_ctx}")]),
            types.Content(role="model", parts=[types.Part(text="Đã đọc toàn bộ JD.")]),
        ]
    for msg in history[:-1]:
        contents.append(types.Content(role=msg["role"], parts=[types.Part(text=msg["content"])]))
    contents.append(types.Content(role="user", parts=[types.Part(text=request.analyze_context or request.message)]))
    response = client.models.generate_content(
        model=ai["active_model"], contents=contents,
        config=types.GenerateContentConfig(system_instruction=system_prompt, temperature=0.2)
    )
    await save_message(sid, "model", response.text)
    return {"reply": response.text}

@router.post("/api/jobtracker/chat/{username}/file")
async def jt_chat_file(
    username: str,
    message: str = Form(default=""),
    session_id: str = Form(default="main"),
    file: UploadFile = File(...),
    me: str = Depends(verify_jt_token),
):
    if me != username:
        raise HTTPException(status_code=403)
    sid = f"jt_{username}_{session_id}"
    jobs, profile = await asyncio.gather(get_jobs(username), get_profile(username))
    resume_path = os.path.join(RESUME_DIR, f"{username}.pdf")
    resume_exists = os.path.exists(resume_path)
    system_prompt = build_jt_system_prompt(username, jobs, resume_exists, profile)
    ai = await get_ai_settings()
    file_bytes = await file.read()
    filename = file.filename.lower()
    display = message or "Hãy phân tích JD này và cho biết tôi có nên apply không."
    await save_message(sid, "user", f"[File: {file.filename}] {display}")
    history = await get_chat_history(sid, limit=18)
    contents = []
    if resume_exists:
        resume_text = extract_pdf_text(resume_path)
        contents += [
            types.Content(role="user", parts=[types.Part(text=f"Đây là resume của tôi:\n\n{resume_text}")]),
            types.Content(role="model", parts=[types.Part(text="Đã đọc resume của bạn.")]),
        ]
    jd_ctx = build_jd_context(jobs)
    if jd_ctx:
        contents += [
            types.Content(role="user", parts=[types.Part(text=f"Đây là toàn bộ JD:\n\n{jd_ctx}")]),
            types.Content(role="model", parts=[types.Part(text="Đã đọc toàn bộ JD.")]),
        ]
    for msg in history[:-1]:
        contents.append(types.Content(role=msg["role"], parts=[types.Part(text=msg["content"])]))
    if filename.endswith(".pdf"):
        current_parts = [types.Part(text=f"Nội dung file ({file.filename}):\n\n{extract_pdf_text(file_bytes)}\n\n{display}")]
    elif filename.endswith(".docx"):
        current_parts = [types.Part(text=f"Nội dung file ({file.filename}):\n\n{extract_docx_text(file_bytes)}\n\n{display}")]
    elif filename.endswith(".txt"):
        current_parts = [types.Part(text=f"Nội dung file ({file.filename}):\n\n{file_bytes.decode('utf-8', errors='ignore')}\n\n{display}")]
    else:
        return {"reply": "Chỉ hỗ trợ file PDF, Word (.docx) và Text (.txt)."}
    contents.append(types.Content(role="user", parts=current_parts))
    response = client.models.generate_content(
        model=ai["active_model"], contents=contents,
        config=types.GenerateContentConfig(system_instruction=system_prompt)
    )
    await save_message(sid, "model", response.text)
    return {"reply": response.text}

# ── JT Admin: Login ────────────────────────────────────────────────────────────

@router.post("/api/jtadmin/login")
async def jtadmin_login(data: LoginRequest):
    if data.username != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    user = await get_user("admin")
    if not user or not check_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"access_token": create_jtadmin_token("admin"), "token_type": "bearer"}

# ── JT Admin: User Management ──────────────────────────────────────────────────

@router.get("/api/jtadmin/users")
async def jtadmin_list_users(_: str = Depends(verify_jtadmin_token)):
    return await get_all_users()

@router.post("/api/jtadmin/users")
async def jtadmin_create_user(data: UserCreate, _: str = Depends(verify_jtadmin_token)):
    if await get_user(data.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    await create_user(data.username, hash_password(data.password))
    return {"ok": True}

@router.put("/api/jtadmin/users/{username}")
async def jtadmin_update_password(username: str, data: PasswordUpdate, _: str = Depends(verify_jtadmin_token)):
    if not await get_user(username):
        raise HTTPException(status_code=404, detail="User not found")
    await update_password(username, hash_password(data.password))
    return {"ok": True}

@router.delete("/api/jtadmin/users/{username}")
async def jtadmin_delete_user(username: str, _: str = Depends(verify_jtadmin_token)):
    if username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin")
    if not await get_user(username):
        raise HTTPException(status_code=404, detail="User not found")
    await delete_user(username)
    return {"ok": True}

# ── JT Admin: Jobs Management ──────────────────────────────────────────────────

@router.get("/api/jtadmin/jobs/{username}")
async def jtadmin_get_jobs(username: str, _: str = Depends(verify_jtadmin_token)):
    return {"jobs": await get_jobs(username)}

@router.put("/api/jtadmin/jobs/{username}")
async def jtadmin_set_jobs(username: str, jobs: List[Dict[str, Any]], _: str = Depends(verify_jtadmin_token)):
    if not await get_user(username):
        raise HTTPException(status_code=404, detail="User not found")
    await set_jobs(username, jobs)
    return {"ok": True}

# ── JT Admin: AI Settings ──────────────────────────────────────────────────────

class AISettingsUpdate(BaseModel):
    active_model: Optional[str] = None
    available_models: Optional[List[str]] = None

@router.get("/api/jtadmin/ai-settings")
async def jtadmin_get_ai_settings(_: str = Depends(verify_jtadmin_token)):
    return await get_ai_settings()

@router.put("/api/jtadmin/ai-settings")
async def jtadmin_update_ai_settings(data: AISettingsUpdate, _: str = Depends(verify_jtadmin_token)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    await update_ai_settings(updates)
    return {"ok": True}
