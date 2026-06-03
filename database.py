from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URL
from datetime import datetime

client = AsyncIOMotorClient(MONGODB_URL)
db = client["jobtracker"]

chat_col      = db["chat_history"]
users_col     = db["users"]
jobs_col      = db["jobs"]
profiles_col  = db["profiles"]
settings_col  = db["settings"]

# --- AI Settings ---
async def get_ai_settings():
    doc = await settings_col.find_one({"type": "ai"}, {"_id": 0})
    if not doc:
        return {"active_model": "gemini-2.0-flash", "available_models": ["gemini-2.0-flash"]}
    return {
        "active_model": doc.get("active_model", "gemini-2.0-flash"),
        "available_models": doc.get("available_models", []),
    }

async def update_ai_settings(updates: dict):
    await settings_col.update_one({"type": "ai"}, {"$set": updates}, upsert=True)

# --- Users ---
async def get_all_users():
    cursor = users_col.find({}, {"_id": 0, "hashed_password": 0})
    return await cursor.to_list(length=None)

async def get_user(username: str):
    return await users_col.find_one({"username": username}, {"_id": 0})

async def create_user(username: str, hashed_password: str):
    await users_col.insert_one({
        "username": username,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
    })

async def update_password(username: str, hashed_password: str):
    await users_col.update_one({"username": username}, {"$set": {"hashed_password": hashed_password}})

async def delete_user(username: str):
    await users_col.delete_one({"username": username})
    await jobs_col.delete_one({"username": username})
    await profiles_col.delete_one({"username": username})

# --- Jobs ---
async def get_jobs(username: str):
    doc = await jobs_col.find_one({"username": username}, {"_id": 0})
    return doc.get("jobs", []) if doc else []

async def set_jobs(username: str, jobs: list):
    await jobs_col.update_one(
        {"username": username},
        {"$set": {"jobs": jobs, "updated_at": datetime.utcnow()}},
        upsert=True,
    )

# --- Profiles ---
async def get_profile(username: str) -> dict:
    doc = await profiles_col.find_one({"username": username}, {"_id": 0})
    return doc or {}

async def update_profile(username: str, data: dict):
    await profiles_col.update_one(
        {"username": username},
        {"$set": {**data, "username": username, "updated_at": datetime.utcnow()}},
        upsert=True,
    )

# --- Chat ---
async def save_message(session_id: str, role: str, content: str):
    await chat_col.insert_one({
        "session_id": session_id,
        "role": role,
        "content": content,
        "created_at": datetime.utcnow(),
    })

async def get_chat_history(session_id: str, limit: int = 20):
    cursor = chat_col.find({"session_id": session_id}, sort=[("created_at", 1)]).limit(limit)
    return await cursor.to_list(length=limit)

async def delete_chat_history(session_id: str):
    await chat_col.delete_many({"session_id": session_id})
