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
    """Returneaza toate comenzile utilizatorului curent."""
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
    """Plaseaza o comanda ramburs (Cash on Delivery) pe baza cosului server-side."""
    cart_items = db.query(CartItem).filter(CartItem.user_id == user_id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cosul este gol.")

    # BUG-07: valideaza shipping_fee_minor din payload (schema are ge=0, le=50000)
    # Conditia "if payload.shipping_fee_minor" era bug: -5000 era truthy!
    # Acum schema forteaza ge=0, deci orice valoare trimisa e >= 0.
    shipping = payload.shipping_fee_minor if payload.shipping_fee_minor is not None else SHIPPING_FEE

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
        # BUG-06: invoice_no generat DUPA flush() pentru a folosi order.id real (atomic, unic)
    )
    db.add(order)
    db.flush()  # obtine order.id din DB

    # BUG-06: foloseste order.id (unic, generat de DB) pentru invoice_no atomic
    year = datetime.now(timezone.utc).year
    order.invoice_no = f"RXP-{year}-{order.id:06d}"

    for oi in order_items:
        oi.order_id = order.id
        db.add(oi)

    db.commit()

    # BUG-21: eager load relatiile inainte de generarea PDF (evita DetachedInstanceError)
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