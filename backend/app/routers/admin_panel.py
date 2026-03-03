# backend/app/routers/admin_panel.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..deps import get_db, admin_required
from .. import models, schemas
from ..schemas import StatusUpdate, OrderStatusUpdate, OrderOut, CompanySettingsSchema
from typing import List, Dict, Any

router = APIRouter(tags=["admin"])


# ──── Lista comenzi admin (GET /admin/orders) ────
@router.get("/orders", response_model=List[OrderOut])
def admin_list_orders(
    scope: str = "active",
    status: str = None,
    db: Session = Depends(get_db),
    _admin: int = Depends(admin_required),
):
    """Listează comenzi pentru admin, filtrabile pe status și scope."""
    DONE_STATUSES = {"delivered", "canceled", "cancelled"}
    qry = db.query(models.Order)

    if scope == "done":
        qry = qry.filter(models.Order.status.in_(DONE_STATUSES))
    else:
        qry = qry.filter(~models.Order.status.in_(DONE_STATUSES))

    if status:
        qry = qry.filter(models.Order.status == status)

    return qry.order_by(models.Order.id.desc()).all()


# ──── Detalii comandă (GET /admin/orders/{order_id}) ────
@router.get("/orders/{order_id}")
def admin_get_order(order_id: int,
                    db: Session = Depends(get_db),
                    _admin: int = Depends(admin_required)) -> Dict[str, Any]:
    """Returnează o comandă cu toate câmpurile utile (inclusiv items)."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Comandă inexistentă")

    items = []
    for it in order.items:
        prod = it.product
        items.append({
            "product_id": it.product_id,
            "product_name": prod.name if prod else "",
            "quantity": it.quantity,
            "unit_price": it.unit_price,
            "subtotal": (it.unit_price or 0) * (it.quantity or 1)
        })

    subtotal = sum(i["subtotal"] for i in items)
    shipping = order.shipping_fee_minor or 0
    total = order.total_amount if order.total_amount is not None else subtotal + shipping

    return {
        "id": order.id,
        "status": order.status,
        "created_at": order.created_at,
        "currency": order.currency or "RON",
        "customer_name": order.customer_name or "",
        "customer_phone": order.customer_phone or "",
        "customer_address": order.customer_address or "",
        "payment_method": "COD",
        "shipping_fee_minor": shipping,
        "subtotal_minor": subtotal,
        "total_minor": total,
        "items": items,
    }


# ──── Actualizare status (PATCH /admin/orders/{id}/status) ────
@router.patch("/orders/{order_id}/status")
def admin_update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,   # BUG-08: inlocuit StatusUpdate cu OrderStatusUpdate (validare enum)
    db: Session = Depends(get_db),
    _admin: int = Depends(admin_required),
):
    """Actualizeaza status-ul unei comenzi (valori acceptate: created, pending, paid, ...)."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Comanda inexistenta")
    order.status = payload.status
    db.commit()
    return {"ok": True, "status": order.status}


# ──── Lista produse admin (GET /admin/products) ────
@router.get("/products", response_model=List[schemas.ProductOut])   # BUG-20: adaugat response_model
def admin_list_products(
    db: Session = Depends(get_db),
    _admin: int = Depends(admin_required),
):
    """Returneaza toate produsele (inclusiv inactive) pentru admin."""
    return db.query(models.Product).order_by(models.Product.id.desc()).all()


# ──── Creare produs (POST /admin/products) ────
# NEW-02: inlocuit payload: dict cu ProductIn pentru validare stricta de tipuri
@router.post("/products", response_model=schemas.ProductOut)
def admin_create_product(
    payload: schemas.ProductIn,
    db: Session = Depends(get_db),
    _admin: int = Depends(admin_required),
):
    """Creeaza un produs nou. price/stock sunt int (bani minor) — validation by Pydantic."""
    if db.query(models.Product).filter(models.Product.sku == payload.sku).first():
        raise HTTPException(status_code=409, detail="SKU deja exista")
    p = models.Product(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


# NEW-02: inlocuit payload: dict cu ProductIn pentru validare stricta de tipuri
@router.put("/products/{product_id}", response_model=schemas.ProductOut)
def admin_update_product(
    product_id: int,
    payload: schemas.ProductIn,
    db: Session = Depends(get_db),
    _admin: int = Depends(admin_required),
):
    """Actualizeaza un produs existent. Validare stricta prin ProductIn schema."""
    p = db.get(models.Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Produs inexistent")
    if payload.sku != p.sku and db.query(models.Product).filter(models.Product.sku == payload.sku).first():
        raise HTTPException(status_code=409, detail="SKU deja exista")
    for key, val in payload.model_dump().items():
        setattr(p, key, val)
    db.commit()
    db.refresh(p)
    return p


# ──── Ștergere produs (DELETE /admin/products/{id}) ────
@router.delete("/products/{product_id}")
def admin_delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _admin: int = Depends(admin_required),
):
    """Șterge un produs."""
    p = db.get(models.Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Produs inexistent")
    db.delete(p)
    db.commit()
    return {"ok": True}


# ──── Facturi (GET /admin/invoices) ────
@router.get("/invoices", response_model=List[OrderOut])   # BUG-20: adaugat response_model
def admin_list_invoices(
    q: str = None,
    db: Session = Depends(get_db),
    _admin: int = Depends(admin_required),
):
    """Returneaza comenzile cu invoice_no."""
    from sqlalchemy.orm import joinedload
    qry = (
        db.query(models.Order)
        .options(joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(models.Order.invoice_no.isnot(None))
    )
    if q:
        qry = qry.filter(models.Order.invoice_no.ilike(f"%{q}%"))
    return qry.order_by(models.Order.id.desc()).all()


# ──── Descarcă factură PDF (GET /admin/orders/{id}/invoice.pdf) ────
@router.get("/orders/{order_id}/invoice.pdf")
def admin_download_invoice(
    order_id: int,
    db: Session = Depends(get_db),
    _admin: int = Depends(admin_required),
):
    """Descarca factura PDF pentru o comanda (regenerata cu datele firmei)."""
    from datetime import datetime, timezone
    from fastapi.responses import FileResponse
    from sqlalchemy.orm import joinedload
    from ..utils.invoice import generate_invoice_pdf, INVOICE_DIR

    # NEW-01: eager load items+product pentru a evita N+1 queries si DetachedInstanceError
    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Comanda inexistenta")

    if not order.invoice_no:
        # BUG-24: inlocuit datetime.utcnow() deprecat cu timezone-aware
        year = datetime.now(timezone.utc).year
        order.invoice_no = f"RXP-{year}-{order.id:06d}"
        db.commit()

    # Obtine datele firmei din DB
    company = db.get(models.CompanySettings, 1)

    # Regenereaza intotdeauna PDF-ul cu cele mai recente date ale firmei
    try:
        pdf_path = generate_invoice_pdf(order, company=company)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare generare PDF: {e}")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"factura_{order.invoice_no}.pdf",
    )


# ──── Date firmă (GET/PUT /admin/settings/company) ────
@router.get("/settings/company", response_model=CompanySettingsSchema)
def admin_get_company(
    db: Session = Depends(get_db),
    _admin: int = Depends(admin_required),
):
    """Returnează datele firmei (singleton id=1)."""
    obj = db.get(models.CompanySettings, 1)
    if not obj:
        obj = models.CompanySettings(id=1)
        db.add(obj)
        db.commit()
        db.refresh(obj)
    return obj


@router.put("/settings/company", response_model=CompanySettingsSchema)
def admin_update_company(
    payload: CompanySettingsSchema,
    db: Session = Depends(get_db),
    _admin: int = Depends(admin_required),
):
    """Actualizează datele firmei."""
    obj = db.get(models.CompanySettings, 1)
    if not obj:
        obj = models.CompanySettings(id=1)
        db.add(obj)
    for field, val in payload.model_dump(exclude_unset=False).items():
        setattr(obj, field, val)
    db.commit()
    db.refresh(obj)
    return obj
