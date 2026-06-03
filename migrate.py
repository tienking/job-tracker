"""
One-time migration: copy Job Tracker data from the old tienmai cluster
to the new jobtracker cluster.

Run on the VPS (both clusters whitelist the VPS IP):

    cd /root/job-tracker
    source job-tracker-venv/bin/activate
    python3 migrate.py

Reads:
  - NEW MONGODB_URL from /root/job-tracker/.env  (target: db "jobtracker")
  - OLD MONGODB_URL from /root/tienmai-bot/.env   (source: db "tienmai")

Safe to re-run: uses upsert by key. Does NOT overwrite the seeded "admin" user.
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values

NEW_URL = dotenv_values("/root/job-tracker/.env").get("MONGODB_URL")
OLD_URL = dotenv_values("/root/tienmai-bot/.env").get("MONGODB_URL")

if not NEW_URL or not OLD_URL:
    raise SystemExit("Missing MONGODB_URL in one of the .env files")

old = AsyncIOMotorClient(OLD_URL)["tienmai"]
new = AsyncIOMotorClient(NEW_URL)["jobtracker"]


async def copy_users():
    docs = await old["jobtracker_users"].find({}).to_list(length=None)
    n = 0
    for d in docs:
        d.pop("_id", None)
        username = d.get("username")
        if username == "admin":
            continue  # keep the freshly seeded admin password
        await new["users"].update_one({"username": username}, {"$set": d}, upsert=True)
        n += 1
    print(f"users: {n} migrated (admin skipped)")


async def copy_jobs():
    docs = await old["jobtracker_jobs"].find({}).to_list(length=None)
    for d in docs:
        d.pop("_id", None)
        await new["jobs"].update_one({"username": d.get("username")}, {"$set": d}, upsert=True)
    print(f"jobs: {len(docs)} migrated")


async def copy_profiles():
    docs = await old["jobtracker_profiles"].find({}).to_list(length=None)
    for d in docs:
        d.pop("_id", None)
        await new["profiles"].update_one({"username": d.get("username")}, {"$set": d}, upsert=True)
    print(f"profiles: {len(docs)} migrated")


async def copy_chat():
    # Only Job Tracker chat sessions (session_id like jt_<user>_*)
    docs = await old["chat_history"].find({"source": "jobtracker"}).to_list(length=None)
    if not docs:
        # fallback: match by session_id prefix if source wasn't tagged
        docs = await old["chat_history"].find({"session_id": {"$regex": "^jt_"}}).to_list(length=None)
    # wipe target chat first to avoid duplicates on re-run
    await new["chat_history"].delete_many({})
    for d in docs:
        d.pop("_id", None)
    if docs:
        await new["chat_history"].insert_many(docs)
    print(f"chat_history: {len(docs)} migrated")


async def copy_ai_settings():
    doc = await old["settings"].find_one({"type": "ai"}, {"_id": 0})
    if doc:
        await new["settings"].update_one({"type": "ai"}, {"$set": doc}, upsert=True)
        print(f"ai settings: migrated (active_model={doc.get('active_model')})")
    else:
        print("ai settings: none found in old DB")


async def main():
    await copy_users()
    await copy_jobs()
    await copy_profiles()
    await copy_chat()
    await copy_ai_settings()
    print("\nMigration complete.")


if __name__ == "__main__":
    asyncio.run(main())
