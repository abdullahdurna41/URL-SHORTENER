/* ==========================================================================
   URL Kisaltici - arayuz mantigi
   Derleme adimi yok; API ile ayni origin'de calisir, bu yuzden CORS gerekmez.
   ========================================================================== */

const TOKEN_KEY = 'urlshortener.token';
const EMAIL_KEY = 'urlshortener.email';

const $ = (sel) => document.querySelector(sel);

const state = {
  mode: 'login',
  links: [],
  openStatsId: null,
};

/* ---------- API katmani ---------- */

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Tum istekler buradan geciyor.
 * 401 alirsak token gecersizdir - oturumu temizleyip giris ekranina donuyoruz,
 * boylece suresi dolmus token ile sonsuz hata donguse girilmiyor.
 */
async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401 && token) {
    logout();
    throw new Error('Oturumun sona erdi, tekrar giriş yap.');
  }

  if (res.status === 204) return null;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : await res.blob();

  if (!res.ok) {
    throw new Error(isJson ? payload.error : 'Beklenmeyen bir hata oluştu.');
  }
  return payload;
}

/* ---------- kucuk yardimcilar ---------- */

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 2400);
}

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function clearError(el) {
  el.textContent = '';
  el.hidden = true;
}

function isExpired(link) {
  return Boolean(link.expiresAt) && new Date(link.expiresAt) <= new Date();
}

/** XSS'e karsi: kullanici verisi hicbir yerde innerHTML ile basilmiyor. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ---------- oturum ---------- */

function showAuth() {
  $('#auth-view').hidden = false;
  $('#app-view').hidden = true;
}

function showApp() {
  $('#auth-view').hidden = true;
  $('#app-view').hidden = false;
  $('#current-email').textContent = localStorage.getItem(EMAIL_KEY) || '';
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  state.links = [];
  state.openStatsId = null;
  $('#link-list').replaceChildren();
  showAuth();
}

/* ---------- giris / kayit ---------- */

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    state.mode = tab.dataset.mode;

    document.querySelectorAll('.tab').forEach((t) => {
      const active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });

    const registering = state.mode === 'register';
    $('#auth-submit').textContent = registering ? 'Kayıt ol' : 'Giriş yap';
    $('#password-hint').hidden = !registering;
    $('#auth-password').autocomplete = registering ? 'new-password' : 'current-password';
    clearError($('#auth-error'));
  });
});

$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorEl = $('#auth-error');
  const submit = $('#auth-submit');
  clearError(errorEl);

  const email = $('#auth-email').value.trim();
  const password = $('#auth-password').value;

  if (!email || !password) {
    return showError(errorEl, 'E-posta ve parola gerekli.');
  }

  submit.disabled = true;
  try {
    const data = await api(`/auth/${state.mode}`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(EMAIL_KEY, data.user.email);

    $('#auth-form').reset();
    showApp();
    await loadLinks();
  } catch (err) {
    showError(errorEl, err.message);
  } finally {
    submit.disabled = false;
  }
});

$('#logout').addEventListener('click', logout);

/* ---------- link olusturma ---------- */

$('#create-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorEl = $('#create-error');
  const submit = $('#create-submit');
  clearError(errorEl);

  const body = { originalUrl: $('#original-url').value.trim() };

  const alias = $('#custom-alias').value.trim();
  if (alias) body.customAlias = alias;

  // datetime-local yerel saat verir; API ISO 8601 (UTC) bekliyor.
  const expires = $('#expires-at').value;
  if (expires) body.expiresAt = new Date(expires).toISOString();

  submit.disabled = true;
  try {
    await api('/links', { method: 'POST', body: JSON.stringify(body) });
    $('#create-form').reset();
    showToast('Kısa link oluşturuldu.');
    await loadLinks();
  } catch (err) {
    showError(errorEl, err.message);
  } finally {
    submit.disabled = false;
  }
});

/* ---------- liste ---------- */

async function loadLinks() {
  const data = await api('/links');
  state.links = data.links;
  renderLinks();
}

function renderLinks() {
  const list = $('#link-list');
  const count = state.links.length;

  $('#link-count').textContent = count ? `${count} link` : '';
  $('#empty-state').hidden = count > 0;

  list.replaceChildren(...state.links.map(renderLink));
}

function renderLink(link) {
  const item = el('li', 'link');
  item.dataset.id = link.id;

  const main = el('div', 'link-main');

  const code = el('a', 'link-code', `/${link.shortCode}`);
  code.href = link.shortUrl;
  code.target = '_blank';
  code.rel = 'noopener noreferrer';

  const target = el('span', 'link-target', link.originalUrl);
  target.title = link.originalUrl;

  main.append(code, target);

  if (isExpired(link)) {
    main.append(el('span', 'badge expired', 'süresi doldu'));
  }

  const actions = el('div', 'link-actions');

  const copyBtn = el('button', 'act', 'Kopyala');
  copyBtn.type = 'button';
  copyBtn.addEventListener('click', () => copyToClipboard(link.shortUrl));

  const statsBtn = el('button', 'act', 'İstatistik');
  statsBtn.type = 'button';
  statsBtn.setAttribute('aria-expanded', String(state.openStatsId === link.id));
  statsBtn.addEventListener('click', () => toggleStats(link, item, statsBtn));

  const deleteBtn = el('button', 'act danger', 'Sil');
  deleteBtn.type = 'button';
  deleteBtn.addEventListener('click', () => deleteLink(link));

  actions.append(copyBtn, statsBtn, deleteBtn);
  main.append(actions);
  item.append(main);

  // Acik olan istatistik paneli listeyi yeniden cizerken kapanmasin
  if (state.openStatsId === link.id) {
    loadStatsInto(item, link.id);
  }

  return item;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Kısa link panoya kopyalandı.');
  } catch {
    // Clipboard API https disi baglamlarda engellenebiliyor
    showToast('Kopyalanamadı — adresi elle seçebilirsin.');
  }
}

async function deleteLink(link) {
  if (!confirm(`/${link.shortCode} silinsin mi? Bu link artık yönlendirmeyecek.`)) return;

  try {
    await api(`/links/${link.id}`, { method: 'DELETE' });
    if (state.openStatsId === link.id) state.openStatsId = null;
    showToast('Link silindi.');
    await loadLinks();
  } catch (err) {
    showToast(err.message);
  }
}

/* ---------- istatistik ---------- */

function toggleStats(link, item, button) {
  const open = state.openStatsId === link.id;
  state.openStatsId = open ? null : link.id;
  button.setAttribute('aria-expanded', String(!open));

  item.querySelector('.stats')?.remove();
  if (!open) loadStatsInto(item, link.id);
}

async function loadStatsInto(item, linkId) {
  const panel = el('div', 'stats');
  panel.append(el('p', 'stats-label', 'Yükleniyor…'));
  item.append(panel);

  try {
    const stats = await api(`/links/${linkId}/stats`);
    panel.replaceChildren(...buildStats(stats, linkId));
  } catch (err) {
    panel.replaceChildren(el('p', 'form-error', err.message));
  }
}

function buildStats(stats, linkId) {
  const parts = [];

  const head = el('div', 'stats-head');
  head.append(
    el('span', 'stats-total', String(stats.totalClicks)),
    el('span', 'stats-label', stats.totalClicks === 1 ? 'tıklanma' : 'toplam tıklanma')
  );
  parts.push(head);

  parts.push(buildChart(stats.last7Days));

  if (stats.topReferrers?.length) {
    const block = el('div');
    block.append(el('p', 'chart-title', 'Kaynaklar'));
    const rows = el('div', 'refs');
    for (const ref of stats.topReferrers) {
      const row = el('div', 'ref-row');
      row.append(el('span', null, ref.referrer), el('span', null, String(ref.count)));
      rows.append(row);
    }
    block.append(rows);
    parts.push(block);
  }

  const qrBtn = el('button', 'act', 'QR kodu göster');
  qrBtn.type = 'button';
  qrBtn.style.alignSelf = 'flex-start';
  qrBtn.addEventListener('click', () => showQr(qrBtn, linkId));
  parts.push(qrBtn);

  return parts;
}

/**
 * Son 7 gunun sutun grafigi. Tek seri oldugu icin lejant yok - baslik
 * neyi gosterdigini soyluyor. Sadece en yuksek gunun degeri yaziliyor;
 * her sutuna sayi basmak grafigi okunmaz hale getirirdi.
 * Ekran okuyucular icin ayni veri gorunmez bir tabloda tekrar ediliyor.
 */
function buildChart(days) {
  const block = el('div');
  block.append(el('p', 'chart-title', 'Son 7 gün'));

  const max = Math.max(...days.map((d) => d.count), 0);

  const chart = el('div', 'chart');
  for (const day of days) {
    const col = el('div', 'bar-col');

    const value = el('span', 'bar-value', String(day.count));
    if (!(day.count > 0 && day.count === max)) value.classList.add('is-hidden');

    const bar = el('div', day.count === 0 ? 'bar zero' : 'bar');
    bar.style.setProperty('--h', max > 0 ? `${(day.count / max) * 100}%` : '2px');

    col.title = `${formatDay(day.date)}: ${day.count} tıklanma`;
    col.append(value, bar);
    chart.append(col);
  }
  block.append(chart);

  const axis = el('div', 'chart-axis');
  for (const day of days) {
    axis.append(el('span', null, formatDay(day.date)));
  }
  block.append(axis);

  // Grafigin metin karsiligi
  const table = el('table', 'sr-only');
  const caption = el('caption', null, 'Son 7 günün tıklanma dağılımı');
  const tbody = el('tbody');
  for (const day of days) {
    const tr = el('tr');
    tr.append(el('th', null, day.date), el('td', null, String(day.count)));
    tbody.append(tr);
  }
  table.append(caption, tbody);
  block.append(table);

  return block;
}

function formatDay(isoDate) {
  // "2026-07-22" -> "22 Tem"
  const [, month, day] = isoDate.split('-');
  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${Number(day)} ${months[Number(month) - 1]}`;
}

async function showQr(button, linkId) {
  // QR ucu Authorization basligi bekliyor; <img src> baslik gonderemedigi
  // icin once fetch ile alinip blob URL'e cevriliyor.
  button.disabled = true;
  try {
    const blob = await api(`/links/${linkId}/qr`);
    const wrap = el('div', 'qr');
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    img.alt = 'Kısa linkin QR kodu';
    img.addEventListener('load', () => URL.revokeObjectURL(img.src), { once: true });
    wrap.append(img);
    button.replaceWith(wrap);
  } catch (err) {
    showToast(err.message);
    button.disabled = false;
  }
}

/* ---------- baslangic ---------- */

(async function init() {
  if (!getToken()) return showAuth();

  showApp();
  try {
    await loadLinks();
  } catch {
    // api() 401'de zaten oturumu temizleyip giris ekranini aciyor
  }
})();
