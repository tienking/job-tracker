"""Seed / reset the Job Tracker admin account. Run on the VPS:

    cd /root/job-tracker
    source job-tracker-venv/bin/activate
    python3 seed_admin.py
"""
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values

PASSWORD = "changeme123"   # change here if you want a different password

MONGODB_URL = dotenv_values("/root/job-tracker/.env").get("MONGODB_URL")
db = AsyncIOMotorClient(MONGODB_URL)["jobtracker"]


async def run():
    hashed = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
    await db["users"].update_one(
        {"username": "admin"},
        {"$set": {"username": "admin", "hashed_password": hashed}},
        upsert=True,
    )
    print("Admin seeded OK")
    users = await db["users"].find({}, {"_id": 0, "hashed_password": 0}).to_list(length=None)
    print("Users in DB:", [u.get("username") for u in users])


if __name__ == "__main__":
    asyncio.run(run())
