import os
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..deps import get_db, current_user_id
from ..models import Order, OrderItem, CartItem, Product
from ..schemas import OrderOut, OrderCreateCOD
from ..utils.invoice import generate_invoice_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["orders"])

SHIPPING_FEE = int(os.getenv("CASH_ON_DELIVERY_FEE_MINOR", "2500"))


# ──────────── USER ENDPOINTS ────────────

@router.get("", response_model=List[OrderOut])
def list_my_orders(
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
):
    return (
        db.query(Order)
        .filter(Order.user_id == user_id)
        .order_by(Order.id.desc())
        .all()
    )


@router.post("/checkout-cod", response_model=OrderOut)
def checkout_cod(
    payload: OrderCreateCOD,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
):
    cart_items = db.query(CartItem).filter(CartItem.user_id == user_id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cosul este gol.")

    # CRIT-02: shipping always computed server-side, never trusted from client
    shipping = SHIPPING_FEE

    products_total = 0
    order_items: list[OrderItem] = []

    # BUG-16: un singur loop cu with_for_update() pentru validare, creare OrderItems SI decrement stoc
    for ci in cart_items:
        product = db.query(Product).filter(Product.id == ci.product_id).with_for_update().first()
        if not product or not product.is_active:
            raise HTTPException(status_code=400, detail=f"Produs indisponibil: {ci.product_id}")
        if product.stock < ci.quantity:
            raise HTTPException(status_code=400, detail=f"Stoc insuficient pentru {product.name}")

        products_total += product.price * ci.quantity
        order_items.append(OrderItem(
            product_id=product.id,
            quantity=ci.quantity,
            unit_price=product.price,
        ))
        # Decrement stoc in acelasi loop (cu lock activ) — BUG-16 fix
        product.stock -= ci.quantity
        db.delete(ci)

    total = products_total + shipping

    order = Order(
        user_id=user_id,
        total_amount=total,
        currency="ron",
        status="created",
        shipping_fee_minor=shipping,
        customer_name=payload.full_name,
        customer_phone=payload.phone,
        customer_address=payload.address,
    )
    db.add(order)
    db.flush()

    year = datetime.now(timezone.utc).year
    order.invoice_no = f"RXP-{year}-{order.id:06d}"

    for oi in order_items:
        oi.order_id = order.id
        db.add(oi)

    db.commit()

    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order.id)
        .first()
    )

    # Genereaza PDF factura (nu blocheaza comanda daca esueaza)
    try:
        generate_invoice_pdf(order)
    except Exception as exc:
        logger.error("Invoice PDF generation failed for order %s: %s", order.id, exc)

    return order