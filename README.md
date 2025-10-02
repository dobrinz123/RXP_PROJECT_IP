# RXP Combined (Frontend + Backend)

## Ce e inclus
- `frontend/` — site-ul tău static RXP_CUSOTOM3D
- `backend/` — API FastAPI (shop_project_full) cu Postgres
- `nginx/` — config care servește frontend-ul la `/` și proxiază API-ul la `/api`

## Rulare locală (totul împreună)
```bash
cd RXP_combined
# setează secret în backend/.env.docker
sed -i 's/JWT_SECRET=.*/JWT_SECRET=schimba-asta-cu-un-random-lung/' backend/.env.docker

docker compose up --build
# Frontend: http://localhost:8080
# API: http://localhost:8080/api  (proxied) sau http://localhost:8000 (direct din container, dacă expui)
# Swagger: http://localhost:8080/api/docs
```

## Integrare Frontend -> Backend
În JavaScript, folosește baza `/api` (relativă), ex.:
```js
const API = '/api'; // datorită Nginx, ajunge la FastAPI

// login
fetch(API + '/auth/login', { method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({email, password})
}).then(r=>r.json()).then(d => localStorage.setItem('token', d.access_token));
```

> Poți migra treptat: păstrezi funcțiile locale pentru produse/categorii, dar folosești API pentru auth/coș/comenzi. Când ești gata, înlocuiești și produsele cu apeluri la `/api/products`.

## Deploy pe domeniu
- servește `web` (nginx) pe `api.rxpcustom3d.ro` sau pe `rxpcustom3d.ro` (și păstrezi proxyul `/api` către containerul `api`).
- adaugă TLS (Let’s Encrypt) la Nginx (vezi ghidul anterior).

