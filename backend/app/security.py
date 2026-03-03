import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
from dotenv import load_dotenv

load_dotenv()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET")
_PLACEHOLDER_SECRETS = {
    "change-me",
    "change-me-to-a-long-random-string",
    "schimba-asta-cu-un-random-lung",   # BUG-15: placeholder din .env.docker
    "",
}
if not JWT_SECRET or JWT_SECRET in _PLACEHOLDER_SECRETS:
    import secrets
    JWT_SECRET = secrets.token_urlsafe(48)
    import warnings
    warnings.warn(
        "⚠️  JWT_SECRET nu este setat sau folosește valoarea implicită! "
        "Se generează un secret temporar. Setează JWT_SECRET în .env pentru producție!",
        RuntimeWarning, stacklevel=1
    )

JWT_ALG = os.getenv("JWT_ALG", "HS256")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_token(user_id: int) -> str:
    # BUG-24: datetime.utcnow() deprecat in Python 3.12+, inlocuit cu timezone-aware
    payload = {"sub": str(user_id), "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def decode_token(token: str) -> int:
    data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    return int(data["sub"])
