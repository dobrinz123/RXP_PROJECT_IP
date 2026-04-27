import os, stripe, logging
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from ..models import CartItem, Order, OrderItem, Product
from ..schemas import PaymentIntentCreate
from ..deps import current_user_id, get_db
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv("STRIPE_API_KEY")
CURRENCY = os.getenv("CURRENCY", "ron")

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])


def compute_amount(db: Session, user_id: int) -> int:
    items = db.query(CartItem).filter(CartItem.user_id == user_id).all()
    total = 0
    for i in items:
        if not i.product.is_active or i.product.stock < i.quantity:
            raise HTTPException(status_code=400, detail="Stoc insuficient")
        total += i.product.price * i.quantity
    if total <= 0:
        raise HTTPException(status_code=400, detail="Cos gol")
    return total

@router.post("/create-payment-intent")
def create_payment_intent(payload: PaymentIntentCreate, db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    if not stripe.api_key:
        raise HTTPException(status_code=400, detail="Stripe neconfigurat")
    amount = compute_amount(db, user_id)
    intent = stripe.PaymentIntent.create(amount=amount, currency=CURRENCY, automatic_payment_methods={"enabled": True})
    order = Order(user_id=user_id, total_amount=amount, currency=CURRENCY, status="pending", stripe_payment_intent=intent["id"])
    db.add(order)
    db.commit()
    return {"client_secret": intent["client_secret"]}

@router.post("/webhook")
async def webhook(request: Request, db: Session = Depends(get_db)):
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    if not secret:
        logger.error("STRIPE_WEBHOOK_SECRET is not configured")
        return JSONResponse(status_code=400, content={"ok": False, "error": "Webhook secret missing"})
    try:
        event = stripe.Webhook.construct_event(payload, sig, secret)
    except stripe.error.SignatureVerificationError as e:
        logger.warning(f"Stripe signature verification failed: {e}")
        return JSONResponse(status_code=400, content={"ok": False, "error": "Invalid signature"})
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return JSONResponse(status_code=400, content={"ok": False, "error": "Webhook processing error"})

    if event["type"] == "payment_intent.succeeded":
        pi = event["data"]["object"]
        order = db.query(Order).filter(Order.stripe_payment_intent == pi["id"]).with_for_update().first()
        if order and order.status != "paid":
            items = db.query(CartItem).filter(CartItem.user_id == order.user_id).all()
            for ci in items:
                # Lock produsul pentru a preveni race conditions
                product = db.query(Product).filter(Product.id == ci.product_id).with_for_update().first()

                if product:
                    if product.stock < ci.quantity:
                        logger.error(
                            "Stoc insuficient la webhook pentru product_id=%s: stock=%s, qty=%s",
                            ci.product_id, product.stock, ci.quantity
                        )
                        # Continua procesarea platii dar inregistreaza eroarea
                        # (banii au fost luati deja, nu putem refuza comanda)
                        product.stock = 0
                    else:
                        product.stock -= ci.quantity

                unit_price = None
                if product:
                    unit_price = product.price
                elif ci.product:
                    unit_price = ci.product.price
                # Daca ambele sunt None, foloseste unit_price din CartItem (daca exista) sau 0
                if unit_price is None:
                    unit_price = 0
                    logger.warning("Produs inexistent pentru cart_item_id=%s la procesare webhook", ci.id)

                oi = OrderItem(
                    order_id=order.id,
                    product_id=ci.product_id,
                    quantity=ci.quantity,
                    unit_price=unit_price
                )
                db.add(oi)
                db.delete(ci)
            order.status = "paid"
            db.commit()
    return {"ok": True}
