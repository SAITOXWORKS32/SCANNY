/* SCANNY — funções de interface reutilizáveis: escape, formatação, selos, aviso, modal, passos e persistência. */

const NA = 'Não disponível';

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function $(sel, root = document) { return root.querySelector(sel); }

/* Mostra "Não disponível" quando o valor não existe, em vez de um número falso. */
function val(v, fmt = (x) => x) {
  return v === null || v === undefined || v === '' ? NA : fmt(v);
}

function gb(v) { return v === null || v === undefined ? NA : `${String(v.toFixed ? v.toFixed(v < 10 ? 2 : 1) : v).replace('.', ',')} GB`; }
function mb(v) { return v === null || v === undefined ? NA : `${Math.round(v * 1024)} MB`; }
function pctText(v) { return v === null || v === undefined ? NA : `${v}%`; }

function nowText() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* Níveis de risco do documento (seção 7). */
const RISK = {
  seguro: ['Seguro', 'r-seguro'],
  baixo: ['Baixo risco', 'r-baixo'],
  medio: ['Médio risco', 'r-medio'],
  alto: ['Alto risco', 'r-alto'],
};
function riskTag(key) {
  const [label, cls] = RISK[key] || RISK.seguro;
  return `<span class="risk ${cls}">${label}</span>`;
}

/* Barra de progresso. pct = 0 a 100 ou null (sem dado). */
function bar(pct, tone = '') {
  if (pct === null || pct === undefined) return `<div class="bar bar-na"><span style="width:0"></span></div>`;
  const t = tone || (pct >= 90 ? 'bad' : pct >= 75 ? 'warn' : '');
  return `<div class="bar ${t}"><span style="width:${Math.min(100, Math.max(0, pct))}%"></span></div>`;
}

/* Aviso embutido na página. kind: info | ok | warn | bad */
function alertBox(kind, title, text, icoName = 'info') {
  return `<div class="alert alert-${kind}">
    <div class="alert-ic">${icon(icoName)}</div>
    <div><strong>${esc(title)}</strong>${text ? `<p>${text}</p>` : ''}</div>
  </div>`;
}

/* Estado vazio com ação. */
function emptyState(icoName, title, text, actionHtml = '') {
  return `<div class="empty">
    <div class="empty-ic">${icon(icoName)}</div>
    <h3>${esc(title)}</h3>
    <p>${text}</p>
    ${actionHtml ? `<div class="empty-actions">${actionHtml}</div>` : ''}
  </div>`;
}

/* Carregamento com esqueleto (linhas que pulsam). */
function skeleton(lines = 4) {
  return `<div class="skeleton" aria-busy="true">${Array.from({ length: lines }, (_, i) => `<span style="width:${88 - i * 9}%"></span>`).join('')}</div>`;
}

/* ---------- Avisos rápidos (toast) ---------- */
function toast(text, kind = 'ok') {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `${icon(kind === 'bad' ? 'alert' : kind === 'warn' ? 'alert' : 'check')}<span>${esc(text)}</span>`;
  host.append(el);
  setTimeout(() => el.classList.add('out'), 3000);
  setTimeout(() => el.remove(), 3400);
}

/* ---------- Modal de confirmação ----------
 * openModal({ title, body, buttons:[{label, value, cls, keep?, onClick?}], danger? })
 * Retorna uma Promise com o value do botão clicado, ou null ao fechar.
 * keep: true faz o botão chamar onClick() sem fechar o modal (ex.: "Criar backup").
 */
function openModal({ title, body, buttons = [], danger = false }) {
  return new Promise((resolve) => {
    const root = $('#modal-root');
    const back = document.createElement('div');
    back.className = 'backdrop';
    back.innerHTML = `
      <div class="modal ${danger ? 'modal-danger' : ''}" role="dialog" aria-modal="true" aria-labelledby="m-title">
        <div class="modal-head">
          <h2 id="m-title">${esc(title)}</h2>
          <button class="icon-btn" data-close aria-label="Fechar">${icon('x')}</button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-foot">
          ${buttons.map((b, i) => `<button class="btn ${b.cls || 'ghost'}" data-val="${esc(b.value)}" data-i="${i}">${esc(b.label)}</button>`).join('')}
        </div>
      </div>`;
    root.append(back);
    const close = (value) => { back.remove(); document.removeEventListener('keydown', onKey); resolve(value); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', (e) => {
      if (e.target === back || e.target.closest('[data-close]')) return close(null);
      const el = e.target.closest('[data-val]');
      if (!el) return;
      const b = buttons[Number(el.dataset.i)];
      if (b.keep) { if (b.onClick) b.onClick(); return; }   // botão que não fecha o modal
      close(b.value);
    });
    const first = back.querySelector('.modal-foot .btn');
    if (first) first.focus();
  });
}

/* Executa uma lista de passos com atraso, chamando onStep(i) a cada passo.
 * Retorna Promise. Use `signal.cancelled` para interromper. */
function runSteps(count, onStep, { delay = 500, signal = {} } = {}) {
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      if (signal.cancelled) return resolve(false);
      if (i >= count) return resolve(true);
      onStep(i);
      i += 1;
      setTimeout(tick, delay);
    };
    tick();
  });
}

/* Animação de contagem de um valor até o alvo (para barras e totais). */
function countUp(el, to, fmt = (n) => n) {
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const dur = 700;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Persistência (localStorage com try/catch) ---------- */
const store = {
  key: 'scanny.v1',
  load(def) {
    try { return { ...def, ...JSON.parse(localStorage.getItem(this.key) || '{}') }; } catch (e) { return { ...def }; }
  },
  save(data) {
    try { localStorage.setItem(this.key, JSON.stringify(data)); } catch (e) { /* sem armazenamento: segue sem salvar */ }
  },
  clear() {
    try { localStorage.removeItem(this.key); } catch (e) { /* ignora */ }
  },
};
