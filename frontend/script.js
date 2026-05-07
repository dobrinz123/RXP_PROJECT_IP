const API_BASE = '/api';
const SHIPPING_MINOR = 2500;
const CURRENT_PAGE = document.body.dataset.page || '';
const ALLOWED_UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.stl', '.obj', '.step', '.stp'];
const MAX_UPLOAD_FILES = 5;
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

const ICONS = {
  check: '<path d="m20 6-11 11-5-5"></path>',
  menu: '<path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path>',
  x: '<path d="m18 6-12 12"></path><path d="m6 6 12 12"></path>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle>',
  'chevron-down': '<path d="m6 9 6 6 6-6"></path>',
  'shopping-cart': '<circle cx="9" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle><path d="M5 5h2l3 9h9l3-7H8"></path>',
  'shield-check': '<path d="m12 22 7-4V7l-7-5-7 5v11l7 4z"></path><path d="m9 12 2 2 4-4"></path>',
  truck: '<path d="M14 18H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9v13Z"></path><path d="M14 9h4l3 3v4a2 2 0 0 1-2 2h-5"></path><circle cx="7.5" cy="18.5" r="1.5"></circle><circle cx="17.5" cy="18.5" r="1.5"></circle>',
  'settings-2': '<path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="7" r="3"></circle><circle cx="8" cy="17" r="3"></circle>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5-5 5 5"></path><path d="M12 15V5"></path>',
  package: '<path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path>',
  home: '<path d="m3 11 9-8 9 8"></path><path d="M9 22V12h6v10"></path>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
  receipt: '<path d="M4 2h16v20l-4-2-4 2-4-2-4 2Z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path><path d="M8 15h5"></path>',
  'log-out': '<path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path><path d="M13 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8"></path>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>',
  'eye-off': '<path d="m3 3 18 18"></path><path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4"></path><path d="M9.9 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.8 17.8 0 0 1-4 4.7"></path><path d="M6.2 6.2A18.8 18.8 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4-.9"></path>',
  'trash-2': '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>',
  'arrow-right': '<path d="M5 12h14"></path><path d="m13 5 7 7-7 7"></path>',
  star: '<path d="m12 17.3-6.18 3.7 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.73L18.18 21z"></path>',
  'layout-grid': '<rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect>',
  'layout-list': '<rect width="18" height="5" x="3" y="4" rx="1"></rect><rect width="18" height="5" x="3" y="15" rx="1"></rect>',
  facebook: '<path d="M17 2h-3a5 5 0 0 0-5 5v3H6v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2Z"></path>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5"></rect><path d="M16 11.37a4 4 0 1 1-4.37-4.37 4 4 0 0 1 4.37 4.37Z"></path><path d="M17.5 6.5h.01"></path>',
  tiktok: '<path d="M14 4v9.5a3.5 3.5 0 1 1-3.5-3.5"></path><path d="M14 4c1.2 2.5 3 4 5 4"></path>'
};

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function currentRelativeUrl() {
  const file = location.pathname.split('/').pop() || 'index.html';
  return `${file}${location.search}${location.hash}`;
}

function param(name) {
  return new URLSearchParams(location.search).get(name);
}

function icon(name, className = 'icon') {
  const glyph = ICONS[name] || ICONS.package;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph}</svg>`;
}

function renderIcons(root = document) {
  qsa('[data-icon]', root).forEach((node) => {
    const iconName = node.dataset.icon;
    const className = ['icon'];
    if (node.classList.contains('icon-lg')) className.push('icon-lg');
    if (node.classList.contains('icon-xl')) className.push('icon-xl');
    node.outerHTML = icon(iconName, className.join(' '));
  });
}

function toMinor(value) {
  const numeric = Number(value || 0);
  return numeric >= 100 ? Math.round(numeric) : Math.round(numeric * 100);
}

function formatMoney(value, currency = 'ron') {
  const minor = toMinor(value);
  return `${(minor / 100).toFixed(2).replace('.', ',')} ${String(currency || 'ron').toUpperCase()}`;
}

function homeAnchor(fragment) {
  return CURRENT_PAGE === 'home' ? fragment : `index.html${fragment}`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (_) {
    return text;
  }
}

async function request(path, { method = 'GET', data = null, headers = {}, raw = false } = {}) {
  const options = {
    method,
    headers: { ...headers },
    credentials: 'include',
    cache: 'no-store'
  };

  if (data instanceof FormData) {
    options.body = data;
  } else if (data != null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  const response = await fetch(API_BASE + path, options);
  if (raw) return response;

  const payload = await parseResponse(response);
  if (!response.ok) {
    const detail = payload && typeof payload === 'object'
      ? payload.detail || payload.message || payload.error
      : payload;
    const error = new Error(detail || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function fetchMe() {
  try {
    return await request('/auth/me');
  } catch (_) {
    return null;
  }
}

async function fetchProducts(path = '/products') {
  const payload = await request(path);
  return Array.isArray(payload) ? payload : (payload.items || payload.data || []);
}

async function fetchProduct(id) {
  return request(`/products/${id}`);
}

async function cartGet() {
  const payload = await request('/cart');
  return Array.isArray(payload) ? payload : (payload.items || []);
}

async function cartAdd(productId, quantity) {
  return request('/cart', { method: 'POST', data: { product_id: productId, quantity } });
}

async function cartUpdate(itemId, quantity) {
  return request(`/cart/${itemId}`, { method: 'PUT', data: { quantity } });
}

async function cartRemove(itemId) {
  return request(`/cart/${itemId}`, { method: 'DELETE' });
}

async function clearServerCart() {
  return request('/cart', { method: 'DELETE' });
}

async function createCodOrder(payload) {
  return request('/orders/checkout-cod', { method: 'POST', data: payload });
}

async function fetchOrders() {
  const payload = await request('/orders');
  return Array.isArray(payload) ? payload : (payload.orders || []);
}

async function changePassword(currentPassword, newPassword) {
  return request('/auth/change-password', {
    method: 'POST',
    data: { current_password: currentPassword, new_password: newPassword }
  });
}

function showToast(message, tone = 'success') {
  let stack = qs('#toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  stack.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 180);
  }, 2400);
}

function setStatusMessage(node, message, tone) {
  if (!node) return;
  node.textContent = message || '';
  node.classList.remove('hidden', 'success', 'error');
  if (!message) {
    node.classList.add('hidden');
    return;
  }
  node.classList.add(tone === 'error' ? 'error' : 'success');
}

function clearFieldErrors(form) {
  qsa('.field', form).forEach((field) => {
    field.classList.remove('has-error');
    const message = qs('.field-error', field);
    if (message) {
      message.textContent = '';
      message.hidden = true;
    }
  });
}

function setFieldError(field, message) {
  if (!field) return;
  field.classList.toggle('has-error', Boolean(message));
  const messageNode = qs('.field-error', field);
  if (!messageNode) return;
  messageNode.textContent = message || '';
  messageNode.hidden = !message;
}

function skeletonCards(count = 4) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-media"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-line"></div>
    </div>
  `).join('');
}

function productTags(product) {
  const raw = product.tags ?? product.tag ?? [];
  if (Array.isArray(raw)) return raw.map((tag) => String(tag).toLowerCase());
  return String(raw).toLowerCase().split(/[,;|]\s*/).filter(Boolean);
}

function productCategoryKey(product) {
  return String(product.category || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function productOldPrice(product) {
  const candidates = [product.old_price, product.compare_at_price, product.original_price];
  const match = candidates.find((value) => value != null && toMinor(value) > toMinor(product.price));
  return match == null ? 0 : match;
}

function isPopularProduct(product) {
  return productTags(product).some((tag) => ['popular', 'featured', 'bestseller', 'best-seller'].includes(tag));
}

function isCustomProduct(product) {
  const tags = productTags(product);
  const copy = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  return tags.some((tag) => ['custom', 'personalizat', 'personalizate', 'made_to_order'].includes(tag))
    || copy.includes('personalizat')
    || copy.includes('custom');
}

function isOfferProduct(product) {
  return productTags(product).some((tag) => ['oferta', 'oferte', 'promo', 'sale', 'discount'].includes(tag))
    || toMinor(productOldPrice(product)) > toMinor(product.price);
}

function productFilterMatch(product, filterKey) {
  const category = productCategoryKey(product);

  if (filterKey === 'all') return true;
  if (filterKey === 'car_tuning' || filterKey === 'suporti_numar') return category === filterKey;
  if (filterKey === 'personalizate') return isCustomProduct(product);
  if (filterKey === 'oferte') return isOfferProduct(product);

  return true;
}

function productSortComparator(sortKey) {
  if (sortKey === 'price-asc') return (a, b) => toMinor(a.price) - toMinor(b.price);
  if (sortKey === 'price-desc') return (a, b) => toMinor(b.price) - toMinor(a.price);
  if (sortKey === 'newest') return (a, b) => Number(b.id || 0) - Number(a.id || 0);
  if (sortKey === 'popular') {
    return (a, b) => {
      const aPopular = isPopularProduct(a) ? 1 : 0;
      const bPopular = isPopularProduct(b) ? 1 : 0;
      if (aPopular !== bPopular) return bPopular - aPopular;
      return Number(b.id || 0) - Number(a.id || 0);
    };
  }

  return (a, b) => {
    const aFeatured = (isPopularProduct(a) ? 2 : 0) + (isOfferProduct(a) ? 1 : 0);
    const bFeatured = (isPopularProduct(b) ? 2 : 0) + (isOfferProduct(b) ? 1 : 0);
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;
    return Number(b.id || 0) - Number(a.id || 0);
  };
}

function pluralizeProducts(count) {
  return `${count} ${count === 1 ? 'produs' : 'produse'}`;
}

function statusLabel(status = '') {
  const normalized = String(status || '').toLowerCase();
  return {
    created: 'Înregistrată',
    pending: 'În așteptare',
    processing: 'În procesare',
    in_preparation: 'În procesare',
    paid: 'Plătită',
    shipped: 'Expediată',
    delivered: 'Finalizată',
    cancelled: 'Anulată',
    canceled: 'Anulată'
  }[normalized] || normalized || 'Necunoscut';
}

function statusClass(status = '') {
  const normalized = String(status || '').toLowerCase();
  if (['pending'].includes(normalized)) return 'status-pending';
  if (['cancelled', 'canceled'].includes(normalized)) return 'status-cancelled';
  if (['delivered', 'paid'].includes(normalized)) return 'status-completed';
  return 'status-processing';
}

function categoryLabel(category) {
  return ({
    suporti_numar: 'Suporți număr',
    car_tuning: 'Car Tuning',
    accesorii_auto: 'Accesorii auto'
  })[String(category || '').toLowerCase().trim()] || '';
}

function renderFooter() {
  const host = qs('#site-footer');
  if (!host) return;

  host.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand-title">RXP CUSTOM3D</div>
            <p style="margin-top: 16px;">Suporți magnetici 3D printați, fabricați în România.</p>
            <div class="footer-socials">
              <a href="404.html" aria-label="Facebook">${icon('facebook')}</a>
              <a href="https://www.instagram.com/rxpcustom3d" target="_blank" rel="noreferrer" aria-label="Instagram">${icon('instagram')}</a>
              <a href="404.html" aria-label="TikTok">${icon('tiktok')}</a>
            </div>
          </div>

          <div>
            <div class="footer-heading">Magazin</div>
            <div class="footer-links">
              <a href="categories.html">Toate produsele</a>
              <a href="custom.html">Personalizare</a>
              <a href="categories.html">Cataloage</a>
              <a href="categories.html">Oferte</a>
            </div>
          </div>

          <div>
            <div class="footer-heading">Companie</div>
            <div class="footer-links">
              <a href="${homeAnchor('#despre')}">Despre noi</a>
              <a href="${homeAnchor('#contact')}">Contact</a>
              <a href="404.html">Blog</a>
              <a href="404.html">Recenzii</a>
            </div>
          </div>

          <div>
            <div class="footer-heading">Informații</div>
            <div class="footer-links">
              <a href="404.html">Livrare</a>
              <a href="404.html">Retururi</a>
              <a href="404.html">Termeni și condiții</a>
              <a href="404.html">Politica de confidențialitate</a>
              <a href="https://anpc.ro/" target="_blank" rel="noreferrer">ANPC</a>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <span>© 2026 RXP CUSTOM3D. Toate drepturile rezervate.</span>
          <div class="payment-icons" aria-label="Metode de plată">
            <span class="payment-pill">VISA</span>
            <span class="payment-pill">Mastercard</span>
            <span class="payment-pill">Apple Pay</span>
          </div>
        </div>
      </div>
    </footer>
  `;
}

function renderHeader(user) {
  const host = qs('#site-header');
  if (!host) return;

  const navKey = CURRENT_PAGE === 'home'
    ? 'home'
    : CURRENT_PAGE === 'custom'
      ? 'custom'
      : CURRENT_PAGE === 'products'
        ? 'products'
        : '';

  const navItems = [
    { key: 'home', href: 'index.html', label: 'Acasă' },
    { key: 'products', href: 'categories.html', label: 'Produse' },
    { key: 'custom', href: 'custom.html', label: 'Personalizare' },
    { key: 'about', href: homeAnchor('#despre'), label: 'Despre' },
    { key: 'contact', href: homeAnchor('#contact'), label: 'Contact' }
  ];

  const mobileAccountLink = user
    ? `<a class="mobile-nav-link" href="account.html">${icon('user')}Contul meu</a>
       <button class="mobile-nav-link" type="button" id="mobile-logout-button">${icon('log-out')}Deconectare</button>`
    : `<a class="mobile-nav-link" href="login.html">${icon('user')}Autentificare</a>`;

  const userControl = user
    ? `
      <div class="user-menu">
        <button type="button" class="btn user-trigger" id="user-menu-trigger" aria-expanded="false" aria-haspopup="true">
          ${icon('user')}
          ${icon('chevron-down')}
        </button>
        <div class="dropdown-menu" id="user-dropdown" hidden>
          <span class="dropdown-email">${escapeHtml(user.email || '')}</span>
          <a class="dropdown-link" href="account.html">${icon('user')}Contul meu</a>
          <button type="button" class="dropdown-link" id="logout-link">${icon('log-out')}Deconectare</button>
        </div>
      </div>
    `
    : `<a class="btn user-trigger" href="login.html">${icon('user')}Autentificare</a>`;

  host.innerHTML = `
    <header class="site-header" id="app-header">
      <div class="container header-shell">
        <a class="brand-link" href="index.html" aria-label="RXP CUSTOM3D">
          <div class="brand-lockup">
            <span class="brand-title">RXP CUSTOM3D</span>
            <span class="brand-subtitle">3D Print Shop</span>
          </div>
        </a>

        <div class="header-nav main-nav">
          <nav aria-label="Navigație principală">
            <ul class="main-nav-list">
              ${navItems.map((item) => `
                <li><a class="main-nav-link ${item.key === navKey ? 'is-active' : ''}" href="${item.href}">${item.label}</a></li>
              `).join('')}
            </ul>
          </nav>

          <span class="header-divider" aria-hidden="true"></span>

          <div class="header-actions desktop-header-actions">
            <a class="btn cart-button" href="cart.html" aria-label="Coș">
              ${icon('shopping-cart')}
              <span class="cart-label">Coș</span>
              <span class="cart-badge is-empty" data-cart-count>0</span>
            </a>
            ${userControl}
          </div>
        </div>

        <div class="mobile-header-actions">
          <a class="btn cart-button" href="cart.html" aria-label="Coș">
            ${icon('shopping-cart')}
            <span class="cart-label">Coș</span>
            <span class="cart-badge is-empty" data-cart-count>0</span>
          </a>
          <button type="button" class="mobile-menu-button" id="mobile-menu-button" aria-expanded="false" aria-controls="mobile-drawer" aria-label="Deschide meniul">
            ${icon('menu')}
          </button>
        </div>
      </div>
    </header>

    <div class="mobile-backdrop" id="mobile-backdrop"></div>
    <aside class="mobile-drawer" id="mobile-drawer" aria-hidden="true">
      <div class="mobile-drawer-header">
        <div class="brand-lockup">
          <span class="brand-title">RXP CUSTOM3D</span>
          <span class="brand-subtitle">3D Print Shop</span>
        </div>
        <button type="button" class="mobile-menu-button" id="mobile-menu-close" aria-label="Închide meniul">
          ${icon('x')}
        </button>
      </div>

      <nav aria-label="Navigație mobilă">
        <div class="mobile-nav-list">
          ${navItems.map((item) => `
            <a class="mobile-nav-link ${item.key === navKey ? 'is-active' : ''}" href="${item.href}">${item.label}</a>
          `).join('')}
          <a class="mobile-nav-link" href="cart.html">${icon('shopping-cart')}Coș</a>
          ${mobileAccountLink}
        </div>
      </nav>
    </aside>
  `;

  const headerNode = qs('#app-header', host);
  if (headerNode) {
    const onScroll = () => headerNode.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  bindHeaderEvents();
}

function bindHeaderEvents() {
  const drawer = qs('#mobile-drawer');
  const backdrop = qs('#mobile-backdrop');
  const openButton = qs('#mobile-menu-button');
  const closeButton = qs('#mobile-menu-close');
  const dropdownTrigger = qs('#user-menu-trigger');
  const dropdown = qs('#user-dropdown');

  function openDrawer() {
    if (!drawer || !backdrop || !openButton) return;
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    openButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  }

  function closeDrawer() {
    if (!drawer || !backdrop || !openButton) return;
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    openButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }

  function closeDropdown() {
    if (!dropdown || !dropdownTrigger) return;
    dropdown.hidden = true;
    dropdownTrigger.setAttribute('aria-expanded', 'false');
  }

  openButton?.addEventListener('click', openDrawer);
  closeButton?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  qsa('.mobile-nav-link', drawer || document).forEach((link) => link.addEventListener('click', closeDrawer));

  dropdownTrigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    const next = dropdown.hidden;
    dropdown.hidden = !next;
    dropdownTrigger.setAttribute('aria-expanded', String(next));
  });

  document.addEventListener('click', (event) => {
    if (dropdown && dropdownTrigger && !dropdown.hidden && !dropdown.contains(event.target) && !dropdownTrigger.contains(event.target)) {
      closeDropdown();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDrawer();
      closeDropdown();
    }
  });

  qs('#logout-link')?.addEventListener('click', performLogout);
  qs('#mobile-logout-button')?.addEventListener('click', performLogout);
}

async function performLogout(event) {
  event?.preventDefault();
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (_) {
    // ignore
  }
  location.href = 'index.html';
}

function setCartCounter(items = []) {
  const count = Array.isArray(items)
    ? items.reduce((sum, item) => sum + Number(item.quantity || item.qty || 0), 0)
    : Number(items || 0);

  qsa('[data-cart-count]').forEach((node) => {
    node.textContent = String(count);
    node.classList.toggle('is-empty', count <= 0);
  });
}

async function initHeaderState() {
  try {
    const items = await cartGet();
    setCartCounter(items);
  } catch (_) {
    setCartCounter([]);
  }
}

function renderCookieBanner() {
  if (localStorage.getItem('rxp-cookie-consent') === 'accepted') return;
  if (qs('#cookie-banner')) return;

  const banner = document.createElement('section');
  banner.id = 'cookie-banner';
  banner.className = 'cookie-banner';
  banner.innerHTML = `
    <div>
      <strong>Folosim cookie-uri necesare</strong>
      <p class="helper-text">Site-ul păstrează sesiunea de autentificare și preferințele minime pentru a funcționa corect.</p>
    </div>
    <div class="cookie-actions">
      <button type="button" class="btn btn-primary" id="cookie-accept">Accept</button>
      <button type="button" class="btn btn-ghost" id="cookie-close">Închide</button>
    </div>
  `;
  document.body.appendChild(banner);

  qs('#cookie-accept', banner)?.addEventListener('click', () => {
    localStorage.setItem('rxp-cookie-consent', 'accepted');
    banner.hidden = true;
  });

  qs('#cookie-close', banner)?.addEventListener('click', () => {
    banner.hidden = true;
  });
}

function renderProductGrid(host, products, emptyMessage = 'Nu există produse disponibile în acest moment.') {
  if (!host) return;
  if (!products.length) {
    host.innerHTML = `<div class="empty-state"><div class="icon-badge">${icon('package', 'icon-xl')}</div><h3>Momentan nu există produse</h3><p>${escapeHtml(emptyMessage)}</p></div>`;
    return;
  }

  host.innerHTML = products.map((product) => `
    <article class="product-card">
      <a class="product-media" href="product.html?id=${product.id}">
        <img src="${escapeHtml(product.image_url || 'images/product-placeholder.png')}" alt="${escapeHtml(product.name || 'Produs RXP CUSTOM3D')}" loading="lazy">
      </a>
      <div class="product-content">
        <div>
          <h3><a href="product.html?id=${product.id}">${escapeHtml(product.name || 'Produs')}</a></h3>
          <p class="product-description">${escapeHtml(product.description || 'Produs disponibil prin API.')}</p>
        </div>
        <div class="product-row">
          <strong class="product-price">${formatMoney(product.price, product.currency)}</strong>
          <button type="button" class="btn btn-primary js-add-to-cart" data-product-id="${product.id}">Adaugă în coș</button>
        </div>
      </div>
    </article>
  `).join('');
}

async function addProductToCart(productId, quantity = 1) {
  try {
    await cartAdd(productId, quantity);
    const cart = await cartGet();
    setCartCounter(cart);
    showToast('Produsul a fost adăugat în coș.');
  } catch (error) {
    if (error.status === 401) {
      location.href = `login.html?next=${encodeURIComponent(currentRelativeUrl())}`;
      return;
    }
    showToast(error.message || 'Nu am putut adăuga produsul în coș.', 'error');
  }
}

function bindGlobalProductActions() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.js-add-to-cart');
    if (!button) return;
    const productId = Number(button.dataset.productId || 0);
    if (!productId) return;
    button.disabled = true;
    try {
      await addProductToCart(productId, 1);
    } finally {
      button.disabled = false;
    }
  });
}

async function renderHomePage() {
  const host = qs('#popular-list');
  if (!host) return;

  host.innerHTML = skeletonCards(4);
  try {
    const allProducts = await fetchProducts();
    const popular = allProducts.filter((product) => {
      const rawTags = product.tags ?? product.tag ?? [];
      if (Array.isArray(rawTags)) {
        return rawTags.some((tag) => String(tag).toLowerCase() === 'popular');
      }
      return String(rawTags).toLowerCase().split(/[,;|]\s*/).includes('popular');
    });

    const visibleProducts = (popular.length ? popular : allProducts).slice(0, 4);
    renderProductGrid(host, visibleProducts, 'Produsele populare vor apărea aici imediat ce sunt publicate.');
  } catch (error) {
    host.innerHTML = `<div class="empty-state"><div class="icon-badge">${icon('package', 'icon-xl')}</div><h3>Nu am putut încărca produsele</h3><p>${escapeHtml(error.message || 'Încearcă din nou peste câteva momente.')}</p></div>`;
  }
}

function renderCatalogProductSkeletons(host) {
  if (!host) return;
  host.innerHTML = skeletonCards(8);
}

function renderCatalogCategoryCounts(products) {
  const carCount = products.filter((product) => productCategoryKey(product) === 'car_tuning').length;
  const plateCount = products.filter((product) => productCategoryKey(product) === 'suporti_numar').length;

  const carNode = qs('#count-car-tuning');
  const plateNode = qs('#count-plate-holders');
  const carCard = qs('.catalog-category-card--car');
  const plateCard = qs('.catalog-category-card--plates');

  if (carNode) carNode.textContent = pluralizeProducts(carCount);
  if (plateNode) plateNode.textContent = pluralizeProducts(plateCount);
  if (carCard) carCard.setAttribute('aria-label', `Vezi categoria Car Tuning, ${carCount} de ${carCount === 1 ? 'produs' : 'produse'}`);
  if (plateCard) plateCard.setAttribute('aria-label', `Vezi categoria Suporți număr, ${plateCount} de ${plateCount === 1 ? 'produs' : 'produse'}`);
}

function renderCatalogProducts(host, products, viewMode = 'grid') {
  if (!host) return;

  host.classList.toggle('is-list-view', viewMode === 'list');

  if (!products.length) {
    host.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="icon-badge">${icon('package', 'icon-xl')}</div>
        <h3>Nu am găsit produse pentru filtrul selectat</h3>
        <p>Încearcă alt filtru sau revino la „Toate” pentru a vedea întregul catalog.</p>
      </div>
    `;
    return;
  }

  host.innerHTML = products.map((product) => {
    const badge = isPopularProduct(product)
      ? 'Popular'
      : isOfferProduct(product)
        ? 'Ofertă'
        : '';
    const oldPrice = productOldPrice(product);

    return `
      <article class="catalog-product-card">
        <a class="catalog-product-card__media" href="product.html?id=${product.id}" aria-label="Vezi produsul ${escapeHtml(product.name || 'Produs')}">
          <img
            src="${escapeHtml(product.image_url || 'images/product-placeholder.png')}"
            alt="${escapeHtml(`Produs ${product.name || 'RXP CUSTOM3D'} din categoria ${product.category || 'catalog'}`)}"
            loading="lazy"
            width="800"
            height="800"
          >
        </a>
        <div class="catalog-product-card__body">
          <div>
            <h3 class="catalog-product-card__heading">
              <a class="catalog-product-card__name" href="product.html?id=${product.id}">${escapeHtml(product.name || 'Produs')}</a>
            </h3>
            <p class="catalog-product-card__description">${escapeHtml(product.description || 'Produs disponibil în catalogul RXP CUSTOM3D.')}</p>
          </div>
          <div class="catalog-product-card__meta">
            <div class="catalog-product-card__price-row">
              <strong class="catalog-product-card__price">${formatMoney(product.price, product.currency)}</strong>
              ${oldPrice ? `<span class="catalog-product-card__old-price">${formatMoney(oldPrice, product.currency)}</span>` : ''}
            </div>
            ${badge ? `<span class="catalog-product-card__badge">${escapeHtml(badge)}</span>` : ''}
          </div>
          <button type="button" class="btn btn-primary btn-full catalog-product-card__button js-add-to-cart" data-product-id="${product.id}">Adaugă în coș</button>
        </div>
      </article>
    `;
  }).join('');
}

async function renderCatalogLandingPage() {
  const gridHost = qs('#catalog-products-grid');
  if (!gridHost) return;

  const filterButtons = qsa('.catalog-filter-chip');
  const sortSelect = qs('#catalog-sort');
  const loadMoreButton = qs('#catalog-load-more');
  const metaNode = qs('#catalog-products-meta');
  const viewButtons = qsa('.catalog-view-toggle__button');

  const state = {
    allProducts: [],
    filteredProducts: [],
    selectedFilter: 'all',
    selectedSort: 'recommended',
    selectedView: 'grid',
    visibleCount: 8
  };

  function updateMeta() {
    if (!metaNode) return;
    const shownCount = Math.min(state.visibleCount, state.filteredProducts.length);
    const filterLabel = ({
      all: 'Toate',
      suporti_numar: 'Suporți număr',
      car_tuning: 'Car Tuning',
      personalizate: 'Personalizate',
      oferte: 'Oferte'
    })[state.selectedFilter] || 'Toate';
    metaNode.textContent = filterButtons.length
      ? `Afișezi ${shownCount} din ${state.filteredProducts.length} ${state.filteredProducts.length === 1 ? 'produs' : 'produse'} · Filtru: ${filterLabel}`
      : `Afișezi ${shownCount} din ${state.filteredProducts.length} ${state.filteredProducts.length === 1 ? 'produs' : 'produse'}`;
  }

  function applyState() {
    state.filteredProducts = state.allProducts
      .filter((product) => productFilterMatch(product, state.selectedFilter))
      .sort(productSortComparator(state.selectedSort));

    renderCatalogProducts(gridHost, state.filteredProducts.slice(0, state.visibleCount), state.selectedView);
    updateMeta();

    if (loadMoreButton) {
      const allVisible = state.filteredProducts.length <= state.visibleCount;
      loadMoreButton.hidden = allVisible;
      loadMoreButton.disabled = allVisible;
    }
  }

  function activateFilter(nextFilter) {
    state.selectedFilter = nextFilter;
    state.visibleCount = 8;
    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === nextFilter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    applyState();
  }

  function activateView(nextView) {
    state.selectedView = nextView;
    viewButtons.forEach((button) => {
      const isActive = button.dataset.view === nextView;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    applyState();
  }

  renderCatalogProductSkeletons(gridHost);

  try {
    state.allProducts = await fetchProducts('/products');
    renderCatalogCategoryCounts(state.allProducts);
    applyState();
  } catch (error) {
    gridHost.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="icon-badge">${icon('package', 'icon-xl')}</div>
        <h3>Nu am putut încărca produsele</h3>
        <p>${escapeHtml(error.message || 'Încearcă din nou peste câteva momente.')}</p>
      </div>
    `;
    if (metaNode) metaNode.textContent = 'Catalogul nu este disponibil momentan.';
    return;
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => activateFilter(button.dataset.filter || 'all'));
  });

  sortSelect?.addEventListener('change', () => {
    state.selectedSort = sortSelect.value || 'recommended';
    state.visibleCount = 8;
    applyState();
  });

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => activateView(button.dataset.view || 'grid'));
  });

  loadMoreButton?.addEventListener('click', () => {
    state.visibleCount += 4;
    applyState();
  });
}

async function renderCategoryPage() {
  const host = qs('#products-list');
  if (!host) return;

  const slug = param('slug');
  const titleNode = qs('#category-title');
  const descriptionNode = qs('#category-description');
  const filterNode = qs('#filter-container');

  const meta = {
    car_tuning: {
      title: 'Car Tuning',
      description: 'Accesorii și piese personalizate. Poți filtra rapid după marcă.'
    },
    suporti_numar: {
      title: 'Suporți număr',
      description: 'Suporturi magnetice pentru numere de înmatriculare.'
    }
  };

  const currentMeta = meta[slug] || { title: 'Categorie', description: 'Alege produsul potrivit pentru configurarea ta.' };
  if (titleNode) titleNode.textContent = currentMeta.title;
  if (descriptionNode) descriptionNode.textContent = currentMeta.description;

  host.innerHTML = skeletonCards(4);

  try {
    let products = await fetchProducts(`/products?category=${encodeURIComponent(slug || '')}`);

    if (slug === 'car_tuning' && filterNode) {
      const selectedTag = param('tag') || '';
      const tags = Array.from(new Set(products.flatMap((product) => product.tags || []))).sort();
      filterNode.innerHTML = tags.length ? `
        <label for="brand-filter">Marcă</label>
        <select id="brand-filter" class="select">
          <option value="">Toate</option>
          ${tags.map((tag) => `<option value="${escapeHtml(tag)}" ${tag === selectedTag ? 'selected' : ''}>${escapeHtml(tag)}</option>`).join('')}
        </select>
      ` : '';

      const select = qs('#brand-filter', filterNode);
      select?.addEventListener('change', async () => {
        const nextTag = select.value;
        host.innerHTML = skeletonCards(4);
        const query = nextTag
          ? `/products?category=${encodeURIComponent(slug)}&tag=${encodeURIComponent(nextTag)}`
          : `/products?category=${encodeURIComponent(slug)}`;
        const filteredProducts = await fetchProducts(query);
        renderProductGrid(host, filteredProducts, 'Nu există produse pentru filtrul selectat.');
        history.replaceState({}, '', `category.html?slug=${encodeURIComponent(slug)}${nextTag ? `&tag=${encodeURIComponent(nextTag)}` : ''}`);
      });

      if (selectedTag) {
        products = await fetchProducts(`/products?category=${encodeURIComponent(slug)}&tag=${encodeURIComponent(selectedTag)}`);
      }
    } else if (filterNode) {
      filterNode.innerHTML = '';
    }

    renderProductGrid(host, products, 'Nu există produse în această categorie.');
  } catch (error) {
    host.innerHTML = `<div class="empty-state"><div class="icon-badge">${icon('package', 'icon-xl')}</div><h3>Nu am putut încărca categoria</h3><p>${escapeHtml(error.message || 'Încearcă din nou mai târziu.')}</p></div>`;
  }
}

function renderProductSkeleton() {
  return `
    <div class="product-detail-grid">
      <div class="skeleton-card"><div class="skeleton skeleton-media" style="height: 420px;"></div></div>
      <div class="skeleton-card">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </div>
  `;
}

async function renderProductPage() {
  const host = qs('#product-detail');
  if (!host) return;

  const productId = Number(param('id') || 0);
  if (!productId) {
    location.href = '404.html';
    return;
  }

  host.innerHTML = renderProductSkeleton();

  try {
    const product = await fetchProduct(productId);
    const images = Array.isArray(product.images) && product.images.length ? product.images : [product.image_url || 'images/product-placeholder.png'];
    const stock = Number(product.stock || 0);

    host.innerHTML = `
      <nav class="breadcrumb-nav" aria-label="Breadcrumb">
        <ol class="breadcrumb-list">
          <li><a href="index.html">Acasă</a></li>
          <li><a href="categories.html">Produse</a></li>
          <li aria-current="page">${escapeHtml(product.name || 'Produs')}</li>
        </ol>
      </nav>
      <div class="product-detail-grid">
        <section class="surface-card product-gallery-card">
          <div class="product-gallery-main">
            <img id="product-main-image" src="${escapeHtml(images[0])}" alt="${escapeHtml(product.name || 'Produs RXP CUSTOM3D')}">
          </div>
          <div class="product-gallery-thumbs">
            ${images.map((image, index) => `
              <button type="button" class="product-thumb ${index === 0 ? 'is-active' : ''}" data-product-image="${escapeHtml(image)}" aria-label="Imagine produs ${index + 1}">
                <img src="${escapeHtml(image)}" alt="">
              </button>
            `).join('')}
          </div>
        </section>

        <section class="surface-card product-info-card">
          <span class="section-eyebrow">Produs</span>
          <h1 class="page-title">${escapeHtml(product.name || 'Produs')}</h1>
          <p class="text-body-lg">${escapeHtml(product.description || 'Produs disponibil pentru comandă.')}</p>

          <div class="product-meta-grid">
            <div>
              <span class="helper-text">Preț</span>
              <div class="product-price">${formatMoney(product.price, product.currency)}</div>
            </div>
            <div>
              <span class="helper-text">Disponibilitate</span>
              <div>${stock > 0 ? `${stock} în stoc` : 'Stoc indisponibil'}</div>
            </div>
          </div>

          <div class="product-purchase-row">
            <div class="field" style="margin: 0;">
              <label class="field-label" for="product-qty">Cantitate</label>
              <div class="qty-stepper">
                <button type="button" data-qty-action="decrease" aria-label="Scade cantitatea">−</button>
                <input id="product-qty" class="input" type="number" min="1" value="1">
                <button type="button" data-qty-action="increase" aria-label="Crește cantitatea">+</button>
              </div>
            </div>

            <button type="button" id="product-add-button" class="btn btn-primary" ${stock <= 0 ? 'disabled' : ''}>Adaugă în coș</button>
          </div>
        </section>
      </div>
    `;

    const mainImage = qs('#product-main-image', host);
    qsa('.product-thumb', host).forEach((thumb) => {
      thumb.addEventListener('click', () => {
        qsa('.product-thumb', host).forEach((button) => button.classList.remove('is-active'));
        thumb.classList.add('is-active');
        if (mainImage) mainImage.src = thumb.dataset.productImage || '';
      });
    });

    const quantityInput = qs('#product-qty', host);
    qsa('[data-qty-action]', host).forEach((button) => {
      button.addEventListener('click', () => {
        const current = Math.max(1, Number(quantityInput?.value || 1));
        quantityInput.value = String(button.dataset.qtyAction === 'increase' ? current + 1 : Math.max(1, current - 1));
      });
    });

    qs('#product-add-button', host)?.addEventListener('click', async () => {
      const quantity = Math.max(1, Number(quantityInput?.value || 1));
      await addProductToCart(product.id, quantity);
    });
  } catch (_) {
    location.href = '404.html';
  }
}

function cartSummaryTemplate(subtotalMinor) {
  const totalMinor = subtotalMinor + SHIPPING_MINOR;
  return `
    <div class="summary-card">
      <div>
        <span class="section-eyebrow">Rezumat</span>
        <h2>Comanda ta</h2>
      </div>
      <div class="summary-lines">
        <div class="summary-line"><span>Subtotal</span><strong>${formatMoney(subtotalMinor)}</strong></div>
        <div class="summary-line"><span>Estimare transport</span><strong>${formatMoney(SHIPPING_MINOR)}</strong></div>
        <div class="summary-line total"><span>Total</span><strong>${formatMoney(totalMinor)}</strong></div>
      </div>
      <button type="button" id="checkout-button" class="btn btn-primary btn-full">Continuă la plată</button>
      <p class="helper-text">Livrare estimată în 24-48h pentru comenzile confirmate.</p>
    </div>
  `;
}

async function renderCartPage() {
  const itemsHost = qs('#cart-items');
  const summaryHost = qs('#cart-summary');
  const panel = qs('#cod-panel');
  const form = qs('#cod-form');
  const layout = qs('.cart-layout');

  if (!itemsHost || !summaryHost || !panel || !form) return;

  itemsHost.innerHTML = skeletonCards(2);
  summaryHost.innerHTML = '';

  try {
    const items = await cartGet();
    setCartCounter(items);

    if (!items.length) {
      if (layout) layout.classList.add('cart-layout--empty');
      itemsHost.innerHTML = `
        <div class="empty-state cart-empty">
          <div class="icon-badge">${icon('shopping-cart', 'icon-xl')}</div>
          <h2>Coșul tău este gol</h2>
          <p>Descoperă produsele noastre și adaugă în coș.</p>
          <a class="btn btn-primary" href="categories.html">Vezi produsele</a>
        </div>
      `;
      summaryHost.innerHTML = '';
      panel.classList.remove('is-open');
      return;
    }

    if (layout) layout.classList.remove('cart-layout--empty');

    const subtotalMinor = items.reduce((sum, item) => {
      const unitPrice = item.product?.price ?? item.price ?? 0;
      const quantity = item.quantity ?? item.qty ?? 1;
      return sum + toMinor(unitPrice) * quantity;
    }, 0);

    itemsHost.innerHTML = `
      <div class="cart-items-list">
        ${items.map((item) => {
          const product = item.product || {};
          const quantity = Number(item.quantity || item.qty || 1);
          const unitPrice = toMinor(product.price ?? item.price ?? 0);
          const lineTotal = unitPrice * quantity;
          return `
            <article class="cart-item-card" data-item-id="${item.id}">
              <img src="${escapeHtml(product.image_url || 'images/product-placeholder.png')}" alt="${escapeHtml(product.name || 'Produs')}">
              <div class="cart-item-meta">
                <h3>${escapeHtml(product.name || 'Produs')}</h3>
              </div>
              <div class="cart-item-actions-row">
                <div class="qty-stepper" aria-label="Cantitate">
                  <button type="button" data-cart-action="decrease">−</button>
                  <span>${quantity}</span>
                  <button type="button" data-cart-action="increase">+</button>
                </div>
                <div class="cart-item-pricing" aria-label="Detalii preț">
                  <div class="cart-item-price">
                    <span class="helper-text">Preț / buc.</span>
                    <strong>${formatMoney(unitPrice, product.currency)}</strong>
                  </div>
                  <div class="cart-item-total">
                    <span class="helper-text">Total</span>
                    <strong>${formatMoney(lineTotal, product.currency)}</strong>
                  </div>
                </div>
                <button type="button" class="btn btn-ghost cart-item-remove" data-cart-action="remove">${icon('trash-2')}Șterge</button>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;

    summaryHost.innerHTML = cartSummaryTemplate(subtotalMinor);
    renderIcons(itemsHost);
    renderIcons(summaryHost);

    qs('#sum-products').textContent = formatMoney(subtotalMinor);
    qs('#sum-shipping').textContent = formatMoney(SHIPPING_MINOR);
    qs('#sum-total').textContent = formatMoney(subtotalMinor + SHIPPING_MINOR);

    itemsHost.onclick = async (event) => {
      const actionButton = event.target.closest('[data-cart-action]');
      const row = event.target.closest('[data-item-id]');
      if (!actionButton || !row) return;

      const itemId = Number(row.dataset.itemId);
      const currentItem = items.find((item) => Number(item.id) === itemId);
      if (!currentItem) return;
      const currentQuantity = Number(currentItem.quantity || 1);

      actionButton.disabled = true;
      try {
        if (actionButton.dataset.cartAction === 'remove') {
          await cartRemove(itemId);
        } else {
          const nextQuantity = actionButton.dataset.cartAction === 'increase'
            ? currentQuantity + 1
            : Math.max(1, currentQuantity - 1);
          await cartUpdate(itemId, nextQuantity);
        }
        await renderCartPage();
      } catch (error) {
        showToast(error.message || 'Nu am putut actualiza coșul.', 'error');
      }
    };

    qs('#checkout-button')?.addEventListener('click', () => {
      panel.classList.add('is-open');
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    form.onsubmit = async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {
        full_name: String(formData.get('full_name') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        address: String(formData.get('address') || '').trim()
      };

      if (!payload.full_name || !payload.phone || !payload.address) {
        showToast('Completează toate câmpurile pentru livrare.', 'error');
        return;
      }

      const submitButton = qs('button[type="submit"]', form);
      submitButton.disabled = true;

      try {
        const order = await createCodOrder(payload);
        await clearServerCart();
        location.href = `success.html?id=${encodeURIComponent(order.id || order.order_id || '')}`;
      } catch (error) {
        showToast(error.message || 'Nu am putut plasa comanda.', 'error');
      } finally {
        submitButton.disabled = false;
      }
    };
  } catch (error) {
    if (error.status === 401) {
      location.href = `login.html?next=${encodeURIComponent(currentRelativeUrl())}`;
      return;
    }
    itemsHost.innerHTML = `<div class="empty-state"><div class="icon-badge">${icon('package', 'icon-xl')}</div><h2>Nu am putut încărca coșul</h2><p>${escapeHtml(error.message || 'Încearcă din nou mai târziu.')}</p></div>`;
  }
}

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function updatePasswordStrength(password) {
  const bars = qsa('[data-strength-bar]');
  const label = qs('#password-strength-label');
  const score = passwordStrength(password);
  const tone = score <= 1 ? 'weak' : score <= 3 ? 'medium' : 'strong';
  const labelText = score <= 1 ? 'Parolă slabă' : score <= 3 ? 'Parolă medie' : 'Parolă puternică';

  bars.forEach((bar, index) => {
    bar.className = 'password-strength-bar';
    if (index < score) bar.classList.add('is-active', tone);
  });

  if (label) label.textContent = password ? labelText : 'Folosește minimum 8 caractere.';
}

function bindPasswordToggles(root = document) {
  qsa('[data-password-toggle]', root).forEach((button) => {
    button.addEventListener('click', () => {
      const input = qs(`#${button.dataset.passwordToggle}`, root) || qs(`#${button.dataset.passwordToggle}`);
      if (!input) return;
      const nextType = input.type === 'password' ? 'text' : 'password';
      input.type = nextType;
      button.setAttribute('aria-label', nextType === 'password' ? 'Arată parola' : 'Ascunde parola');
      button.innerHTML = icon(nextType === 'password' ? 'eye' : 'eye-off');
    });
  });
}

function bindAccountTabs() {
  const buttons = qsa('[data-account-panel]');
  const panels = qsa('.account-panel');
  if (!buttons.length || !panels.length) return;

  function activate(panelName) {
    buttons.forEach((button) => button.classList.toggle('is-active', button.dataset.accountPanel === panelName));
    panels.forEach((panel) => panel.classList.toggle('is-active', panel.id === `account-panel-${panelName}`));
  }

  buttons.forEach((button) => button.addEventListener('click', () => activate(button.dataset.accountPanel)));
}

function renderOrders(host, orders) {
  if (!host) return;
  if (!orders.length) {
    host.innerHTML = `
      <div class="empty-state">
        <div class="icon-badge">${icon('package', 'icon-xl')}</div>
        <h3>Nu ai comenzi încă</h3>
        <p>Comenzile tale vor apărea aici după prima achiziție.</p>
        <a class="btn btn-primary" href="categories.html">Începe cumpărăturile</a>
      </div>
    `;
    return;
  }

  host.innerHTML = orders.map((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const detailsId = `order-details-${order.id}`;
    return `
      <article class="order-card">
        <div class="order-card-header">
          <div>
            <h3>Comanda #${escapeHtml(order.invoice_no || String(order.id || ''))}</h3>
            <p>${order.created_at ? new Date(order.created_at).toLocaleDateString('ro-RO') : 'Data indisponibilă'}</p>
          </div>
          <span class="status-badge ${statusClass(order.status)}">${escapeHtml(statusLabel(order.status))}</span>
        </div>
        <div class="order-card-summary">
          <span>${totalItems} produse</span>
          <strong>${formatMoney(order.total_amount, order.currency)}</strong>
        </div>
        <button type="button" class="inline-link order-details-toggle" data-order-toggle="${detailsId}">Vezi detalii</button>
        <div id="${detailsId}" class="helper-text hidden">
          ${items.map((item) => `<div>${escapeHtml(item.product?.name || 'Produs')} × ${Number(item.quantity || 0)}</div>`).join('')}
        </div>
      </article>
    `;
  }).join('');

  qsa('[data-order-toggle]', host).forEach((button) => {
    button.addEventListener('click', () => {
      const details = qs(`#${button.dataset.orderToggle}`, host);
      if (!details) return;
      details.classList.toggle('hidden');
      button.textContent = details.classList.contains('hidden') ? 'Vezi detalii' : 'Ascunde detaliile';
    });
  });
}

async function renderAccountPage(user) {
  if (!qs('.account-layout')) return;
  if (!user) {
    location.href = `login.html?next=${encodeURIComponent(currentRelativeUrl())}`;
    return;
  }

  qs('#account-email').textContent = user.email || '';
  qs('#account-summary-email').textContent = user.email || '-';
  bindAccountTabs();
  bindPasswordToggles();

  const passwordInput = qs('#new-password');
  passwordInput?.addEventListener('input', () => updatePasswordStrength(passwordInput.value));
  updatePasswordStrength(passwordInput?.value || '');

  qs('#logout-button')?.addEventListener('click', performLogout);

  const passwordForm = qs('#change-pass-form');
  const passwordStatus = qs('#password-status');
  passwordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(passwordForm);
    const currentPassword = String(formData.get('current_password') || '');
    const newPassword = String(formData.get('new_password') || '');
    const confirmPassword = String(formData.get('new_password2') || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatusMessage(passwordStatus, 'Completează toate câmpurile.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage(passwordStatus, 'Parolele noi nu coincid.', 'error');
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setStatusMessage(passwordStatus, 'Parola a fost schimbată cu succes.', 'success');
      passwordForm.reset();
      updatePasswordStrength('');
    } catch (error) {
      setStatusMessage(passwordStatus, error.message || 'Nu am putut schimba parola.', 'error');
    }
  });

  const ordersHost = qs('#orders-host');
  if (ordersHost) ordersHost.innerHTML = skeletonCards(2);

  try {
    const orders = await fetchOrders();
    renderOrders(ordersHost, orders);
  } catch (error) {
    ordersHost.innerHTML = `<div class="empty-state"><div class="icon-badge">${icon('package', 'icon-xl')}</div><h3>Nu am putut încărca comenzile</h3><p>${escapeHtml(error.message || 'Încearcă din nou mai târziu.')}</p></div>`;
  }
}

function getSelectedFiles(fileInput) {
  return Array.from(fileInput?.files || []);
}

function validateFiles(files) {
  if (files.length > MAX_UPLOAD_FILES) {
    return `Poți încărca maximum ${MAX_UPLOAD_FILES} fișiere.`;
  }

  for (const file of files) {
    const extension = `.${String(file.name).split('.').pop().toLowerCase()}`;
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
      return `Tip fișier neacceptat: ${extension}`;
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      return `Fișierul ${file.name} depășește limita de 5MB.`;
    }
  }

  return '';
}

function renderFilePreviews(fileInput) {
  const previewHost = qs('#file-preview-grid');
  if (!previewHost) return;
  const files = getSelectedFiles(fileInput);
  previewHost.innerHTML = files.map((file) => {
    const isImage = file.type.startsWith('image/');
    const preview = isImage ? `<img src="${URL.createObjectURL(file)}" alt="${escapeHtml(file.name)}">` : `<div class="icon-badge">${icon('package', 'icon-lg')}</div>`;
    return `
      <div class="file-preview">
        <div class="file-preview-thumb">${preview}</div>
        <div class="file-preview-name">${escapeHtml(file.name)}</div>
      </div>
    `;
  }).join('');
}

function bindDropzone(fileInput) {
  const dropzone = qs('#custom-dropzone');
  if (!dropzone || !fileInput) return;

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-dragging');
    });
  });

  dropzone.addEventListener('drop', (event) => {
    const files = Array.from(event.dataTransfer?.files || []);
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    fileInput.files = transfer.files;
    renderFilePreviews(fileInput);
  });

  fileInput.addEventListener('change', () => renderFilePreviews(fileInput));
}

async function renderCustomPage(user) {
  const form = qs('#custom-form');
  if (!form) return;
  if (!user) {
    location.href = `login.html?next=${encodeURIComponent(currentRelativeUrl())}`;
    return;
  }

  const emailField = qs('#custom-email');
  if (emailField && user.email) emailField.value = user.email;

  const fileInput = qs('#custom-files');
  bindDropzone(fileInput);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    setStatusMessage(qs('#custom-success'), '', 'success');

    const nameField = qs('#custom-name');
    const descriptionField = qs('#custom-description');
    const files = getSelectedFiles(fileInput);

    let hasError = false;
    if (!String(nameField?.value || '').trim()) {
      setFieldError(qs('[data-field="name"]', form), 'Completează numele complet.');
      hasError = true;
    }
    if (!isValidEmail(emailField?.value || '')) {
      setFieldError(qs('[data-field="email"]', form), 'Introdu o adresă de email validă.');
      hasError = true;
    }
    if (!String(descriptionField?.value || '').trim()) {
      setFieldError(qs('[data-field="description"]', form), 'Descrie produsul dorit.');
      hasError = true;
    }

    const fileError = validateFiles(files);
    if (fileError) {
      setFieldError(qs('[data-field="files"]', form), fileError);
      hasError = true;
    }

    if (hasError) return;

    const payload = new FormData();
    payload.append('email', String(emailField.value).trim());
    payload.append('description', `Nume: ${String(nameField.value).trim()}\n\n${String(descriptionField.value).trim()}`);
    files.forEach((file) => payload.append('files', file));

    const submitButton = qs('button[type="submit"]', form);
    submitButton.disabled = true;

    try {
      await request('/custom-requests', { method: 'POST', data: payload });
      setStatusMessage(qs('#custom-success'), 'Cererea ta a fost trimisă cu succes. Te vom contacta în curând!', 'success');
      form.reset();
      renderFilePreviews(fileInput);
    } catch (error) {
      setStatusMessage(qs('#custom-success'), error.message || 'Nu am putut trimite cererea.', 'error');
    } finally {
      submitButton.disabled = false;
    }
  });
}

function validateAuthField(form, key, message) {
  const field = qs(`[data-field="${key}"]`, form);
  if (field) setFieldError(field, message);
}

function bindLoginForm() {
  const form = qs('#login-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    const status = qs('#login-status');
    setStatusMessage(status, '', 'success');

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    let hasError = false;

    if (!isValidEmail(email)) {
      validateAuthField(form, 'email', 'Introdu o adresă de email validă.');
      hasError = true;
    }
    if (!password) {
      validateAuthField(form, 'password', 'Introdu parola.');
      hasError = true;
    }
    if (hasError) return;

    const submitButton = qs('button[type="submit"]', form);
    submitButton.disabled = true;

    try {
      await request('/auth/login', { method: 'POST', data: { email, password } });
      const next = param('next');
      location.href = next || 'account.html';
    } catch (error) {
      setStatusMessage(status, error.message || 'Autentificare eșuată.', 'error');
    } finally {
      submitButton.disabled = false;
    }
  });
}

function bindRegisterForm() {
  const form = qs('#register-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    const status = qs('#register-status');
    setStatusMessage(status, '', 'success');

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const confirm = String(formData.get('password_confirm') || '');
    let hasError = false;

    if (!isValidEmail(email)) {
      validateAuthField(form, 'email', 'Introdu o adresă de email validă.');
      hasError = true;
    }
    if (password.length < 8) {
      validateAuthField(form, 'password', 'Parola trebuie să aibă minimum 8 caractere.');
      hasError = true;
    }
    if (password !== confirm) {
      validateAuthField(form, 'password-confirm', 'Parolele nu coincid.');
      hasError = true;
    }
    if (hasError) return;

    const submitButton = qs('button[type="submit"]', form);
    submitButton.disabled = true;

    try {
      await request('/auth/register', { method: 'POST', data: { email, password } });
      setStatusMessage(status, 'Cont creat. Te poți autentifica acum.', 'success');
      setTimeout(() => { location.href = 'login.html'; }, 800);
    } catch (error) {
      setStatusMessage(status, error.message || 'Înregistrare eșuată.', 'error');
    } finally {
      submitButton.disabled = false;
    }
  });
}

function renderSuccessPage() {
  const host = qs('#success-order-id');
  if (!host) return;
  const orderId = param('id');
  host.textContent = orderId ? `Număr comandă: #${orderId}` : 'Comanda a fost preluată în sistem.';
}

async function bootstrap() {
  const me = await fetchMe();
  renderHeader(me);
  renderFooter();
  renderCookieBanner();
  renderIcons(document);
  bindGlobalProductActions();
  bindLoginForm();
  bindRegisterForm();
  renderSuccessPage();
  await initHeaderState();

  if (CURRENT_PAGE === 'home') await renderHomePage();
  if (qs('#catalog-products-grid')) await renderCatalogLandingPage();
  if (qs('#products-list')) await renderCategoryPage();
  if (qs('#product-detail')) await renderProductPage();
  if (CURRENT_PAGE === 'cart') await renderCartPage();
  if (CURRENT_PAGE === 'account') await renderAccountPage(me);
  if (CURRENT_PAGE === 'custom') await renderCustomPage(me);
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error(error);
    showToast('A apărut o eroare la inițializarea paginii.', 'error');
  });
});
