from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .security import decode_token
from .database import SessionLocal
from .models import User

auth_scheme = HTTPBearer(auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
) -> int:
    # SEC-01: citim tokenul din cookie HttpOnly mai întâi (frontend web cu credentials: 'include')
    # Dacă nu există cookie, fallback la Authorization: Bearer (Swagger UI / API clients externi)
    token = request.cookies.get("auth_token")
    if not token and credentials:
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Auth necesar")
    try:
        return decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalid")

def admin_required(user_id: int = Depends(current_user_id), db: Session = Depends(get_db)) -> int:
    user = db.get(User, user_id)
    if not user or not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Necesită admin")
    return user_id
