// === CONFIG ===
const API_BASE = '/api';
const SHIPPING_MINOR = 2500; // 25 RON transport

function toMinor(v) { return v >= 100 ? v : Math.round(v * 100); }
function fromMinorText(min) { return (min / 100).toFixed(2).replace('.', ',') + ' RON'; }

// === HELPERS ===
function qs(sel) { return document.querySelector(sel); }
function fmtPrice(minor, currency = 'ron') { return (minor / 100).toFixed(2).replace('.', ',') + ' ' + currency.toUpperCase(); }
function param(name) { return new URLSearchParams(location.search).get(name); }
function imgOr(url) { return url || '/placeholder.jpg'; }
async function getJSON(path) {
  const r = await fetch(API_BASE + path, { cache: 'no-store', credentials: 'include' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// === GENERIC API (cu auth) ===
async function api(path, { method = 'GET', data = null } = {}) {
  const headers = {};
  // SEC-01: tokenul e trimis automat de browser prin cookie HttpOnly (credentials: 'include')
  // Nu mai e nevoie de localStorage sau Authorization header
  if (data) headers['Content-Type'] = 'application/json';
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: data ? JSON.stringify(data) : null,
    credentials: 'include',
    cache: 'no-store'
  });
  if (res.status === 401) throw new Error('NEAUTENTIFICAT');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json().catch(() => ({}));
}

// === CART API ===
async function cartGet() {
  const data = await api('/cart', { method: 'GET' });
  // backend returnează lista direct; normalizăm la array
  return Array.isArray(data) ? data : (data.items || []);
}
async function cartAdd(productId, quantity) { return api('/cart', { method: 'POST', data: { product_id: productId, quantity } }); }
async function cartUpdate(itemId, quantity) { return api(`/cart/${itemId}`, { method: 'PUT', data: { quantity } }); }
async function cartRemove(itemId) { return api(`/cart/${itemId}`, { method: 'DELETE' }); }

// === COD ORDER HELPERS (globale) ===
async function createCodOrder(payload) {
  return api('/orders/checkout-cod', { method: 'POST', data: payload });
}
async function clearServerCart() {
  try { await api('/cart', { method: 'DELETE' }); } catch (_) { }
}
function updateCodTotals(items) {
  const productsMinor = items.reduce((sum, it) => {
    const prod = it.product || {};
    const unit = prod.price ?? it.price ?? 0;
    const qty = it.quantity ?? it.qty ?? 1;
    return sum + toMinor(unit) * qty;
  }, 0);
  const totalMinor = productsMinor + SHIPPING_MINOR;
  const sp = document.querySelector('#sum-products');
  const ss = document.querySelector('#sum-shipping');
  const st = document.querySelector('#sum-total');
  if (sp) sp.textContent = fromMinorText(productsMinor);
  if (ss) ss.textContent = fromMinorText(SHIPPING_MINOR);
  if (st) st.textContent = fromMinorText(totalMinor);
}

// === CART UI ===
function setCartCounterFromItems(items = []) {
  const n = items.reduce((s, it) => s + (it.quantity || it.qty || 0), 0);
  const el = document.querySelector('#cart-count');
  if (el) el.textContent = String(n);
}

// === HOME: categorie card-uri simple ===
function renderCategories() {
  const host = qs('#category-list'); if (!host) return;

  const categories = [
    { name: 'Car Tuning', desc: 'Accesorii & piese personalizate. Filtrează după marcă.', slug: 'car_tuning' },
    { name: 'Suporti număr', desc: 'Suporturi magnetice pentru numere de înmatriculare.', slug: 'suporti_numar' }
  ];

  host.innerHTML = `
    <style>
      .category-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
      .cat-card{border:1px solid #eee;border-radius:14px;padding:16px;background:#fff}
      .cat-card h3{margin:0 0 8px}
      .cat-card p{margin:0 0 12px;color:#555}
      .cat-card a{display:inline-block;padding:10px 12px;border-radius:10px;border:1px solid #ccc;text-decoration:none}
    </style>
    <div class="category-grid">
      ${categories.map(c => `
        <div class="cat-card">
          <h3>${c.name}</h3>
          <p>${c.desc}</p>
          <a href="category.html?slug=${c.slug}">Vezi produsele</a>
        </div>
      `).join('')}
    </div>
  `;
}

// === GRID produse listă ===
function renderProductsGrid(host, list) {
  host.innerHTML = `
    <style>
      .product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
      .card{border:1px solid #eee;border-radius:12px;padding:12px;background:#fff}
      .card img{width:100%;height:160px;object-fit:cover;border-radius:10px;background:#f4f4f4;margin-bottom:8px}
      .card h4{margin:0 0 6px}
      .card p{margin:0 0 8px;color:#555;font-size:14px;min-height:36px}
      .row{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .btn{padding:8px 10px;border:1px solid #ccc;border-radius:8px;background:#fff;text-decoration:none}
    </style>
    <div class="product-grid">
      ${list.map(p => `
        <div class="card">
          <img src="${escapeHtml(imgOr(p.image_url))}" alt="${escapeHtml(p.name)}">
          <h4>${escapeHtml(p.name)}</h4>
          <p>${escapeHtml(p.description || '')}</p>
          <div class="row">
            <strong>${fmtPrice(p.price, p.currency)}</strong>
            <a class="btn" href="product.html?id=${p.id}">Detalii</a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// === CATEGORY page ===
async function setupCategoryPage() {
  const host = qs('#products-list'); if (!host) return;
  const slug = param('slug');
  const titleEl = qs('#category-title');
  const descEl = qs('#category-description');
  const filterWrap = qs('#filter-container');
  const meta = {
    car_tuning: { title: 'Car Tuning', desc: 'Accesorii & piese personalizate. Filtrează după marcă.' },
    suporti_numar: { title: 'Suporti număr', desc: 'Suporturi magnetice pentru numere de înmatriculare.' }
  };
  const m = meta[slug] || { title: 'Categorie', desc: '' };
  titleEl.textContent = m.title;
  descEl.textContent = m.desc;

  let products = await getJSON(`/products?category=${encodeURIComponent(slug)}`);

  if (slug === 'car_tuning') {
    const currentTag = param('tag') || '';
    const allTags = Array.from(new Set(products.flatMap(p => (p.tags || [])))).sort();
    filterWrap.innerHTML = '';
    const label = document.createElement('label'); label.textContent = 'Marcă: '; label.style.marginRight = '8px';
    const select = document.createElement('select');
    // MED-03: escapeHtml on tag values (admin-set, but defence in depth)
    select.innerHTML = `<option value="">(toate)</option>` + allTags.map(t => `<option ${t === currentTag ? 'selected' : ''} value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    select.onchange = async () => {
      const tag = select.value || '';
      const url = `/products?category=${encodeURIComponent(slug)}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`;
      const list = await getJSON(url);
      renderProductsGrid(host, list);
      history.replaceState({}, '', `category.html?slug=${slug}${tag ? `&tag=${tag}` : ''}`);
    };
    filterWrap.append(label, select);
    if (currentTag) products = await getJSON(`/products?category=${encodeURIComponent(slug)}&tag=${encodeURIComponent(currentTag)}`);
  } else {
    filterWrap.innerHTML = '';
  }
  renderProductsGrid(host, products);
}

// === PRODUCT page cu carusel & zoom & buton coș ===
async function setupProductPage() {
  const wrap = qs('#product-detail'); if (!wrap) return;
  const id = parseInt(param('id') || '0', 10); if (!id) { wrap.textContent = 'Produs inexistent.'; return; }
  let p; try { p = await getJSON('/products/' + id); } catch { wrap.textContent = 'Produs inexistent.'; return; }
  const imgs = (Array.isArray(p.images) && p.images.length ? p.images : [p.image_url]).filter(Boolean);

  wrap.innerHTML = `
    <div class="pg">
      <section class="pg-media">
        <div class="carousel" id="car">
          <button class="nav prev" id="carPrev" aria-label="Înapoi">‹</button>
          <div class="track" id="carTrack"></div>
          <button class="nav next" id="carNext" aria-label="Înainte">›</button>
          <div class="dots" id="carDots"></div>
        </div>
      </section>
      <section class="pg-info">
        <h2>${escapeHtml(p.name || 'Produs')}</h2>
        <div class="pg-price">${fmtPrice(p.price, p.currency)}</div>
        <div class="pg-desc">${escapeHtml(p.description || '')}</div>
        <div class="pg-actions">
          <input id="qty" type="number" min="1" value="1">
          <button id="addToCartBtn" class="btn">Adaugă în coș</button>
        </div>
      </section>
    </div>
    <div class="lightbox" id="lb" hidden>
      <button class="close" id="lbClose">✕</button>
      <div class="lb-stage" id="lbStage">
        <img class="lb-img" id="lbImg" alt="">
      </div>
    </div>
  `;

  // add-to-cart (server)
  const qtyEl = document.querySelector('#qty');
  const addBtn = document.querySelector('#addToCartBtn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const qty = Math.max(1, parseInt(qtyEl?.value || '1', 10));
      try {
        await cartAdd(p.id, qty);
        const cart = await cartGet();
        setCartCounterFromItems(cart.items || cart || []);
        alert('Produs adăugat în coș');
      } catch (e) {
        if (String(e.message).includes('NEAUTENTIFICAT')) {
          location.href = 'login.html';
        } else {
          alert('Nu am putut adăuga în coș');
          console.error(e);
        }
      }
    });
  }

  // carusel + swipe
  const track = qs('#carTrack'), dots = qs('#carDots'), prev = qs('#carPrev'), next = qs('#carNext');
  // CRIT-04: escapeHtml prevents stored XSS via malicious image_url in product data
  track.innerHTML = imgs.map(src => `<div class="slide"><img src="${escapeHtml(src)}" alt=""></div>`).join('');
  dots.innerHTML = imgs.map((_, i) => `<button class="dot" data-i="${i}" ${i === 0 ? 'aria-current="true"' : ''}></button>`).join('');
  let i = 0, n = imgs.length, w = () => track.clientWidth;
  function go(k) { i = Math.max(0, Math.min(n - 1, k)); track.style.transform = `translateX(${-i * w()}px)`; prev.disabled = i === 0; next.disabled = i === n - 1;[...dots.children].forEach((d, di) => d.toggleAttribute('aria-current', di === i)); }
  window.addEventListener('resize', () => go(i));
  prev.onclick = () => go(i - 1);
  next.onclick = () => go(i + 1);
  dots.onclick = e => { const d = e.target.closest('.dot'); if (d) go(+d.dataset.i); };
  go(0);
  let sx = 0, dx = 0, dragging = false;
  track.addEventListener('pointerdown', e => { dragging = true; sx = e.clientX; dx = 0; track.style.transition = 'none'; track.setPointerCapture(e.pointerId); });
  track.addEventListener('pointermove', e => { if (!dragging) return; dx = e.clientX - sx; track.style.transform = `translateX(${-(i * w()) + dx}px)`; });
  function endDrag() { if (!dragging) return; dragging = false; track.style.transition = ''; if (Math.abs(dx) > w() * 0.15) { go(i + (dx < 0 ? 1 : -1)); } else { go(i); } }
  track.addEventListener('pointerup', endDrag); track.addEventListener('pointercancel', endDrag); track.addEventListener('pointerleave', endDrag);

  // lightbox + zoom
  track.addEventListener('click', e => { const img = e.target.closest('img'); if (!img) return; const lb = qs('#lb'), lbImg = qs('#lbImg'); lb.hidden = false; lbImg.src = imgs[i]; zoomReset(); });
  qs('#lbClose').onclick = () => qs('#lb').hidden = true;
  let scale = 1, tx = 0, ty = 0, startX = 0, startY = 0, panning = false;
  const lbStage = qs('#lbStage'), lbImg = qs('#lbImg');
  function apply() { lbImg.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; lbImg.style.top = '50%'; lbImg.style.left = '50%'; }
  function zoomReset() { scale = 1; tx = 0; ty = 0; apply(); }
  lbStage.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.1;
    const ns = Math.min(5, Math.max(1, scale + delta));
    const rect = lbStage.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2 - tx;
    const cy = e.clientY - rect.top - rect.height / 2 - ty;
    tx -= cx * (ns / scale - 1); ty -= cy * (ns / scale - 1);
    scale = ns; apply();
  }, { passive: false });
  lbStage.addEventListener('dblclick', () => { scale = scale > 1 ? 1 : 2; tx = ty = 0; apply(); });
  lbStage.addEventListener('pointerdown', e => { panning = true; startX = e.clientX - tx; startY = e.clientY - ty; lbStage.setPointerCapture(e.pointerId); });
  lbStage.addEventListener('pointermove', e => { if (!panning) return; tx = e.clientX - startX; ty = e.clientY - startY; apply(); });
  function endPan() { panning = false; }
  lbStage.addEventListener('pointerup', endPan); lbStage.addEventListener('pointercancel', endPan); lbStage.addEventListener('pointerleave', endPan);
  document.addEventListener('keydown', e => { if (qs('#lb').hidden) { if (e.key === 'ArrowLeft') go(i - 1); if (e.key === 'ArrowRight') go(i + 1); return; } if (e.key === 'Escape') qs('#lb').hidden = true; });
}

// === CART PAGE (server) — complet, cu checkout ramburs ===
async function renderCartPageServer() {
  const host = document.querySelector('#cart-items');
  if (!host) return; // nu suntem pe cart.html
  // Folosim funcțiile globale: createCodOrder, clearServerCart, updateCodTotals, SHIPPING_MINOR

  try {
    const items = await cartGet(); // cartGet normalizează la array

    // counter din header
    setCartCounterFromItems(items);

    // coș gol
    if (!items.length) {
      host.innerHTML = '<p>Coșul tău este gol.</p>';
      const t = document.querySelector('#cart-total');
      if (t) t.textContent = '0,00 RON';

      // dezactivează butonul și ascunde formularul
      const btn = document.querySelector('#checkout-btn');
      if (btn) btn.disabled = true;
      const panel = document.querySelector('#cod-panel');
      if (panel) panel.style.display = 'none';
      return;
    }

    // rânduri coș
    host.innerHTML = items.map(it => {
      const prod = it.product || {};
      const name = prod.name || it.name || 'Produs';
      const img = prod.image_url || it.image || '';
      const unit = prod.price ?? it.price ?? 0;               // bani sau RON
      const qty = it.quantity ?? it.qty ?? 1;
      const minor = toMinor(unit);
      const subMin = minor * qty;

      return `
        <div class="cart-item" data-id="${it.id}">
          <img src="${escapeHtml(img)}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:8px">
          <div class="cart-item-name">${escapeHtml(name)}</div>

          <div class="cart-item-controls">
            <button class="minus">−</button>
            <span class="item-qty">${qty}</span>
            <button class="plus">+</button>
          </div>

          <div class="cart-item-subtotal">${fromMinorText(subMin)}</div>
          <button class="cart-item-remove">Șterge</button>
        </div>
      `;
    }).join('');

    // calculează totalul din UI (din subtotale)
    function recalcUI() {
      const rows = [...host.querySelectorAll('.cart-item')];
      let totalMinor = 0;
      for (const r of rows) {
        const txt = r.querySelector('.cart-item-subtotal').textContent
          .replace(/[^\d,]/g, '').replace(',', '.');
        const val = Math.round((parseFloat(txt) || 0) * 100);
        totalMinor += val;
      }
      const totEl = document.querySelector('#cart-total');
      if (totEl) totEl.textContent = fromMinorText(totalMinor);
      return totalMinor;
    }
    recalcUI();

    // +/- / șterge
    host.onclick = async (e) => {
      const row = e.target.closest('.cart-item');
      if (!row) return;
      const itemId = row.dataset.id;

      if (e.target.classList.contains('cart-item-remove')) {
        await cartRemove(itemId);
        await renderCartPageServer();
        return;
      }

      if (e.target.classList.contains('plus') || e.target.classList.contains('minus')) {
        const qtyEl = row.querySelector('.item-qty');
        let qty = parseInt(qtyEl.textContent, 10);
        qty += e.target.classList.contains('plus') ? 1 : -1;
        qty = Math.max(1, qty);
        await cartUpdate(itemId, qty);

        const cart2 = await cartGet();
        setCartCounterFromItems(cart2);
        await renderCartPageServer();
      }
    };

    // butonul "Continuă la plată" → deschide formularul de ramburs
    const checkoutBtn = document.querySelector('#checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.disabled = items.length === 0;
      checkoutBtn.textContent = 'Continuă la plată';
      checkoutBtn.onclick = () => {
        const panel = document.querySelector('#cod-panel');
        if (panel) {
          panel.style.display = 'block';
          updateCodTotals(items);
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
    }

    // submit formular → creează comanda COD
    const codForm = document.querySelector('#cod-form');
    if (codForm) {
      codForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(codForm);
        const full_name = (fd.get('full_name') || '').trim();
        const phone = (fd.get('phone') || '').trim();
        const address = (fd.get('address') || '').trim();
        if (!full_name || !phone || !address) { alert('Completează toate câmpurile.'); return; }

        const orderPayload = {
          full_name: full_name,
          phone: phone,
          address: address,
          shipping_fee_minor: SHIPPING_MINOR
        };

        // blochează butonul din formular
        const submitBtn = codForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
          const order = await createCodOrder(orderPayload);
          const orderId = order?.id ?? order?.order_id ?? null;

          await clearServerCart();

          if (orderId) {
            location.href = 'success.html?id=' + encodeURIComponent(orderId);
          } else {
            alert('Comanda a fost înregistrată. Mulțumim!');
            location.href = 'account.html';
          }
        } catch (err) {
          console.error('createCodOrder error:', err);
          alert('Nu am putut plasa comanda ramburs.\n' + (err.message || ''));
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      };
    }
  } catch (e) {
    if (e.status === 401 || String(e.message).includes('NEAUTENTIFICAT')) {
      location.href = 'login.html';
      return;
    }
    console.error(e);
    host.innerHTML = '<p>Eroare la încărcarea coșului.</p>';
    const btn = document.querySelector('#checkout-btn');
    if (btn) btn.disabled = true;
    const panel = document.querySelector('#cod-panel');
    if (panel) panel.style.display = 'none';
  }
}



// === AUTH v5 (JSON cu fallback la form) ===

async function loginJSON(email, password) {
  return fetch(API_BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });
}
async function loginForm(email, password) {
  const form = new URLSearchParams();
  form.set('username', email);
  form.set('password', password);
  return fetch(API_BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    credentials: 'include'
  });
}
async function registerJSON(email, password, name = '') {
  return fetch(API_BASE + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
    credentials: 'include'
  });
}
async function registerForm(email, password, name = '') {
  const form = new URLSearchParams();
  form.set('email', email);
  form.set('password', password);
  form.set('name', name);
  return fetch(API_BASE + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    credentials: 'include'
  });
}

function hookLoginForm() {
  const form = document.querySelector('#login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = (fd.get('email') || '').trim();
    const password = (fd.get('password') || '').trim();
    if (!email || !password) { alert('Completează email și parolă.'); return; }

    try {
      let res = await loginJSON(email, password);
      if (!res.ok && (res.status === 415 || res.status === 422)) res = await loginForm(email, password);
      if (!res.ok) throw new Error((await res.text()) || ('HTTP ' + res.status));
      // SEC-01: tokenul e setat de backend ca cookie HttpOnly — nu mai salvam in localStorage
      location.href = 'index.html';
    } catch (err) {
      alert('Autentificare eșuată.\n' + err.message);
      console.error(err);
    }
  });
}

function hookRegisterForm() {
  const form = document.querySelector('#register-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('#register-email')?.value.trim() || '';
    const pass1 = document.querySelector('#register-password')?.value || '';
    const pass2 = document.querySelector('#register-password-confirm')?.value || '';
    const name = '';
    if (!email || !pass1) { alert('Completează email și parolă.'); return; }
    if (pass1 !== pass2) { alert('Parolele nu coincid.'); return; }

    try {
      let res = await registerJSON(email, pass1, name);
      if (!res.ok && (res.status === 415 || res.status === 422)) res = await registerForm(email, pass1, name);
      if (!res.ok) throw new Error((await res.text()) || ('HTTP ' + res.status));
      alert('Cont creat. Te poți autentifica.');
      location.href = 'login.html';
    } catch (err) {
      alert('Înregistrare eșuată.\n' + err.message);
      console.error(err);
    }
  });
}

// === INIT ===
async function initHeaderCartCount() {
  try {
    const cart = await cartGet();
    setCartCounterFromItems(cart.items || cart || []);
  } catch { }
}

// ====== AUTH UI (me + header) ======
function escapeHtml(s = '') { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function fetchMe() {
  try {
    // SEC-01: cookie HttpOnly trimis automat de browser (credentials: 'include')
    // BUG-22: fara fallback pe /auth/user care nu exista in backend
    const r = await fetch(API_BASE + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (r.ok) return await r.json();
  } catch (_) { }
  return null;
}

function renderAuthHeader(user) {
  const box = document.querySelector('#user-nav');
  if (!box) return;
  if (user) {
    const label = escapeHtml(user.email || user.name || 'Cont');
    box.innerHTML = `<a href="account.html" id="user-email">${label}</a>`;
  } else {
    box.innerHTML = `<a href="login.html">Login</a>`;
  }
}

async function changePassword(current_password, new_password) {
  // SEC-01: cookie HttpOnly trimis automat de browser (credentials: 'include')
  const headers = { 'Content-Type': 'application/json' };

  // încercăm POST /auth/change-password
  let res = await fetch(API_BASE + '/auth/change-password', {
    method: 'POST', headers, credentials: 'include',
    body: JSON.stringify({ current_password, new_password })
  });
  // fallback: PUT /auth/password
  if (!res.ok) {
    res = await fetch(API_BASE + '/auth/password', {
      method: 'PUT', headers, credentials: 'include',
      body: JSON.stringify({ old_password: current_password, new_password })
    });
  }
  if (!res.ok) throw new Error(await res.text() || ('HTTP ' + res.status));
  return true;
}

async function fetchOrders() {
  // SEC-01: cookie HttpOnly trimis automat de browser (credentials: 'include')
  // GET /orders sau /orders/me
  let r = await fetch(API_BASE + '/orders', { credentials: 'include', cache: 'no-store' });
  if (!r.ok) {
    r = await fetch(API_BASE + '/orders/me', { credentials: 'include', cache: 'no-store' });
  }
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const data = await r.json();
  return Array.isArray(data) ? data : (data.orders || []);
}

function statusBadge(s = '') {
  const t = String(s || '').toLowerCase();
  const map = {
    pending: 'În așteptare',
    processing: 'În procesare',
    paid: 'Plătită',
    shipped: 'Expediată',
    delivered: 'Livrată',
    cancelled: 'Anulată'
  };
  return map[t] || s || '—';
}

function renderOrdersList(list) {
  const host = document.querySelector('#orders-host');
  if (!host) return;
  if (!list.length) {
    host.innerHTML = '<p>Nu ai comenzi încă.</p>';
    return;
  }
  host.innerHTML = list.map(o => {
    const id = o.id ?? o.order_id ?? '—';
    const created = (o.created_at || o.created || o.date || '').toString().replace('T', ' ').replace('Z', '');
    const totalMinor = (o.total_minor ?? o.total ?? 0);
    const totalText = minorToText(totalMinor, o.currency || 'RON');
    const statusText = statusBadge(o.status);
    const lines = (o.items || []).map(it => {
      const name = it.name || it.product_name || (it.product?.name) || 'Produs';
      const qty = it.quantity ?? it.qty ?? 1;
      return `<li>${escapeHtml(name)} × ${qty}</li>`;
    }).join('');
    return `
      <div class="order-card">
        <h3>Comanda #${escapeHtml(String(id))}</h3>
        <p><strong>Status:</strong> ${escapeHtml(statusText)}</p>
        <p><strong>Total:</strong> ${escapeHtml(totalText)}</p>
        ${created ? `<p><strong>Data:</strong> ${escapeHtml(created)}</p>` : ''}
        ${lines ? `<ul>${lines}</ul>` : ''}
      </div>
    `;
  }).join('<hr>');
}

async function renderAccountPage() {
  const onAccount = !!document.querySelector('#change-pass-form');
  if (!onAccount) return;

  // header & email
  const me = await fetchMe();
  renderAuthHeader(me);
  const emailEl = document.querySelector('#account-email');
  if (emailEl && me?.email) emailEl.textContent = me.email;

  // logout
  document.querySelector('#logout-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    // SEC-01: /auth/logout sterge cookie-ul HttpOnly de pe server
    try { await fetch(API_BASE + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (_) { }
    location.href = 'index.html';
  });

  // schimbă parola
  const passForm = document.querySelector('#change-pass-form');
  passForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(passForm);
    const cur = (fd.get('current_password') || '').trim();
    const n1 = (fd.get('new_password') || '').trim();
    const n2 = (fd.get('new_password2') || '').trim();
    if (!cur || !n1) { alert('Completează toate câmpurile.'); return; }
    if (n1 !== n2) { alert('Parolele nu coincid.'); return; }
    try {
      await changePassword(cur, n1);
      alert('Parola a fost schimbată.');
      passForm.reset();
    } catch (err) {
      alert('Nu am putut schimba parola.\n' + err.message);
      console.error(err);
    }
  });

  // comenzi
  try {
    const orders = await fetchOrders();
    renderOrdersList(orders);
  } catch (err) {
    const host = document.querySelector('#orders-host');
    if (host) host.innerHTML = '<p>Eroare la încărcarea comenzilor.</p>';
    console.error(err);
  }
}

// === HOME: Produse Populare (fără request cu ?tag=…) ===
async function setupHomePopular() {
  const host = qs('#popular-list');
  if (!host) return;

  try {
    // 1 request simplu
    const all = await getJSON('/products');
    const arr = Array.isArray(all) ? all : (all.items || all.data || []);

    // filtrăm local după tag 'popular' (merge și listă și string)
    const popular = arr.filter(p => {
      const raw = p.tags ?? p.tag ?? [];
      if (Array.isArray(raw)) return raw.some(t => String(t).toLowerCase() === 'popular');
      return String(raw).toLowerCase().split(/[,;|]\s*/).includes('popular');
    });

    if (!popular.length) {
      host.innerHTML = '<p>Nu sunt produse populare momentan.</p>';
      return;
    }

    // opțional: limitează la 4 pe homepage
    renderProductsGrid(host, popular.slice(0, 4));
  } catch (err) {
    console.error('Popular load error:', err);
    host.innerHTML = '<p>Nu am putut încărca produsele populare.</p>';
  }
}

// === Checkout cu fallback pe "ramburs" (fără Stripe) ===
async function startCheckout() {
  // dacă backend-ul tău are Stripe configurat mai târziu, poți lăsa payload-ul ăsta:
  const payload = {
    success_url: location.origin + '/success.html',
    cancel_url: location.origin + '/cart.html',
    return_url: location.origin + '/success.html'
  };

  try {
    // încercăm plăți online DOAR dacă endpointul e configurat;
    // dacă nu e, cădem în catch și facem comanda COD
    const data = await api('/payments/create-payment-intent', { method: 'POST', data: payload });

    const url = data.checkout_url || data.url || data.redirect_url || data.session_url;
    if (url) { location.href = url; return; }

    if (data.client_secret || data.payment_intent_client_secret) {
      alert('Plata online este activă dar UI-ul de card nu e implementat. Trecem pe ramburs.');
      // continuă pe ramburs:
      const order = await createCodOrder();
      finalizeOrder(order);
      return;
    }

    // dacă răspunsul e ciudat, tot pe COD mergem
    const order = await createCodOrder();
    finalizeOrder(order);
  } catch (err) {
    // Stripe neconfigurat / 400 / 404 / etc → creăm comandă COD
    const msg = String(err && err.message || '');
    if (msg.includes('Stripe') || /400|404|422|501/.test(msg) || msg.includes('neconfigurat')) {
      try {
        const order = await createCodOrder();
        finalizeOrder(order);
        return;
      } catch (e2) {
        console.error('createCodOrder error:', e2);
        alert('Nu am putut plasa comanda ramburs.\n' + (e2.message || ''));
        return;
      }
    }
    console.error('checkout error:', err);
    alert('Nu am putut porni plata.\n' + msg);
  }
}

// redirect / confirmare după creare comandă
function finalizeOrder(order) {
  const id = order?.id ?? order?.order_id ?? null;
  if (id) {
    // poți face o pagină success sau trimite la cont
    location.href = 'success.html?id=' + encodeURIComponent(id);
  } else {
    alert('Comanda a fost înregistrată.');
    location.href = 'account.html';
  }
}


// BUG-01: a doua definitie createCodOrder() a fost stearsa (suprascriau functia corecta de la linia 48)
// BUG-17: a doua definitie clearServerCart() a fost stearsa (duplicat pur)
// BUG-18: setupAccountPage() eliminata — renderAccountPage() gestioneaza deja comenzile

function minorToText(v, curr = 'RON') {
  const n = Number(v || 0);
  return (n / 100).toFixed(2).replace('.', ',') + ' ' + curr.toUpperCase();
}

// === MOBILE MENU ===
function setupMobileMenu() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  toggle.setAttribute('aria-expanded', 'false');

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Event delegation — catches links injected dynamically by renderAuthHeader
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Escape key closes menu and returns focus to toggle
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });

  // Outside click closes menu
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupMobileMenu();
  const me = await fetchMe();
  renderAuthHeader(me);
  hookLoginForm();
  hookRegisterForm();
  renderCategories();
  setupCategoryPage();
  setupProductPage();
  renderCartPageServer();
  setupHomePopular();
  initHeaderCartCount();
  renderAccountPage(); // singura functie de cont — gestioneaza email, parola, comenzi
});
