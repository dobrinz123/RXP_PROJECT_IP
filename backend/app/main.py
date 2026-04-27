# app/main.py
import os
import time
import logging
from pathlib import Path
from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from .database import engine, Base
from .routers import auth, products, cart, orders, payments, custom_requests, admin_panel

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

# Deployment mode:
#   Local docker (with nginx): API_PREFIX="" (default), SERVE_STATIC=false
#     -> nginx strips /api before proxying; FastAPI routes are at /auth/login etc.
#     -> root_path="/api" makes Swagger generate /api/* URLs
#   Render single-container (no nginx): API_PREFIX="/api", SERVE_STATIC=true
#     -> FastAPI handles /api/* directly and serves frontend + admin_ui static files
API_PREFIX = os.getenv("API_PREFIX", "")
SERVE_STATIC = os.getenv("SERVE_STATIC", "false").lower() == "true"

app = FastAPI(
    title="Shop API",
    root_path="/api" if not API_PREFIX else "",
    docs_url=f"{API_PREFIX}/docs" if API_PREFIX else "/docs",
    openapi_url=f"{API_PREFIX}/openapi.json" if API_PREFIX else "/openapi.json",
    redoc_url=f"{API_PREFIX}/redoc" if API_PREFIX else "/redoc",
    debug=False,
)

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

# Build API routes under optional prefix (/api in cloud, "" locally)
api_router = APIRouter(prefix=API_PREFIX)
api_router.include_router(auth.router)
api_router.include_router(products.router)
api_router.include_router(cart.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(custom_requests.router)
api_router.include_router(admin_panel.router, prefix="/admin", tags=["admin"])


@api_router.get("/health")
def health():
    return {"ok": True}


app.include_router(api_router)


@app.exception_handler(Exception)
async def generic_500_handler(request: Request, exc: Exception):
    _logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Eroare internă de server."})


# Serve static files when running as single-container (Render). Mounted LAST
# so explicit API routes win.
if SERVE_STATIC:
    APP_ROOT = Path(os.getenv("APP_ROOT", "/app"))
    admin_dir = APP_ROOT / "admin_ui"
    frontend_dir = APP_ROOT / "frontend"

    if admin_dir.exists():
        app.mount("/admin", StaticFiles(directory=str(admin_dir), html=True), name="admin")
        _logger.info("Mounted admin_ui at /admin from %s", admin_dir)
    else:
        _logger.warning("admin_ui directory not found at %s", admin_dir)

    if frontend_dir.exists():
        app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
        _logger.info("Mounted frontend at / from %s", frontend_dir)
    else:
        _logger.warning("frontend directory not found at %s", frontend_dir)
