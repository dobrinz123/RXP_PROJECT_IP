# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import auth, products, cart, orders, payments, custom_requests, admin_panel

# creeazÄƒ tabelele la start (sau foloseÈ™te Alembic Ã®n producÈ›ie)
Base.metadata.create_all(bind=engine)

# dacÄƒ Ã®l rulezi sub proxy /api:
app = FastAPI(title="Shop API", root_path="/api")

# CORS â€“ permite site-ul tÄƒu
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",      # pentru rularea localÄƒ cu Nginx
        "https://rxpcustom3d.ro",
        "https://www.rxpcustom3d.ro",
        "https://api.rxpcustom3d.ro",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# include routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(custom_requests.router)
app.include_router(admin_panel.router, prefix="/admin", tags=["admin"])


@app.get("/")
def root():
    return {"ok": True}