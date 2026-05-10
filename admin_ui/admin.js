/* ========= helpers ========= */
const API = location.origin + '/api';
let TOKEN = '';
let ADMIN_EMAIL = '';

function escAttr(s) { return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;'); }

/* ========= status labels & badges ========= */
const STATUS_LABEL = {
  created: 'Creată',
  pending: 'În așteptare',
  paid: 'Plătită',
  processing: 'În procesare',
  shipped: 'Expediată',
  delivered: 'Livrată',
  cancelled: 'Anulată',
  canceled: 'Anulată'
};

function statusBadge(status) {
  const key = (status || '').toString().toLowerCase();
  const label = STATUS_LABEL[key] || status || '—';
  const cls = `status-${key}`;
  return `<span class="status-badge ${cls}">${escAttr(label)}</span>`;
}

/* ========= toast ========= */
function toast(message, type = 'info', duration = 3200) {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icon = type === 'success'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : type === 'error'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  el.innerHTML = `${icon}<span>${escAttr(message)}</span>`;
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 200);
  }, duration);
}

function alertApiError(res, extra) {
  if (res.status === 401) { lockAdmin(); return Promise.resolve(); }
  let msg = `Eroare ${res.status}`;
  return res.json().then(j => {
    if (j?.detail) msg += `: ${typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)}`;
    if (extra) console.error(extra, j);
    toast(msg, 'error');
  }).catch(() => toast(msg, 'error'));
}

/* ========= empty/loading states ========= */
function emptyState(host, opts) {
  host.innerHTML = `
    <div class="state-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${opts.icon || '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}</svg>
      <h4>${escAttr(opts.title)}</h4>
      <p>${escAttr(opts.body || '')}</p>
    </div>`;
}

function loadingState(host, label = 'Se încarcă…') {
  host.innerHTML = `
    <div class="state-loading">
      <div class="spinner"></div>
      <h4>${escAttr(label)}</h4>
    </div>`;
}

/* ========= AUTH BLOCKER LOGIC ========= */
function unlockAdmin(token, email) {
  TOKEN = token;
  ADMIN_EMAIL = email || '';
  sessionStorage.setItem('admintoken', token);
  sessionStorage.setItem('adminemail', email || '');
  document.getElementById('auth-blocker').style.display = 'none';
  document.getElementById('admin-content').classList.add('unlocked');
  document.getElementById('admin-email-display').textContent = email || '';
  const av = document.getElementById('admin-avatar');
  if (av) av.textContent = (email || 'A').trim().charAt(0).toUpperCase();
}

function lockAdmin() {
  TOKEN = '';
  ADMIN_EMAIL = '';
  sessionStorage.removeItem('admintoken');
  sessionStorage.removeItem('adminemail');
  document.getElementById('auth-blocker').style.display = 'flex';
  document.getElementById('admin-content').classList.remove('unlocked');
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  errEl.classList.remove('is-visible');
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value = '';
}

function showLoginError(msg) {
  const errEl = document.getElementById('login-error');
  errEl.textContent = msg;
  errEl.classList.toggle('is-visible', !!msg);
}

async function tryAutoRestore() {
  const saved = sessionStorage.getItem('admintoken');
  if (!saved) return;
  try {
    const r = await fetch(API + '/auth/me', {
      headers: { Authorization: 'Bearer ' + saved },
      cache: 'no-store'
    });
    if (r.ok) {
      const data = await r.json();
      if (data.is_admin) {
        unlockAdmin(saved, data.email || sessionStorage.getItem('adminemail'));
        return;
      }
    }
  } catch (_) { }
  sessionStorage.removeItem('admintoken');
}

async function handleLogin(e) {
  e.preventDefault();
  const emailEl = document.getElementById('login-email');
  const passEl = document.getElementById('login-pass');
  const btn = document.getElementById('login-btn');
  const email = emailEl.value.trim();
  const pass = passEl.value;

  if (!email || !pass) { showLoginError('Completează email și parolă.'); return; }

  btn.disabled = true;
  btn.textContent = 'Se autentifică…';
  showLoginError('');

  try {
    const r = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });

    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      showLoginError(d.detail || 'Email sau parolă greșite.');
      return;
    }

    const d = await r.json();
    if (!d.access_token) { showLoginError('Răspuns invalid de la server.'); return; }

    const meRes = await fetch(API + '/auth/me', {
      headers: { Authorization: 'Bearer ' + d.access_token },
      cache: 'no-store'
    });

    if (meRes.ok) {
      const me = await meRes.json();
      if (!me.is_admin) {
        showLoginError('Contul nu are permisiuni de administrator.');
        return;
      }
      unlockAdmin(d.access_token, me.email || email);
      showTab('active');
    } else {
      const testRes = await fetch(API + '/admin/products', {
        headers: { Authorization: 'Bearer ' + d.access_token }
      });
      if (testRes.ok) {
        unlockAdmin(d.access_token, email);
        showTab('active');
      } else {
        showLoginError('Contul nu are permisiuni de administrator.');
      }
    }
  } catch (err) {
    console.error(err);
    showLoginError('Eroare de conexiune. Verifică serverul.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Autentificare';
  }
}

/* ========= tabs ========= */
function showTab(key) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.t === key);
  });
  ['active', 'done', 'invoices', 'products', 'settings'].forEach(x => {
    document.getElementById('panel-' + x).style.display = (x === key) ? '' : 'none';
  });
  if (key === 'active') loadOrders('active');
  if (key === 'done') loadOrders('done');
  if (key === 'invoices') loadInvoices();
  if (key === 'products') loadProducts();
  if (key === 'settings') loadCompanySettings();
}

/* ========= orders ========= */
function fmtMoney(minor, currency) {
  const n = (Number(minor) || 0) / 100;
  return n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (currency || 'RON').toUpperCase();
}

async function loadOrders(scope) {
  const sel = scope === 'active' ? document.getElementById('statusActive') : document.getElementById('statusDone');
  const host = scope === 'active' ? document.getElementById('activeList') : document.getElementById('doneList');
  loadingState(host, 'Încărcăm comenzile…');

  const s = sel.value;
  const url = API + '/admin/orders?scope=' + scope + (s ? '&status=' + encodeURIComponent(s) : '');
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!r.ok) { host.innerHTML = ''; return alertApiError(r, 'loadOrders'); }
  const data = await r.json();

  if (!data.length) {
    return emptyState(host, {
      icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/>',
      title: scope === 'active' ? 'Nicio comandă activă' : 'Nicio comandă finalizată',
      body: scope === 'active'
        ? 'Comenzile noi vor apărea automat aici.'
        : 'Aici vei vedea comenzile livrate sau anulate.'
    });
  }

  const allStatuses = ['created', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'canceled'];

  host.innerHTML = `
  <div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>Comandă</th>
        <th>Status</th>
        <th>Total</th>
        <th>Produse</th>
        <th>Schimbă status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
    ${data.map(o => `
      <tr>
        <td><span class="order-id">#${o.id}</span></td>
        <td>${statusBadge(o.status)}</td>
        <td><span class="price">${fmtMoney(o.total_amount, o.currency)}</span></td>
        <td><div class="items-list">${o.items.map(i => `${escAttr(i.product?.name ?? '(produs șters)')} <span class="qty-x">×</span> ${i.quantity}`).join('<br>')}</div></td>
        <td>
          <div class="inline-row">
            <select id="st_${o.id}">
              ${allStatuses.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${STATUS_LABEL[s] || s}</option>`).join('')}
            </select>
            <button type="button" class="btn-secondary" onclick="updStatus(${o.id})">Aplică</button>
          </div>
        </td>
        <td class="col-actions"><a class="detail-link" href="order.html?id=${o.id}">Detalii →</a></td>
      </tr>`).join('')}
    </tbody>
  </table>
  </div>`;
}

async function updStatus(id) {
  const s = document.getElementById('st_' + id).value;
  const r = await fetch(API + '/admin/orders/' + id + '/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ status: s })
  });
  if (!r.ok) return alertApiError(r, 'updStatus');
  toast(`Status actualizat: ${STATUS_LABEL[s] || s}`, 'success');
}

async function openPdf(id) {
  const r = await fetch(`${API}/admin/orders/${id}/invoice.pdf`, {
    headers: { Authorization: 'Bearer ' + TOKEN }
  });
  if (!r.ok) return alertApiError(r, 'openPdf');
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/* ========= invoices ========= */
async function loadInvoices() {
  const host = document.getElementById('invoiceList');
  loadingState(host, 'Încărcăm facturile…');

  const q = document.getElementById('qinvoice').value.trim();
  const r = await fetch(API + '/admin/invoices' + (q ? `?q=${encodeURIComponent(q)}` : ''), {
    headers: { Authorization: 'Bearer ' + TOKEN }
  });
  if (!r.ok) { host.innerHTML = ''; return alertApiError(r, 'loadInvoices'); }
  const data = await r.json();

  if (!data.length) {
    return emptyState(host, {
      icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
      title: q ? 'Nicio factură găsită' : 'Nicio factură încă',
      body: q ? `Niciun rezultat pentru „${q}".` : 'Facturile generate apar automat aici.'
    });
  }

  host.innerHTML = `
  <div class="table-wrap">
  <table>
    <thead>
      <tr><th>Comandă</th><th>Nr. factură</th><th>Status</th><th>Total</th><th></th></tr>
    </thead>
    <tbody>
    ${data.map(x => `
      <tr>
        <td><span class="order-id">#${x.id}</span></td>
        <td>${escAttr(x.invoice_no) || '<span class="muted">—</span>'}</td>
        <td>${statusBadge(x.status)}</td>
        <td><span class="price">${fmtMoney(x.total_amount, x.currency)}</span></td>
        <td class="col-actions"><a class="detail-link" href="#" onclick="openPdf(${x.id});return false;">Deschide PDF →</a></td>
      </tr>`).join('')}
    </tbody>
  </table>
  </div>`;
}

/* ========= products ========= */
let SELECTED_PRODUCT_ID = null;

function setProductFormMode(isEdit) {
  document.getElementById('form-product-title').textContent = isEdit ? 'Editează produs' : 'Adaugă produs nou';
  document.getElementById('form-product-hint').textContent = isEdit
    ? 'Modifici un produs existent. Apasă „Anulează" pentru a reveni la modul adăugare.'
    : 'Completează detaliile mai jos. Câmpurile cu * sunt obligatorii.';
}

function clearProductForm() {
  ['pid', 'sku', 'name', 'price', 'stock', 'image_url', 'tags', 'desc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('active').checked = true;
  document.getElementById('category').value = '';
  SELECTED_PRODUCT_ID = null;
  setProductFormMode(false);
  document.querySelectorAll('#prodList tr.row-selected').forEach(t => t.classList.remove('row-selected'));
}

async function loadProducts() {
  const host = document.getElementById('prodList');
  loadingState(host, 'Încărcăm produsele…');

  const r = await fetch(API + '/admin/products', { headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!r.ok) { host.innerHTML = ''; return alertApiError(r, 'loadProducts'); }
  const data = await r.json();

  if (!data.length) {
    return emptyState(host, {
      icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
      title: 'Niciun produs încă',
      body: 'Folosește formularul de mai jos pentru a adăuga primul produs.'
    });
  }

  host.innerHTML = `
  <div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>ID</th><th>SKU</th><th>Nume</th><th>Categorie</th><th>Taguri</th><th>Preț</th><th>Stoc</th><th>Status</th>
      </tr>
    </thead>
    <tbody>
    ${data.map(p => `
      <tr class="row-clickable ${SELECTED_PRODUCT_ID === p.id ? 'row-selected' : ''}"
          data-id="${p.id}"
          data-sku="${escAttr(p.sku)}"
          data-name="${escAttr(p.name)}"
          data-price="${p.price}"
          data-stock="${p.stock}"
          data-active="${p.is_active ? 1 : 0}"
          data-image="${escAttr(p.image_url || '')}"
          data-category="${escAttr(p.category || '')}"
          data-tags="${escAttr((p.tags || []).join(','))}"
          onclick="fillFormFromRow(this)">
        <td><span class="order-id">#${p.id}</span></td>
        <td><small class="mono">${escAttr(p.sku)}</small></td>
        <td>${escAttr(p.name)}</td>
        <td>${p.category ? `<span class="tag-chip">${escAttr(p.category)}</span>` : '<span class="muted">—</span>'}</td>
        <td>${(p.tags || []).map(t => `<span class="tag-chip">${escAttr(t)}</span>`).join('') || '<span class="muted">—</span>'}</td>
        <td><span class="price">${fmtMoney(p.price, p.currency)}</span></td>
        <td><span class="${p.stock === 0 ? 'stock-out' : (p.stock < 5 ? 'stock-low' : '')}">${p.stock}</span></td>
        <td><span class="bool-pill ${p.is_active ? 'is-true' : 'is-false'}">${p.is_active ? 'Activ' : 'Inactiv'}</span></td>
      </tr>`).join('')}
    </tbody>
  </table>
  </div>`;
}

function fillFormFromRow(tr) {
  document.querySelectorAll('#prodList tr.row-selected').forEach(t => t.classList.remove('row-selected'));
  tr.classList.add('row-selected');
  SELECTED_PRODUCT_ID = parseInt(tr.dataset.id, 10) || null;

  document.getElementById('pid').value = tr.dataset.id || '';
  document.getElementById('sku').value = tr.dataset.sku || '';
  document.getElementById('name').value = tr.dataset.name || '';
  document.getElementById('price').value = tr.dataset.price || '';
  document.getElementById('stock').value = tr.dataset.stock || '';
  document.getElementById('active').checked = tr.dataset.active === '1';
  document.getElementById('image_url').value = tr.dataset.image || '';
  document.getElementById('category').value = tr.dataset.category || '';
  document.getElementById('tags').value = tr.dataset.tags || '';

  setProductFormMode(true);
  document.getElementById('form-product-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveProduct() {
  const idEl = document.getElementById('pid');
  const sku = document.getElementById('sku').value.trim();
  const name = document.getElementById('name').value.trim();
  if (!sku || !name) { toast('Completează SKU și nume.', 'error'); return; }

  const body = {
    sku,
    name,
    description: (document.getElementById('desc').value || '').trim() || null,
    price: parseInt((document.getElementById('price').value || '').replace(/\D/g, ''), 10) || 0,
    currency: 'ron',
    stock: parseInt(document.getElementById('stock').value || '0', 10) || 0,
    is_active: !!document.getElementById('active').checked,
    image_url: (document.getElementById('image_url').value || '').trim() || null,
    category: document.getElementById('category').value,
    tags: (document.getElementById('tags').value || '').split(',').map(s => s.trim()).filter(Boolean)
  };

  const isUpdate = !!(idEl.value && idEl.value.trim());
  const url = API + (isUpdate ? '/admin/products/' + idEl.value.trim() : '/admin/products');
  const method = isUpdate ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify(body)
  });
  if (!res.ok) return alertApiError(res, 'saveProduct');
  toast(isUpdate ? 'Produs actualizat' : 'Produs adăugat', 'success');
  clearProductForm();
  await loadProducts();
}

async function delProduct() {
  const id = (document.getElementById('pid').value || '').trim();
  if (!id) { toast('Selectează un produs din listă întâi.', 'error'); return; }
  if (!confirm(`Ștergi produsul #${id}? Acțiunea nu poate fi anulată.`)) return;
  const r = await fetch(API + '/admin/products/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!r.ok) return alertApiError(r, 'delProduct');
  clearProductForm();
  await loadProducts();
  toast('Produs șters', 'success');
}

/* ========= company settings ========= */
async function loadCompanySettings() {
  const r = await fetch(API + '/admin/settings/company', {
    headers: { Authorization: 'Bearer ' + TOKEN }
  });
  if (!r.ok) return alertApiError(r, 'loadCompanySettings');
  const d = await r.json();
  document.getElementById('co-name').value = d.name || '';
  document.getElementById('co-cif').value = d.cif || '';
  document.getElementById('co-regcom').value = d.reg_com || '';
  document.getElementById('co-address').value = d.address || '';
  document.getElementById('co-iban').value = d.bank_account || '';
}

async function saveCompanySettings(e) {
  e.preventDefault();
  const msg = document.getElementById('co-msg');
  msg.textContent = 'Se salvează…';
  const payload = {
    name: document.getElementById('co-name').value.trim() || null,
    cif: document.getElementById('co-cif').value.trim() || null,
    reg_com: document.getElementById('co-regcom').value.trim() || null,
    address: document.getElementById('co-address').value.trim() || null,
    bank_account: document.getElementById('co-iban').value.trim() || null,
  };
  const r = await fetch(API + '/admin/settings/company', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify(payload)
  });
  if (!r.ok) { msg.textContent = ''; return alertApiError(r, 'saveCompanySettings'); }
  msg.textContent = '';
  toast('Datele firmei au fost salvate', 'success');
}

/* ========= wire events after DOM ready ========= */
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  document.getElementById('btn-logout').addEventListener('click', e => {
    e.preventDefault();
    lockAdmin();
  });

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => showTab(t.dataset.t));
  });

  document.getElementById('btn-load-active').addEventListener('click', e => { e.preventDefault(); loadOrders('active'); });
  document.getElementById('btn-load-done').addEventListener('click', e => { e.preventDefault(); loadOrders('done'); });
  document.getElementById('statusActive').addEventListener('change', () => loadOrders('active'));
  document.getElementById('statusDone').addEventListener('change', () => loadOrders('done'));
  document.getElementById('btn-load-invoices').addEventListener('click', e => { e.preventDefault(); loadInvoices(); });
  document.getElementById('qinvoice').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); loadInvoices(); } });
  document.getElementById('btn-reload-products').addEventListener('click', e => { e.preventDefault(); loadProducts(); });
  document.getElementById('btn-clear-form').addEventListener('click', e => { e.preventDefault(); clearProductForm(); });
  document.getElementById('btn-save').addEventListener('click', e => { e.preventDefault(); saveProduct().catch(err => { console.error(err); toast('Eroare: ' + (err?.message || err), 'error'); }); });
  document.getElementById('btn-del').addEventListener('click', e => { e.preventDefault(); delProduct(); });
  document.getElementById('company-form').addEventListener('submit', saveCompanySettings);

  await tryAutoRestore();
});
