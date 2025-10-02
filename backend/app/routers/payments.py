import os, stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import CartItem, Order, OrderItem, Product
from ..schemas import PaymentIntentCreate
from ..deps import current_user_id
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv("STRIPE_API_KEY")
CURRENCY = os.getenv("CURRENCY", "ron")

router = APIRouter(prefix="/payments", tags=["payments"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def compute_amount(db: Session, user_id: int) -> int:
    items = db.query(CartItem).filter(CartItem.user_id == user_id).all()
    total = 0
    for i in items:
        if not i.product.is_active or i.product.stock < i.quantity:
            raise HTTPException(status_code=400, detail="Stoc insuficient")
        total += i.product.price * i.quantity
    if total <= 0:
        raise HTTPException(status_code=400, detail="Coș gol")
    return total

@router.post("/create-payment-intent")
def create_payment_intent(payload: PaymentIntentCreate, db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    if not stripe.api_key:
        raise HTTPException(status_code=400, detail="Stripe neconfigurat")
    amount = compute_amount(db, user_id)
    intent = stripe.PaymentIntent.create(amount=amount, currency=CURRENCY, automatic_payment_methods={"enabled": True})
    if payload.save_order:
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
        return {"ok": False, "error": "Webhook secret missing"}
    try:
        event = stripe.Webhook.construct_event(payload, sig, secret)
    except Exception as e:
        return {"ok": False, "error": "invalid signature"}
    if event["type"] == "payment_intent.succeeded":
        pi = event["data"]["object"]
        order = db.query(Order).filter(Order.stripe_payment_intent == pi["id"]).first()
        if order and order.status != "paid":
            items = db.query(CartItem).filter(CartItem.user_id == order.user_id).all()
            for ci in items:
                oi = OrderItem(order_id=order.id, product_id=ci.product_id, quantity=ci.quantity, unit_price=ci.product.price)
                db.add(oi)
                ci.product.stock -= ci.quantity
                db.delete(ci)
            order.status = "paid"
            db.commit()
    return {"ok": True}
