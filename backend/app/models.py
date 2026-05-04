from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean, LargeBinary
from sqlalchemy.dialects.postgresql import ARRAY, BYTEA
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Integer, nullable=False)  # minor units
    currency = Column(String(8), default="ron")
    stock = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    image_url = Column(Text, nullable=True)
    image_data = Column(BYTEA, nullable=True)        # binary content stored in DB
    image_mime = Column(String(64), nullable=True)   # ex: image/jpeg
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    category = Column(String(50), nullable=True, index=True)    # ex: 'car_tuning', 'suporti_numar'
    tags = Column(ARRAY(String), nullable=False, default=list)  # BUG-25: default=list (nu []), evita shared mutable

class CartItem(Base):
    __tablename__ = "cart_items"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), index=True)
    quantity = Column(Integer, nullable=False, default=1)
    user = relationship("User", back_populates="cart_items")
    product = relationship("Product")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True)
    total_amount = Column(Integer, nullable=False)
    currency = Column(String(8), default="ron")
    status = Column(String(32), default="created", index=True)

    # NOU
    shipping_fee_minor = Column(Integer, nullable=True)
    customer_name      = Column(String(200), nullable=True)
    customer_phone     = Column(String(50), nullable=True)
    customer_address   = Column(String(500), nullable=True)

    stripe_payment_intent = Column(String(128), nullable=True, index=True)
    invoice_no = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Integer, nullable=False)
    order = relationship("Order", back_populates="items")
    product = relationship("Product")


class CompanySettings(Base):
    """Singleton row (id=1) with company fiscal/invoice details."""
    __tablename__ = "company_settings"
    id             = Column(Integer, primary_key=True, default=1)
    name           = Column(String(255), nullable=True)   # Denumire firmă
    cif            = Column(String(64),  nullable=True)   # CIF / CUI
    reg_com        = Column(String(128), nullable=True)   # Registrul Comerțului
    address        = Column(String(500), nullable=True)   # Adresă sediu
    bank_account   = Column(String(128), nullable=True)   # Cont bancar IBAN

