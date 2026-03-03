# AUDIT TEHNIC COMPLET — RXP Custom3D
**Versiune:** 4.0 — FINAL — toate problemele rezolvate
**Data audit inițial:** 2026-03-03
**Data re-audit v2.0:** 2026-03-03
**Data re-audit v3.0:** 2026-03-03
**Data re-audit v4.0:** 2026-03-03
**Metodă:** Citire integrală cod sursă, linie cu linie, toate fișierele

---

## LEGENDĂ

| Simbol | Severitate |
|--------|-----------|
| 🔴 | CRITICAL — crash garantat / funcționalitate complet ruptă |
| 🟠 | HIGH — bug major sau risc de securitate serios |
| 🟡 | MEDIUM — comportament incorect sau vulnerabilitate moderată |
| 🔵 | LOW — code smell, deprecare, risc minor |
| ✅ | REZOLVAT complet |

---

# PART I — STATUS FINAL COMPLET (40 probleme)

## Rezumat general

| Status | Original (33) | Nou descoperit (7) | Total (40) |
|--------|:-------------:|:-----------------:|:----------:|
| ✅ Rezolvat complet | **33** | **7** | **40** |
| ❌ Nerezolvat | **0** | **0** | **0** |

> **🎉 100% din problemele identificate sunt rezolvate.**

---

## BUGURI CRITICE — toate rezolvate ✅

| ID | Descriere | Status | Fișier |
|----|-----------|--------|--------|
| BUG-01 | `createCodOrder()` duplicat suprascria funcția corectă → checkout rupt | ✅ A doua definiție ștearsă | `script.js` |
| BUG-02 | `return {"ok":True}` incompatibil cu `response_model=CartItemOut` → HTTP 500 | ✅ `Response(status_code=204)` | `cart.py:43` |
| BUG-03 | `/auth/me` returna None dacă user șters → HTTP 500 | ✅ `raise HTTPException(404)` | `auth.py:34` |
| BUG-04 | Webhook Stripe decrementa stoc fără validare → stoc negativ | ✅ Validare + log eroare | `payments.py:77` |
| BUG-05 | `ci.product.price` când product=None → AttributeError | ✅ Guard triplu cu fallback 0 | `payments.py:89-96` |
| BUG-06 | Race condition → numere factură duplicate | ✅ `order.id` după `flush()` (atomic, unic DB) | `orders.py:90` |
| BUG-07 | Shipping fee negativ acceptat → prețuri manipulabile | ✅ `ge=0, le=50000` în schema + `is not None` | `schemas.py:125` |

---

## BUGURI HIGH — toate rezolvate ✅

| ID | Descriere | Status | Fișier |
|----|-----------|--------|--------|
| BUG-08 | `StatusUpdate` (fără validare) folosit în loc de `OrderStatusUpdate` | ✅ Înlocuit cu `OrderStatusUpdate` | `admin_panel.py:81` |
| BUG-09 | `MAX_FILE_SIZE`/`MAX_FILES` definite dar neverificate; RAM exhaustion | ✅ Chunk reading + whitelist extensii | `custom_requests.py:34-69` |
| BUG-10 | Produse inactive accesibile prin `GET /products/{id}` | ✅ `if not p or not p.is_active` | `products.py:38` |
| BUG-11 | Cart: cantitate poate depăși stocul la merge | ✅ Validare `product.stock < new_qty` | `cart.py:23-25` |
| BUG-12 | `changePassword()` apela endpointuri inexistente → eșua mereu | ✅ `POST /auth/change-password` implementat | `auth.py:44-60` |
| BUG-13 | Race condition webhook Stripe → order procesat de două ori | ✅ `with_for_update()` pe order | `payments.py:68` |
| BUG-14 | `save_order=False` → Stripe plătit, nicio comandă în DB | ✅ Order salvat întotdeauna | `payments.py:43-45` |
| BUG-15 | JWT_SECRET placeholder `"schimba-asta-cu-un-random-lung"` folosit ca secret | ✅ Adăugat în `_PLACEHOLDER_SECRETS`; generare automată secret random | `security.py:11-19` |

---

## BUGURI MEDIUM — toate rezolvate ✅

| ID | Descriere | Status | Fișier |
|----|-----------|--------|--------|
| BUG-16 | Două loop-uri separate: primul cu lock, al doilea fără | ✅ Unificat într-un singur loop cu lock | `orders.py:55-70` |
| BUG-17 | `clearServerCart()` definit de două ori | ✅ Duplicat șters | `script.js` |
| BUG-18 | `renderAccountPage()` și `setupAccountPage()` conflictuau | ✅ `setupAccountPage()` eliminat | `script.js` |
| BUG-19 | `create_all()` la startup fără retry → crash dacă DB nu e gata | ✅ Retry logic cu 5 încercări, 3s delay | `main.py:15-28` |
| BUG-20 | `admin_list_invoices` fără `response_model` și fără eager loading | ✅ `response_model=List[OrderOut]` + `joinedload()` adăugate | `admin_panel.py:160-175` |
| BUG-21 | `order.items` lazy loaded înainte de PDF → DetachedInstanceError | ✅ `joinedload()` eager loading | `orders.py:99-104` |
| BUG-22 | `fetchMe()` apela `/auth/user` inexistent ca fallback | ✅ Fallback eliminat | `script.js:547-551` |
| BUG-23 | Admin panel: niciun logout automat la expirare token (401) | ✅ `alertApiError()` apelează `lockAdmin()` la 401 | `index.html:378-381` |

---

## BUGURI LOW — toate rezolvate ✅

| ID | Descriere | Status | Fișier |
|----|-----------|--------|--------|
| BUG-24 | `datetime.utcnow()` deprecat Python 3.12+ | ✅ `datetime.now(timezone.utc)` în toate fișierele | `security.py`, `orders.py`, `admin_panel.py:210` |
| BUG-25 | `default=[]` mutable pentru coloana ARRAY | ✅ `default=list` | `models.py:30` |
| BUG-26 | `req_id = uuid4()[:8]` — coliziune posibilă | ✅ `uuid.uuid4().hex` (32 chars) | `custom_requests.py:38` |
| BUG-27 | `get_db()` duplicat în routere (`payments.py`) | ✅ Eliminat, importat din `deps` | `payments.py:7` |
| BUG-28 | Nginx: lipsă `client_max_body_size` pe `/api/` | ✅ `client_max_body_size 10m` adăugat | `default.conf` |
| BUG-29 | `invoice_no` path traversal teoretic | ✅ `re.sub()` sanitizare | `invoice.py:72` |
| BUG-30 | `__get_validators__` API Pydantic v1, ignorat în v2 | ✅ Eliminat, `model_post_init` păstrat | `schemas.py:101` |

---

## SECURITATE — toate rezolvate ✅

| ID | Descriere | Status | Fix aplicat |
|----|-----------|--------|-------------|
| SEC-01 | Token JWT în localStorage — furtibil prin XSS | ✅ **Migrat la HttpOnly cookie** | `auth.py` + `deps.py` + `script.js` |
| SEC-02 | `i.product.name` crash la product null în admin | ✅ `i.product?.name ?? '(produs sters)'` | `index.html` |
| SEC-03 | Nginx prefix match prea permisiv pe `/api/custom-requests` | ✅ Regex `^/api/custom-requests(/|$)` | `default.conf` |
| SEC-04 | Nginx: fără HTTPS | ✅ **Redirect HTTP→HTTPS + server block SSL** | `default.conf` + `docker-compose.yml` |
| SEC-05 | DB credentials default `shopsecret` | ✅ **Centralizat în `.env.docker` cu placeholders clare** | `.env.docker` + `docker-compose.yml` |

---

## BUGURI NOI (re-audit) — toate rezolvate ✅

| ID | Sev | Fișier | Descriere scurtă | Status |
|----|-----|--------|-----------------|--------|
| NEW-01 | 🟡 | `admin_panel.py` | Invoice download fără eager loading | ✅ `joinedload()` adăugat |
| NEW-02 | 🟡 | `admin_panel.py` | `payload: dict` → HTTP 500 la input invalid | ✅ `payload: schemas.ProductIn` |
| NEW-03 | 🟡 | `schemas.py` | `"in_preparation"` invalid în backend | ✅ Adăugat în `ORDER_STATUSES` |
| NEW-04 | 🟡 | `schemas.py` | `OrderItemOut.product` non-null → HTTP 500 | ✅ `Optional[ProductOut] = None` |
| NEW-05 | 🔵 | `payments.py`/`schemas.py` | `save_order` câmp mort în schema | ✅ Câmp eliminat |
| NEW-06 | 🔵 | `custom_requests.py` | Foldere orfane pe disk la eroare upload | ✅ `try/finally + shutil.rmtree()` |
| NEW-07 | 🔵 | `.env.docker`/`security.py` | Placeholder JWT nerecunoscut de validare | ✅ Adăugat în `_PLACEHOLDER_SECRETS` |

---

# PART II — DETALII FIX-URI MAJORE (runda 3)

---

## ✅ SEC-01 — JWT migrat la HttpOnly Cookie

**Fișiere modificate:** `backend/app/routers/auth.py` · `backend/app/deps.py` · `frontend/script.js`

**Problemă:** Tokenul JWT era stocat în `localStorage`, accesibil oricărui script JS prin `localStorage.getItem('token')`. Un atac XSS putea fura tokenul și prelua sesiunea.

**Fix aplicat:**

**1. `auth.py` — login setează cookie HttpOnly:**
```python
@router.post("/login")
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    ...
    token = create_token(user.id)
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,        # inaccesibil din JavaScript
        samesite="lax",       # protectie CSRF
        max_age=7 * 24 * 3600,
        secure=False,         # → True dupa activarea HTTPS
    )
    return {"ok": True}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="auth_token", httponly=True, samesite="lax")
    return {"ok": True}
```

**2. `deps.py` — citim token din cookie, fallback la Authorization header:**
```python
def current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
) -> int:
    token = request.cookies.get("auth_token")   # frontend web
    if not token and credentials:
        token = credentials.credentials          # Swagger UI / API clients externi
    if not token:
        raise HTTPException(status_code=401, detail="Auth necesar")
    return decode_token(token)
```

**3. `script.js` — eliminat complet localStorage și Authorization headers:**
- `api()`: eliminat `localStorage.getItem('token')` și `headers['Authorization']`
- `fetchMe()`: eliminat headers manuale, simplificat la `credentials: 'include'`
- `changePassword()`: eliminat `localStorage.getItem('token')`
- `fetchOrders()`: eliminat `localStorage.getItem('token')`
- `hookLoginForm()`: eliminat `localStorage.setItem('token', data.access_token)`
- `logout handler`: eliminat `localStorage.removeItem('token')`

> **Notă importantă:** După activarea HTTPS (SEC-04), schimbă `secure=False` → `secure=True` în `auth.py` pentru protecție completă.

---

## ✅ SEC-04 — HTTPS în Nginx

**Fișiere modificate:** `nginx/conf.d/default.conf` · `docker-compose.yml`

**Fix aplicat:**

**`default.conf`:** Server block HTTP (port 80) redirectează tot traficul la HTTPS. Server block HTTPS (port 443) cu:
- TLS 1.2+, ciphers moderne
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- Suport Let's Encrypt webroot challenge (`/.well-known/acme-challenge/`)
- `http2 on` (HTTP/2)

**`docker-compose.yml`:** Expune portul 443, volum pentru certificate (`./nginx/certs`), volum pentru certbot webroot.

**Prerechizite certificate SSL (una din variante):**
```bash
# A) Productie — Let's Encrypt / Certbot:
certbot --nginx -d example.com -d www.example.com

# B) Dezvoltare/testare — certificat self-signed:
mkdir -p ./nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./nginx/certs/privkey.pem \
  -out    ./nginx/certs/fullchain.pem \
  -subj "/C=RO/ST=Bucuresti/O=RXP/CN=localhost"
```

---

## ✅ SEC-05 — Credențiale DB centralizate

**Fișiere modificate:** `backend/.env.docker` · `docker-compose.yml`

**Problemă:** `shopsecret` era hardcodat atât în `.env.docker` cât și în `docker-compose.yml`. Serviciul `db` nu citea din `.env.docker`, creând două surse de adevăr distincte care puteau diverge.

**Fix aplicat:**

**`docker-compose.yml`:** Serviciul `db` citește acum din `env_file: ./backend/.env.docker` (ca și `api`). Eliminat `environment:` cu default-ul hardcodat.

**`backend/.env.docker`:** Adăugate variabilele necesare PostgreSQL:
```
POSTGRES_USER=shopuser
POSTGRES_PASSWORD=SCHIMBA_PAROLA_BD_INAINTE_DE_PRODUCTIE
POSTGRES_DB=shopdb
DATABASE_URL=postgresql+psycopg2://shopuser:SCHIMBA_PAROLA_BD_INAINTE_DE_PRODUCTIE@db:5432/shopdb
```

Placeholder-urile sunt acum **evidențiate** și imposibil de trecut cu vederea. O singură sursă de adevăr pentru toate credențialele.

---

# PART III — TABLOU COMPLET FINAL

| ID | Sev | Descriere scurtă | Status Final |
|----|-----|-----------------|:------------:|
| BUG-01 | 🔴 | `createCodOrder` duplicat | ✅ |
| BUG-02 | 🔴 | Return dict incompatibil response_model cart | ✅ |
| BUG-03 | 🔴 | `/auth/me` crash user șters | ✅ |
| BUG-04 | 🔴 | Webhook: stoc negativ | ✅ |
| BUG-05 | 🔴 | Webhook: AttributeError produs șters | ✅ |
| BUG-06 | 🔴 | Race condition invoice_no duplicate | ✅ |
| BUG-07 | 🔴 | Shipping fee negativ | ✅ |
| BUG-08 | 🟠 | StatusUpdate fără validare enum | ✅ |
| BUG-09 | 🟠 | MAX_FILE_SIZE/MAX_FILES neverificate | ✅ |
| BUG-10 | 🟠 | Produs inactiv accesibil prin ID direct | ✅ |
| BUG-11 | 🟠 | Cart: cantitate > stoc la merge | ✅ |
| BUG-12 | 🟠 | changePassword endpoint lipsă | ✅ |
| BUG-13 | 🟠 | Race condition webhook | ✅ |
| BUG-14 | 🟠 | save_order=False → plată fără comandă | ✅ |
| BUG-15 | 🟠 | JWT_SECRET placeholder nerecunoscut | ✅ |
| BUG-16 | 🟡 | Două loop-uri, al doilea fără lock | ✅ |
| BUG-17 | 🟡 | clearServerCart duplicat | ✅ |
| BUG-18 | 🟡 | setupAccountPage conflicta | ✅ |
| BUG-19 | 🟡 | DB create_all fără retry | ✅ |
| BUG-20 | 🟡 | Fără response_model + eager loading admin invoices | ✅ |
| BUG-21 | 🟡 | Lazy loading înainte de PDF | ✅ |
| BUG-22 | 🟡 | fetchMe apela endpoint inexistent | ✅ |
| BUG-23 | 🟡 | Admin: fără auto-logout la 401 | ✅ |
| BUG-24 | 🔵 | datetime.utcnow() deprecat | ✅ |
| BUG-25 | 🔵 | default=[] mutable ARRAY | ✅ |
| BUG-26 | 🔵 | req_id coliziune posibilă | ✅ |
| BUG-27 | 🔵 | get_db() duplicat în routere | ✅ |
| BUG-28 | 🔵 | Nginx client_max_body_size lipsă | ✅ |
| BUG-29 | 🔵 | invoice_no path traversal | ✅ |
| BUG-30 | 🔵 | __get_validators__ Pydantic v1 | ✅ |
| SEC-01 | 🟠 | JWT în localStorage → XSS | ✅ |
| SEC-02 | 🟡 | Admin crash la produs null | ✅ |
| SEC-03 | 🟡 | Nginx prefix match permisiv | ✅ |
| SEC-04 | 🔵 | Fără HTTPS | ✅ |
| SEC-05 | 🔵 | DB credentials default | ✅ |
| NEW-01 | 🟡 | Invoice download fără eager loading | ✅ |
| NEW-02 | 🟡 | payload: dict → HTTP 500 la input invalid | ✅ |
| NEW-03 | 🟡 | "in_preparation" invalid în backend | ✅ |
| NEW-04 | 🟡 | OrderItemOut.product non-null → HTTP 500 | ✅ |
| NEW-05 | 🔵 | save_order câmp mort în schema | ✅ |
| NEW-06 | 🔵 | Foldere orfane la eroare upload | ✅ |
| NEW-07 | 🔵 | Placeholder JWT nerecunoscut | ✅ |

---

# PART IV — ACȚIUNI NECESARE ÎNAINTE DE LANSARE (checklist)

Codul este acum complet remediat. Înainte de deploy în producție, urmează acești pași manuali:

```
□ 1. Generează POSTGRES_PASSWORD:
     python -c "import secrets; print(secrets.token_urlsafe(32))"
     → Actualizează backend/.env.docker (POSTGRES_PASSWORD= și DATABASE_URL=)

□ 2. Generează JWT_SECRET:
     python -c "import secrets; print(secrets.token_urlsafe(48))"
     → Actualizează backend/.env.docker (JWT_SECRET=)

□ 3. Configurează certificate SSL:
     Optiunea A (productie): certbot --nginx -d domeniu.ro
     Optiunea B (dev): openssl req -x509 ... (vezi default.conf)
     → Plasează fullchain.pem + privkey.pem în nginx/certs/

□ 4. Dupa activarea HTTPS, schimbă în auth.py:
     secure=False → secure=True
     (linia: response.set_cookie(..., secure=False, ...))

□ 5. Actualizează CORS_ORIGINS în .env.docker:
     Adaugă domeniile tale https://domeniu.ro etc.
```

---

# Statistici finale

| Rundă | Rezolvat | Total | % |
|-------|:--------:|:-----:|:-:|
| Audit inițial → v1.0 | 0 | 33 | 0% |
| Runda 1 → v2.0 | 26 | 33+7=40 | 65% |
| Runda 2 → v3.0 | 36 | 40 | 90% |
| Runda 3 → **v4.0** | **40** | **40** | **100%** |

---

*Audit v4.0 — FINAL. Toate cele 40 de probleme identificate sunt rezolvate.*
*3 runde de fix-uri pe durata a 1 zi de audit progresiv.*
