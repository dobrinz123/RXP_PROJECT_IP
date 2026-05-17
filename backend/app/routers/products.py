# app/routers/products.py
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import Product
from ..schemas import ProductIn, ProductOut
from ..deps import admin_required, get_db, optional_admin  # BUG-27: import get_db din deps

router = APIRouter(prefix="/products", tags=["products"])

# ---------- PUBLIC ----------
@router.get("", response_model=List[ProductOut])
def list_products(
    q: Optional[str] = Query(None, description="caută în nume/descriere/sku"),
    include_inactive: bool = False,
    category: Optional[str] = Query(None, description="ex: car_tuning sau suporti_numar"),
    tag: Optional[str] = Query(None, description="ex: mercedes"),
    db: Session = Depends(get_db),
    is_admin: bool = Depends(optional_admin),
):
    qry = db.query(Product)
    # CRIT-03: include_inactive is only honoured for authenticated admins
    if not (include_inactive and is_admin):
        qry = qry.filter(Product.is_active == True)
    if category:
        qry = qry.filter(Product.category == category)
    if tag:
        # tags e un array TEXT[]; `tag == func.any(...)` genera SQL invalid
        # (any() agregat) → 500. Folosim operatorul de containment: tags @> ARRAY[tag]
        qry = qry.filter(Product.tags.contains([tag]))
    if q:
        like = f"%{q}%"
        qry = qry.filter((Product.name.ilike(like)) | (Product.description.ilike(like)) | (Product.sku.ilike(like)))
    return qry.order_by(Product.id.desc()).all()

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.get(Product, product_id)
    # BUG-10: produsele inactive nu trebuie accesibile public prin ID direct
    if not p or not p.is_active:
        raise HTTPException(status_code=404, detail="Produs inexistent")
    return p

@router.get("/{product_id}/image")
def get_product_image(product_id: int, db: Session = Depends(get_db)):
    p = db.get(Product, product_id)
    if not p or not p.is_active or not p.image_data:
        raise HTTPException(status_code=404, detail="Imagine inexistentă")
    return Response(
        content=bytes(p.image_data),
        media_type=p.image_mime or "image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )

# ---------- ADMIN ----------
@router.post("", response_model=ProductOut)
def create_product(payload: ProductIn, db: Session = Depends(get_db), _admin: int = Depends(admin_required)):
    if db.query(Product).filter(Product.sku == payload.sku).first():
        raise HTTPException(status_code=409, detail="SKU deja există")
    p = Product(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductIn, db: Session = Depends(get_db), _admin: int = Depends(admin_required)):
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Produs inexistent")
    if payload.sku != p.sku and db.query(Product).filter(Product.sku == payload.sku).first():
        raise HTTPException(status_code=409, detail="SKU deja există")
    for k, v in payload.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), _admin: int = Depends(admin_required)):
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Produs inexistent")
    db.delete(p)
    db.commit()
    return {"ok": True}
