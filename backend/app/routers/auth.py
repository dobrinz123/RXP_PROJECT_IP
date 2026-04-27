from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..models import User
from ..schemas import UserCreate, UserLogin, UserOut
from ..security import hash_password, verify_password, create_token
from ..deps import current_user_id, get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email folosit")
    user = User(email=payload.email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login")
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Date incorecte")
    token = create_token(user.id)
    # SEC-01: stocam tokenul in cookie HttpOnly — inaccesibil din JavaScript (protectie XSS)
    # secure=True obligatoriu in productie cu HTTPS (SEC-04); samesite="lax" pentru protectie CSRF
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        samesite="strict",  # LOW-01: Strict > Lax for same-origin app
        path="/api",        # LOW-02: restrict cookie to API paths only
        max_age=7 * 24 * 3600,
        secure=True,        # CRIT-01: must be True; HTTPS enforced by nginx
    )
    # CRIT-A: also return token in body for admin UI (Bearer auth via sessionStorage)
    # The HttpOnly cookie is used by the frontend; the token body field is used by admin_ui
    return {"ok": True, "access_token": token}

@router.post("/logout")
def logout(response: Response):
    # SEC-01: stergem cookie-ul la logout (aceleasi atribute ca la set)
    response.delete_cookie(key="auth_token", httponly=True, samesite="strict", path="/api", secure=True)
    return {"ok": True}

@router.get("/me", response_model=UserOut)
def me(db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    user = db.get(User, user_id)
    # BUG-03: user poate fi None daca a fost sters din DB dar token-ul e inca valid
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User inexistent")
    return user


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    payload: ChangePasswordPayload,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
):
    """BUG-12: Endpoint schimbare parola (lipsea complet din backend)."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User inexistent")
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parola curenta incorecta")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parola noua prea scurta (min 8 caractere)")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True, "detail": "Parola schimbata cu succes"}
