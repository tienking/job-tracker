from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import JWT_SECRET

ALGORITHM = "HS256"
security = HTTPBearer()

# ── Job Tracker user token (7 days) ───────────────────────────────────────────

def create_jt_token(username: str) -> str:
    payload = {"sub": username, "type": "jobtracker", "exp": datetime.utcnow() + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

def verify_jt_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "jobtracker":
            raise HTTPException(status_code=401, detail="Invalid token")
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# ── JT Admin: reuse the regular jobtracker token, require sub == "admin" ──────

def verify_jtadmin_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "jobtracker":
            raise HTTPException(status_code=401, detail="Invalid token")
        username = payload.get("sub")
        if username != "admin":
            raise HTTPException(status_code=403, detail="Access denied")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())
