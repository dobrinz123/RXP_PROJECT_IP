/* ========= helpers ========= */
const API = location.origin + '/api';
let TOKEN = '';
let ADMIN_EMAIL = '';

function escAttr(s) { return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;'); }

function alertApiError(res, extra) {
  // BUG-23: daca primim 401, token-ul a expirat — logout automat
  if (res.status === 401) {
    lockAdmin();
    return Promise.resolve();
  }
  let msg = `Eroare ${res.status}`;
  return res.json().then(j => {
    if (j?.detail) msg += `: ${JSON.stringify(j.detail)}`;
    if (extra) console.error(extra, j);
    alert(msg);
  }).catch(() => alert(msg));
}

/* ========= AUTH BLOCKER LOGIC ========= */
function unlockAdmin(token, email) {
  TOKEN = token;
  ADMIN_EMAIL = email || '';
  sessionStorage.setItem('admintoken', token);
  sessionStorage.setItem('adminemail', email || '');
  document.getElementById('auth-blocker').style.display = 'none';
  document.getElementById('admin-content').classList.add('unlocked');
  document.getElementById('admin-email-display').textContent = escAttr(email || '');
}

function lockAdmin() {
  TOKEN = '';
  ADMIN_EMAIL = '';
  sessionStorage.removeItem('admintoken');
  sessionStorage.removeItem('adminemail');
  document.getElementById('auth-blocker').style.display = 'flex';
  document.getElementById('admin-content').classList.remove('unlocked');
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value = '';
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
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  const email = emailEl.value.trim();
  const pass = passEl.value;

  if (!email || !pass) { errEl.textContent = 'Completează email și parolă.'; return; }

  btn.disabled = true;
  btn.textContent = 'Se autentifică...';
  errEl.textContent = '';

  try {
    const r = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });

    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      errEl.textContent = d.detail || 'Email sau parolă greșite.';
      return;
    }

    const d = await r.json();
    if (!d.access_token) { errEl.textContent = 'Răspuns invalid de la server.'; return; }

    const meRes = await fetch(API + '/auth/me', {
      headers: { Authorization: 'Bearer ' + d.access_token },
      cache: 'no-store'
    });

    if (meRes.ok) {
      const me = await meRes.json();
      if (!me.is_admin) {
        errEl.textContent = 'Contul nu are permisiuni de administrator.';
        return;
      }
      unlockAdmin(d.access_token, me.email || email);
      showTab('products');
    } else {
      const testRes = await fetch(API + '/admin/products', {
        headers: { Authorization: 'Bearer ' + d.access_token }
      });
      if (testRes.ok) {
        unlockAdmin(d.access_token, email);
        showTab('products');
      } else {
        errEl.textContent = 'Contul nu are permisiuni de administrator.';
      }
    }
  } catch (err) {
    console.error(err);
    errEl.textContent = 'Eroare de conexiune. Verifică serverul.';
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
async function loadOrders(scope) {
  const sel = scope === 'active' ? document.getElementById('statusActive') : document.getElementById('statusDone');
  const s = sel.value;
  const url = API + '/admin/orders?scope=' + scope + (s ? '&status=' + encodeURIComponent(s) : '');
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!r.ok) return alertApiError(r, 'loadOrders');
  const data = await r.json();
  const host = scope === 'active' ? document.getElementById('activeList') : document.getElementById('doneList');
  host.innerHTML = `
  <table><tr><th>ID</th><th>Status</th><th>Total</th><th>Items</th><th>Set status</th><th>Detalii</th></tr>
  ${data.map(o => `
    <tr>
      <td>${o.id}</td>
      <td><span class="badge">${escAttr(o.status)}</span></td>
      <td>${(o.total_amount / 100).toFixed(2)} ${escAttr(o.currency)}</td>
      <td>${o.items.map(i => `${escAttr(i.product?.name ?? '(produs sters)')} × ${i.quantity}`).join('<br>')}</td>
      <td>
        <select id="st_${o.id}">
          ${['created', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'canceled'].map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button type="button" onclick="updStatus(${o.id})">Set</button>
      </td>
      <td><a href="order.html?id=${o.id}">Detalii</a></td>
    </tr>`).join('')}
  </table>`;
}

async function updStatus(id) {
  const s = document.getElementById('st_' + id).value;
  const r = await fetch(API + '/admin/orders/' + id + '/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ status: s })
  });
  if (!r.ok) return alertApiError(r, 'updStatus');
  alert('Status actualizat');
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
  const q = document.getElementById('qinvoice').value.trim();
  const r = await fetch(API + '/admin/invoices' + (q ? `?q=${encodeURIComponent(q)}` : ''), {
    headers: { Authorization: 'Bearer ' + TOKEN }
  });
  if (!r.ok) return alertApiError(r, 'loadInvoices');
  const data = await r.json();
  document.getElementById('invoiceList').innerHTML = `
  <table><tr><th>Order</th><th>Nr factură</th><th>Status</th><th>Total</th><th>PDF</th></tr>
  ${data.map(x => `
    <tr>
      <td>#${x.id}</td><td>${escAttr(x.invoice_no) || ''}</td><td>${escAttr(x.status)}</td>
      <td>${(x.total_amount / 100).toFixed(2)} ${escAttr(x.currency)}</td>
      <td><a href="#" onclick="openPdf(${x.id});return false;">deschide</a></td>
    </tr>`).join('')}
  </table>`;
}

/* ========= products ========= */
async function loadProducts() {
  const r = await fetch(API + '/admin/products', { headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!r.ok) return alertApiError(r, 'loadProducts');
  const data = await r.json();
  document.getElementById('prodList').innerHTML = `
  <table>
    <tr><th>ID</th><th>SKU</th><th>Nume</th><th>Categorie</th><th>Taguri</th><th>Preț</th><th>Stoc</th><th>Activ</th></tr>
    ${data.map(p => `
      <tr data-id="${p.id}"
          data-sku="${escAttr(p.sku)}"
          data-name="${escAttr(p.name)}"
          data-price="${p.price}"
          data-stock="${p.stock}"
          data-active="${p.is_active ? 1 : 0}"
          data-image="${escAttr(p.image_url || '')}"
          data-category="${escAttr(p.category || '')}"
          data-tags="${escAttr((p.tags || []).join(','))}"
          onclick="fillFormFromRow(this)">
        <td>${p.id}</td><td>${escAttr(p.sku)}</td><td>${escAttr(p.name)}</td>
        <td>${escAttr(p.category || '')}</td>
        <td>${escAttr((p.tags || []).join(', '))}</td>
        <td>${(p.price / 100).toFixed(2)} ${p.currency}</td><td>${p.stock}</td><td>${p.is_active ? 'da' : 'nu'}</td>
      </tr>`).join('')}
  </table>`;
}

function fillFormFromRow(tr) {
  document.getElementById('pid').value = tr.dataset.id || '';
  document.getElementById('sku').value = tr.dataset.sku || '';
  document.getElementById('name').value = tr.dataset.name || '';
  document.getElementById('price').value = tr.dataset.price || '';
  document.getElementById('stock').value = tr.dataset.stock || '';
  document.getElementById('active').checked = tr.dataset.active === '1';
  document.getElementById('image_url').value = tr.dataset.image || '';
  document.getElementById('category').value = tr.dataset.category || '';
  document.getElementById('tags').value = tr.dataset.tags || '';
}

async function saveProduct() {
  const idEl = document.getElementById('pid');
  const body = {
    sku: document.getElementById('sku').value.trim(),
    name: document.getElementById('name').value.trim(),
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
  alert('Salvat!');
  await loadProducts();
}

async function delProduct() {
  const id = (document.getElementById('pid').value || '').trim();
  if (!id) return alert('Completează ID');
  const r = await fetch(API + '/admin/products/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!r.ok) return alertApiError(r, 'delProduct');
  document.getElementById('pid').value = '';
  await loadProducts();
  alert('Șters');
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
  msg.textContent = 'Se salvează...';
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
  msg.textContent = 'Salvat! Facturile noi vor include aceste date.';
  setTimeout(() => { msg.textContent = ''; }, 3000);
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
  document.getElementById('btn-load-invoices').addEventListener('click', e => { e.preventDefault(); loadInvoices(); });
  document.getElementById('btn-reload-products').addEventListener('click', e => { e.preventDefault(); loadProducts(); });
  document.getElementById('btn-save').addEventListener('click', e => { e.preventDefault(); saveProduct().catch(err => { console.error(err); alert('Eroare JS: ' + (err?.message || err)); }); });
  document.getElementById('btn-del').addEventListener('click', e => { e.preventDefault(); delProduct(); });
  document.getElementById('company-form').addEventListener('submit', saveCompanySettings);

  await tryAutoRestore();
});
