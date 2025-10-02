from fastapi import Depends, HTTPException, status
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

def current_user_id(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)) -> int:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Auth necesar")
    try:
        return decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalid")

def admin_required(user_id: int = Depends(current_user_id), db: Session = Depends(get_db)) -> int:
    user = db.get(User, user_id)
    if not user or not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Necesită admin")
    return user_id
