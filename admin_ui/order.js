const API = '/api';
const jwtInput = document.querySelector('#jwt');
const saved = sessionStorage.getItem('admintoken') || localStorage.getItem('admin_jwt') || localStorage.getItem('admintoken') || '';
if (saved) jwtInput.value = saved;
document.querySelector('#saveToken').onclick = () => {
  const t = jwtInput.value.trim();
  sessionStorage.setItem('admintoken', t);
  alert('Token salvat.');
};

const qs = s => document.querySelector(s);
const param = name => new URLSearchParams(location.search).get(name);

async function api(path) {
  const token = sessionStorage.getItem('admintoken') || localStorage.getItem('admin_jwt') || localStorage.getItem('admintoken') || '';
  const r = await fetch(API + path, { headers: { 'Authorization': 'Bearer ' + token } });
  if (!r.ok) {
    let msg = 'HTTP ' + r.status;
    try { const j = await r.json(); if (j?.detail) msg = j.detail; } catch { }
    throw new Error(msg);
  }
  return r.json();
}

function deepPick(obj, paths) {
  for (const p of paths) {
    const v = p.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
    if (v != null && v !== '') return v;
  }
  return undefined;
}

function esc(s) { return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function toMinor(v) {
  if (v == null) return null;
  if (typeof v === 'number') {
    return v >= 100 ? Math.round(v) : Math.round(v * 100);
  }
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (!s) return null;
    const norm = s.replace(/\./g, '').replace(',', '.');
    const f = parseFloat(norm);
    if (Number.isFinite(f)) return Math.round(f * 100);
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function fmtMinor(minor, curr = 'RON') {
  const n = (Number(minor) || 0) / 100;
  return n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + curr.toUpperCase();
}

async function load() {
  const id = Number(param('id') || '0');
  if (!id) { alert('Lipsește id.'); return; }
  qs('#oid').textContent = '#' + id;

  try {
    const o = await api('/admin/orders/' + id);

    const status = (deepPick(o, ['status', 'order_status']) || '-').toString();

    const createdISO = deepPick(o, [
      'created_at', 'created', 'createdAt', 'created_on', 'createdOn', 'created_ts', 'createdTs'
    ]);
    const createdTxt = createdISO ? new Date(createdISO).toLocaleString('ro-RO') : '-';

    const payMethodRaw = deepPick(o, [
      'payment_method', 'pay_method', 'payment.method', 'payment.type', 'payment.name', 'pay.method'
    ]);
    const payMethod = (payMethodRaw || 'COD').toString().toUpperCase();

    const fullName = deepPick(o, [
      'billing_name', 'shipping_name', 'customer_name', 'name',
      'shipping.name', 'customer.full_name', 'customer.name', 'buyer.name', 'delivery.name'
    ]) || '-';

    const phone = deepPick(o, [
      'phone', 'customer_phone', 'shipping_phone',
      'shipping.phone', 'customer.phone', 'buyer.phone', 'delivery.phone'
    ]) || '-';

    let address = deepPick(o, [
      'shipping_address', 'address', 'delivery_address',
      'customer_address',
      'shipping.address', 'customer.address', 'buyer.address'
    ]) || '';

    if (!address) {
      const parts = [
        deepPick(o, ['shipping.street', 'shipping.street1', 'shipping.line1']),
        deepPick(o, ['shipping.street2', 'shipping.line2']),
        deepPick(o, ['shipping.city']),
        deepPick(o, ['shipping.postcode', 'shipping.zip']),
        deepPick(o, ['shipping.country'])
      ].filter(Boolean);
      address = parts.length ? parts.join(', ') : '-';
    }

    const currency = (deepPick(o, ['currency']) || 'RON').toString().toUpperCase();

    const rawItems = Array.isArray(o.items) ? o.items : [];

    function itemName(it) {
      return deepPick(it, ['product_name', 'name', 'product.name', 'product.sku']) ||
        ('#' + (deepPick(it, ['product_id', 'productId']) ?? '?'));
    }
    function itemQty(it) {
      return Number(deepPick(it, ['quantity', 'qty'])) || 1;
    }
    function unitMinor(it) {
      const v = toMinor(deepPick(it, ['unit_price', 'unitPrice', 'price', 'price_minor', 'priceMinor', 'product.price']));
      if (v != null) return v;
      const sub = toMinor(deepPick(it, ['subtotal', 'line_total', 'total']));
      const q = itemQty(it);
      return sub != null ? Math.round(sub / q) : 0;
    }
    function subMinor(it) {
      const v = toMinor(deepPick(it, ['subtotal', 'line_total', 'total']));
      if (v != null) return v;
      return unitMinor(it) * itemQty(it);
    }

    const rows = rawItems.map(it => ({
      name: itemName(it),
      qty: itemQty(it),
      unit: unitMinor(it),
      sub: subMinor(it),
    }));

    const subtotalMinor = rows.reduce((s, r) => s + r.sub, 0);

    let shippingMinor = toMinor(deepPick(o, [
      'shipping_fee_minor', 'shipping_fee', 'shipping.amount', 'shipping.total',
      'delivery_fee_minor', 'delivery_fee', 'delivery.amount',
      'transport_fee_minor', 'transport_fee', 'transport'
    ]));

    let totalMinor = toMinor(deepPick(o, [
      'total_amount', 'total_minor', 'total', 'amount', 'grand_total', 'grandTotal'
    ]));

    if (shippingMinor == null && totalMinor != null) {
      shippingMinor = Math.max(0, totalMinor - subtotalMinor);
    }
    if (totalMinor == null) {
      totalMinor = subtotalMinor + (shippingMinor || 0);
    }

    qs('#status').textContent = status;
    qs('#created_at').textContent = createdTxt;
    qs('#payment_method').textContent = payMethod;

    qs('#billing_name').textContent = fullName;
    qs('#phone').textContent = phone;
    qs('#shipping_address').textContent = address;

    const tbody = qs('#items');
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${esc(r.name)}</td>
        <td class="right">${r.qty}</td>
        <td class="right">${fmtMinor(r.unit, currency)}</td>
        <td class="right">${fmtMinor(r.sub, currency)}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="muted">Nu există produse.</td></tr>`;

    qs('#subtotal').textContent = fmtMinor(subtotalMinor, currency);
    qs('#shipping').textContent = fmtMinor(shippingMinor || 0, currency);
    qs('#total').textContent = fmtMinor(totalMinor, currency);

  } catch (e) {
    console.error(e);
    alert('Nu am putut încărca comanda.\n' + e.message);
  }
}

load();
