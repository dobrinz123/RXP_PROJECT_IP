from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import User
from ..schemas import UserCreate, UserLogin, UserOut
from ..security import hash_password, verify_password, create_token
from ..deps import current_user_id

router = APIRouter(prefix="/auth", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Date incorecte")
    token = create_token(user.id)
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def me(db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    user = db.get(User, user_id)
    return user
