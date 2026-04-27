import os
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


# === Auth ===
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)  # HIGH-04: min 8 chars enforced at registration

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
    # NEW-04: product poate fi None daca produsul a fost sters din DB
    # (fara Optional → HTTP 500 la GET /orders)
    product: Optional[ProductOut] = None
    quantity: int
    unit_price: int            # MINOR units (bani)
    product_id: Optional[int] = None  # util cand product=None
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
    # NEW-05: save_order eliminat (camp mort — comanda este intotdeauna salvata, vezi BUG-14)
    pass

class MeOut(BaseModel):
    id: int
    email: EmailStr
    is_admin: bool
    class Config:
        from_attributes = True

class CartQtyUpdate(BaseModel):
    quantity: int

class StatusUpdate(BaseModel):
    status: str  # folosit in admin; validare stricta mai jos

ORDER_STATUSES = [
    "created", "pending", "paid",
    "processing",       # status canonical
    "in_preparation",   # NEW-03: alias legacy (dropdown admin migrat la 'processing')
    "shipped", "delivered",
    "cancelled", "canceled",
]

class OrderStatusUpdate(BaseModel):
    """Schema cu validare stricta a status-ului comenzii."""
    status: str

    def model_post_init(self, __context):
        # BUG-30: eliminat __get_validators__ (API Pydantic v1, ignorat in v2)
        if self.status not in ORDER_STATUSES:
            raise ValueError(f"Status invalid. Valori acceptate: {ORDER_STATUSES}")

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
    # MED-07: max_length matches DB column sizes
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: str = Field(..., min_length=3, max_length=50)
    address: str = Field(..., min_length=3, max_length=500)
    # CRIT-02: shipping_fee_minor removed — shipping is always computed server-side
    items: Optional[List[OrderItemIn]] = None  # ignorat de backend; pastrat pt. compat

class AdminOrderItemOut(BaseModel):
    product: ProductOut      # ai deja ProductOut Ã®n schemas
    quantity: int
    unit_price: int

    class Config:
        from_attributes = True

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
        from_attributes = True


# === Company Settings ===
class CompanySettingsSchema(BaseModel):
    name:         Optional[str] = None
    cif:          Optional[str] = None
    reg_com:      Optional[str] = None
    address:      Optional[str] = None
    bank_account: Optional[str] = None

    class Config:
        from_attributes = True