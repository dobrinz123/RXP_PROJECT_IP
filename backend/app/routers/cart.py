from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import SessionLocal
from ..models import CartItem, Product
from ..schemas import CartItemIn, CartItemOut, CartQtyUpdate
from ..deps import current_user_id

router = APIRouter(prefix="/cart", tags=["cart"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[CartItemOut])
def get_cart(db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    items = db.query(CartItem).filter(CartItem.user_id == user_id).all()
    return items

@router.post("", response_model=CartItemOut)
def add_to_cart(payload: CartItemIn, db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    product = db.get(Product, payload.product_id)
    if not product or not product.is_active or product.stock < 1:
        raise HTTPException(status_code=400, detail="Produs indisponibil")
    item = db.query(CartItem).filter(CartItem.user_id == user_id, CartItem.product_id == payload.product_id).first()
    if item:
        item.quantity += payload.quantity
    else:
        item = CartItem(user_id=user_id, product_id=payload.product_id, quantity=payload.quantity)
        db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{item_id}", response_model=CartItemOut)
def update_quantity(item_id: int, payload: CartQtyUpdate, db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    item = db.get(CartItem, item_id)
    if not item or item.user_id != user_id:
        raise HTTPException(status_code=404, detail="Nu există")
    if payload.quantity <= 0:
        db.delete(item)
        db.commit()
        raise HTTPException(status_code=200, detail="Șters")
    if item.product.stock < payload.quantity:
        raise HTTPException(status_code=400, detail="Stoc insuficient")
    item.quantity = payload.quantity
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def remove_item(item_id: int, db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    item = db.get(CartItem, item_id)
    if not item or item.user_id != user_id:
        raise HTTPException(status_code=404, detail="Nu există")
    db.delete(item)
    db.commit()
    return {"ok": True}

@router.delete("")
def clear_cart(db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    db.query(CartItem).filter(CartItem.user_id == user_id).delete()
    db.commit()
    return {"ok": True}
