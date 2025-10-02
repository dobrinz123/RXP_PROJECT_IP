
# Shop Project (FastAPI + PostgreSQL)

## Features
- Auth (register/login, JWT, bcrypt), `/me`
- Products CRUD
- Cart (add/list/update/delete)
- Orders (history)
- Payments (Stripe-ready via PaymentIntents; Apple Pay via Stripe frontend)
- Cash on Delivery (COD) checkout with configurable fee
- Order status updates (admin-only)
- Invoice PDF generation
- Custom product requests with file upload + optional SMTP email
- Root healthcheck `/`
- Docker Compose (API + Postgres)
- Minimal HTML frontend to test flows without Stripe

## Run (local)
1. Create venv & install:
```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
2. Copy `.env.example` to `.env` and fill values (at minimum set `DATABASE_URL`, `JWT_SECRET`).
3. Start PostgreSQL and create DB.
4. Run:
```
uvicorn app.main:app --reload
```
Docs: http://127.0.0.1:8000/docs

## Docker Compose
Fill `.env.docker`, then:
```
docker compose up --build
```

## Notes
- Prices are stored in minor units (e.g., bani/centi).
- COD fee read from `CASH_ON_DELIVERY_FEE_MINOR`.
- For Stripe local webhooks: `stripe listen --forward-to localhost:8000/payments/webhook` and put `whsec_...` in `.env`.
