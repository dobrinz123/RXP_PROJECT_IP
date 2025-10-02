# backend/app/routers/admin_panel.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.deps import get_current_admin  # același guard pe care îl folosești în /admin/*
from typing import List, Dict, Any

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/orders/{order_id}")
def admin_get_order(order_id: int,
                    db: Session = Depends(get_db),
                    _admin=Depends(get_current_admin)) -> Dict[str, Any]:
    """
    Returnează o comandă cu toate câmpurile utile pentru detalii (inclusiv items).
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Comandă inexistentă")

    # items
    items = []
    for it in order.items:
        prod = it.product
        items.append({
            "product_id": it.product_id,
            "product_name": prod.name if prod else "",
            "quantity": it.quantity,
            "unit_price": it.unit_price,        # în bani (minor units)
            "subtotal": (it.unit_price or 0) * (it.quantity or 1)
        })

    # totaluri
    subtotal = sum(i["subtotal"] for i in items)
    shipping = order.shipping_fee_minor or 0
    total = order.total_amount if order.total_amount is not None else subtotal + shipping

    return {
        "id": order.id,
        "status": order.status,
        "created_at": order.created_at,
        "currency": order.currency or "RON",
        "billing_name": order.billing_name or "",
        "phone": order.phone or "",
        "shipping_address": order.shipping_address or "",
        "payment_method": order.payment_method or "COD",
        "shipping_fee_minor": shipping,
        "subtotal_minor": subtotal,
        "total_minor": total,
        "items": items,
    }
