from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import schemas
from app.database import get_db
from app.models import Order, OrderItem, Product
from app.auth import require_admin  # sau cum se numeÈ™te dependenÈ›a ta de admin

router = APIRouter()

@router.get("/admin/orders/{order_id}", response_model=schemas.AdminOrderOut, tags=["admin"])
def admin_get_order(order_id: int, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    o: Order | None = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="ComandÄƒ inexistentÄƒ")

    # items + produse
    rows = (
        db.query(OrderItem, Product)
          .join(Product, OrderItem.product_id == Product.id)
          .filter(OrderItem.order_id == order_id)
          .all()
    )

    return schemas.AdminOrderOut(
        id=o.id,
        status=o.status,
        total_amount=o.total_amount or 0,
        currency=(o.currency or "ron"),
        created_at=getattr(o, "created_at", None),
        payment_method=getattr(o, "payment_method", None) or "COD",
        shipping_fee_minor=(o.shipping_fee_minor or 0),
        customer_name=(o.customer_name or None),
        customer_phone=(o.customer_phone or None),
        customer_address=(o.customer_address or None),
        items=[
            schemas.AdminOrderItemOut(
                product=schemas.ProductOut.from_orm(p),
                quantity=it.quantity,
                unit_price=it.unit_price,
            )
            for (it, p) in rows
        ],
        invoice_no=getattr(o, "invoice_no", None),
    )