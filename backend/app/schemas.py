from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


# === Auth ===
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    is_admin: bool = False
    class Config:
        from_attributes = True

# === Products ===
class ProductIn(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    price: int                 # MINOR units (bani)
    currency: str = "ron"
    stock: int = 0
    is_active: bool = True
    image_url: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []

class ProductOut(ProductIn):
    id: int
    class Config:
        from_attributes = True

# === Cart ===
class CartItemIn(BaseModel):
    product_id: int
    quantity: int

class CartItemOut(BaseModel):
    id: int
    product: ProductOut
    quantity: int
    class Config:
        from_attributes = True

# === Orders ===
class OrderItemOut(BaseModel):
    product: ProductOut
    quantity: int
    unit_price: int            # MINOR units (bani)
    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: int
    total_amount: int          # MINOR units (bani)
    currency: str
    status: str
    items: List[OrderItemOut]
    # opÈ›ionale / pot fi None Ã®n DB dacÄƒ nu le-ai adÄƒugat Ã®ncÄƒ
    shipping_fee_minor: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None

    stripe_payment_intent: Optional[str] = None
    invoice_no: Optional[str] = None
    class Config:
        from_attributes = True

# === Checkout & misc ===
class PaymentIntentCreate(BaseModel):
    save_order: bool = True

class MeOut(BaseModel):
    id: int
    email: EmailStr
    is_admin: bool
    class Config:
        from_attributes = True

class CartQtyUpdate(BaseModel):
    quantity: int

class StatusUpdate(BaseModel):
    status: str

class CustomRequestIn(BaseModel):
    email: EmailStr
    description: Optional[str] = None

# ==== NEW: Cash on Delivery payload ====
class CustomerInfo(BaseModel):
    full_name: str
    phone: str
    address: str

class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)

class OrderCreateCOD(BaseModel):
    # Folosim coÈ™ul server-side; items sunt opÈ›ionale (dacÄƒ vrei, poÈ›i valida aici cu lista din coÈ™)
    customer: CustomerInfo
    shipping_fee_minor: int = 2500    # 25 RON Ã®n bani
    items: Optional[List[OrderItemIn]] = None  # ignorat de backend; pÄƒstrat pt. compat
    full_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=3)
    address: str = Field(..., min_length=3)

class AdminOrderItemOut(BaseModel):
    product: ProductOut      # ai deja ProductOut Ã®n schemas
    quantity: int
    unit_price: int

    class Config:
        orm_mode = True

class AdminOrderOut(BaseModel):
    id: int
    status: str
    total_amount: int
    currency: str = 'ron'
    created_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    shipping_fee_minor: int = 0
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    items: List[AdminOrderItemOut] = []
    invoice_no: Optional[str] = None

    class Config:
        orm_mode = True