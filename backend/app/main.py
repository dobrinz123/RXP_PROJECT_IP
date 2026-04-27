# app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import auth, products, cart, orders, payments, custom_requests, admin_panel

# BUG-19: retry logic pentru conectarea la DB (PostgreSQL poate sa nu fie gata imediat in Docker)
import time
import logging
from fastapi import Request
from fastapi.responses import JSONResponse

_logger = logging.getLogger(__name__)

def _init_db(retries: int = 5, delay: float = 3.0):
    for attempt in range(1, retries + 1):
        try:
            Base.metadata.create_all(bind=engine)
            _logger.info("DB connected and tables created (attempt %d)", attempt)
            return
        except Exception as exc:
            _logger.warning("DB not ready (attempt %d/%d): %s", attempt, retries, exc)
            if attempt < retries:
                time.sleep(delay)
            else:
                raise RuntimeError(f"Nu am putut conecta la DB dupa {retries} incercari") from exc

_init_db()

# MED-04: debug=False ensures stack traces are never sent to clients in production
app = FastAPI(title="Shop API", root_path="/api", debug=False)

# CORS — citit din env CORS_ORIGINS (comma-separated) sau fallback la localhost + domeniu propriu
_default_origins = (
    "http://localhost:8080,http://localhost:8081,"
    "http://127.0.0.1:8080,http://127.0.0.1:8081,"
    "https://rxpcustom3d.ro,https://www.rxpcustom3d.ro,https://api.rxpcustom3d.ro"
)
CORS_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)

# include routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(custom_requests.router)
app.include_router(admin_panel.router, prefix="/admin", tags=["admin"])


@app.exception_handler(Exception)
async def generic_500_handler(request: Request, exc: Exception):
    # MED-04: log full details server-side, return generic message to client
    _logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Eroare internă de server."})

@app.get("/")
def root():
    return {"ok": True}