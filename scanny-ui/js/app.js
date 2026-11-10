/* SCANNY — estado, roteamento e ações.
 * Regra de ouro: analisar nunca altera nada. Toda mudança passa por confirmação (quando necessária),
 * é registrada no histórico e, quando possível, pode ser desfeita. */

const APP_VERSION = SCANNY_NATIVE?.available ? '1.1.0 (desktop)' : '1.1.0 (protótipo)';

const DEFAULT_STATE = {
  settings: {
    sample: false,         // Desenvolvimento: mostra dados de exemplo (desligado = "Não disponível")
    startWithWindows: false,
    minimizeTray: true,
    theme: 'escuro',       // escuro (padrão) | claro | auto
    lang: 'pt',
    confirmDanger: true,
    notifs: true,
    logs: true,
    autoCheck: false,
    gameBar: false,
    archiveBeforeDelete: true, // guarda cópia no Arquivo do SCANNY antes de excluir arquivo grande
    archiveLimit: 20,          // GB
  },
  effects: {
    profile: 'equilibrado',
    current: Object.fromEntries(EFFECTS.map((e) => [e.k, PROFILES.equilibrado.on.includes(e.k)])),
    custom: null,
    previous: null,
  },
  startupOff: {},
  privacy: { anuncios: true, iniciar: true, historico: true, localizacao: true, camera: true, explorador: true },
  analysis: { status: 'idle', step: 0, results: false, when: null },
  clean: { analyzed: false, running: false, progress: null, selected: [], allTempCaches: false, recycle: false, browser: false, result: null },
  repair: null,
  powerPlan: null,
  games: { measure: null },
  archive: [],     // Arquivo do SCANNY: cópias guardadas pelo app
  fileLog: [],     // Recentes: arquivos que o app tocou
  gone: {},        // caminhos de arquivos excluídos na simulação (somem de Armazenamento)
  seeded: false,   // dados de exemplo do arquivo já foram colocados
  history: [],
  lastAnalysis: null,
  lastClean: null,
  lastBackup: null,
  ui: {
    perfTab: 'efeitos', initFilter: 'todos', histFilter: 'todas',
    refresh: 5,                 // Ao vivo: segundos entre leituras (0 = pausado)
    archStatus: 'todos', archType: 'todos', archSort: 'recentes', archQuery: '',
    recFilter: 'todos',
  },
};

/* Cópia profunda simples (o estado é só JSON). */
const clone = (o) => JSON.parse(JSON.stringify(o));

/* Junta o estado salvo com o padrão, nível por nível, para não perder chaves novas. */
function mergeState(base, saved) {
  if (!saved || typeof saved !== 'object') return clone(base);
  const out = clone(base);
  for (const k of Object.keys(saved)) {
    const a = out[k], b = saved[k];
    if (a && typeof a === 'object' && !Array.isArray(a) && b && typeof b === 'object' && !Array.isArray(b)) out[k] = { ...a, ...b };
    else out[k] = b;
  }
  return out;
}

let S = DEFAULT_STATE;
let repairSignal = { cancelled: false };
let NAV_Q = '';   // busca na barra lateral (só na tela)

/* Efeito "alvo" = o que o botão Aplicar vai deixar ativo. */
function effTarget(s) {
  const p = s.effects.profile;
  if (p === 'personalizado') return { ...(s.effects.custom || s.effects.current) };
  const on = PROFILES[p].on;
  return Object.fromEntries(EFFECTS.map((e) => [e.k, on.includes(e.k)]));
}
const countOn = (o) => Object.values(o).filter(Boolean).length;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Menu em grupos e categorias. Cada categoria abre a sua lista de subcategorias.
 * Rota: #/pagina ou #/pagina/subcategoria (ex.: #/visao-geral/recomendacoes). */
const NAV = [
  { group: 'Painel', cat: 'Início', icon: 'home', items: [
    { title: 'Resumo', page: 'visao-geral' },
    { title: 'Recomendações', page: 'visao-geral', sub: 'recomendacoes' },
  ] },
  { group: 'Painel', cat: 'Arquivos', icon: 'archive', items: [
    { title: 'Arquivo do SCANNY', page: 'arquivo' },
    { title: 'Recentes', page: 'recentes' },
    { title: 'Armazenamento', page: 'armazenamento' },
  ] },
  { group: 'Painel', cat: 'Atividade', icon: 'wave', items: [
    { title: 'Ao vivo', page: 'ao-vivo' },
    { title: 'Histórico', page: 'historico' },
  ] },
  { group: 'Ferramentas', cat: 'Otimização', icon: 'sparkles', items: [
    { title: 'Análise', page: 'analisar' },
    { title: 'Limpeza', page: 'limpeza' },
    { title: 'Desempenho', page: 'desempenho' },
    { title: 'Inicialização', page: 'inicializacao' },
  ] },
  { group: 'Ferramentas', cat: 'Sistema', icon: 'wrench', items: [
    { title: 'Jogos', page: 'jogos' },
    { title: 'Reparos', page: 'reparos' },
  ] },
  { group: 'Ferramentas', cat: 'Proteção', icon: 'shield', items: [
    { title: 'Privacidade', page: 'privacidade' },
    { title: 'Segurança e restauração', page: 'seguranca' },
  ] },
  { group: 'Aplicativo', cat: 'Aplicativo', icon: 'cog', items: [
    { title: 'Configurações', page: 'configuracoes' },
    { title: 'Sobre', page: 'sobre' },
  ] },
];
const DEFAULT_SUB = {};
const ANCHOR = { recomendacoes: 'rec-all' };

function parseRoute() {
  const [p, sub] = location.hash.replace(/^#\/?/, '').split('/');
  const page = PAGES.some((x) => x.id === p) ? p : 'visao-geral';
  return { page, sub: sub ?? DEFAULT_SUB[page] ?? null };
}
const sameItem = (i, r) => i.page === r.page && (i.sub ?? DEFAULT_SUB[i.page] ?? null) === r.sub;
const itemPath = (i) => (i.sub ? `${i.page}/${i.sub}` : i.page);
const catOf = (r) => NAV.find((c) => c.items.some((i) => sameItem(i, r)))?.cat ?? null;
const findItem = (r) => NAV.flatMap((c) => c.items).find((i) => sameItem(i, r)) ?? null;

function save() { store.save(S); }

function pushHistory(entry) {
  S.history.unshift({
    id: newId('h'),
    when: nowText(),
    user: 'Usuario',
    category: '',
    action: '',
    before: null,
    after: null,
    result: 'Concluído',
    undo: null,
    ...entry,
  });
  S.history = S.history.slice(0, 200);
}

/* Identificador curto para histórico, arquivo e registro. */
function newId(p) { return `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; }

function logFile(type, name, path, text) {
  S.fileLog.unshift({ id: newId('f'), when: nowText(), name, path, type, text });
  S.fileLog = S.fileLog.slice(0, 200);
}

/* Guarda uma cópia do arquivo no Arquivo do SCANNY (antes de sair do Windows). */
function archiveFile(f, origin) {
  S.archive.unshift({
    id: newId('a'), name: f.name, kind: kindOf(f.name), path: f.path, size: f.size,
    origin, archivedAt: nowText(), status: 'so-scanny', conflict: false,
  });
  logFile('arquivado', f.name, f.path, 'Cópia guardada no arquivo do SCANNY');
}

/* Primeira vez com dados de exemplo: preenche o arquivo e o registro de recentes. */
function seedSample() {
  if (S.seeded) return;
  S.archive = clone(SCANNY_SAMPLE.archive);
  S.fileLog = clone(SCANNY_SAMPLE.fileLog);
  S.seeded = true;
}

function applyTheme() {
  const t = S.settings.theme;
  document.documentElement.dataset.theme = t === 'auto' ? '' : t;
}

/* ---------- Roteamento e render ---------- */

function go(id) {
  if (location.hash === `#/${id}`) return render();
  location.hash = `#/${id}`;
}

function buildNav() {
  const r = parseRoute();
  const active = catOf(r);
  const open = S.ui.openCat ?? active;     // '' = usuário fechou a categoria
  const q = NAV_Q.trim().toLowerCase();
  const match = (i) => !q || i.title.toLowerCase().includes(q);
  let html = '';
  let lastGroup = null;

  for (const c of NAV) {
    const items = c.items.filter(match);
    if (q && !items.length) continue;
    if (c.group !== lastGroup) { html += `<p class="nav-group">${esc(c.group)}</p>`; lastGroup = c.group; }
    const isOpen = q ? true : c.cat === open;
    html += `<div class="cat-group${isOpen ? ' open' : ''}">
      <button class="cat${c.cat === active ? ' on' : ''}" data-action="cat" data-arg="${esc(c.cat)}" aria-expanded="${isOpen}">
        ${icon(c.icon)}<span>${esc(c.cat)}</span>${icon('chevron', 'chev')}
      </button>
      <ul class="sub-list"${isOpen ? '' : ' hidden'}>
        ${items.map((i) => {
    const on = sameItem(i, r);
    return `<li><button class="sub-item${on ? ' on' : ''}" data-action="go" data-arg="${itemPath(i)}"${on ? ' aria-current="page"' : ''}>${esc(i.title)}</button></li>`;
  }).join('')}
      </ul>
    </div>`;
  }
  $('#nav').innerHTML = html || `<p class="muted small nav-empty">Nada com "${esc(NAV_Q)}".</p>`;
}

function renderChrome() {
  const d = dataFor(S);
  const r = parseRoute();
  const page = PAGES.find((p) => p.id === r.page);
  const item = findItem(r);
  document.title = `${item ? item.title : page.title} · SCANNY`;
  $('#crumbs').textContent = `SCANNY / ${item ? `${catOf(r)} / ${item.title}` : page.title}`;
  buildNav();

  const prot = $('#prot');
  if (d.security.defender) { prot.className = 'pill ok'; prot.innerHTML = `<span class="dot"></span>Proteção ativa`; }
  else { prot.className = 'pill'; prot.innerHTML = `<span class="dot"></span>Proteção: ${NA.toLowerCase()}`; }

  $('#priv').innerHTML = `${icon('user', 'ic-sm')} Usuário normal`;

  /* Bloco do computador na barra lateral. */
  const c = d.disks[0];
  const pct = c ? Math.round((c.used / c.total) * 100) : null;
  $('#pc').innerHTML = `
    <div class="pc-t"><strong>${esc(val(d.os.name))}</strong><span class="muted small">${esc(val(d.os.version))}</span></div>
    <div class="line"><span style="width:${pct ?? 0}%"></span></div>
    <span class="muted small">${c ? `Disco C: ${pct}% usado · ${gb(c.total - c.used)} livres` : NA}</span>`;

  $('#f-ver').textContent = APP_VERSION;
  $('#f-analysis').textContent = S.lastAnalysis ?? NA;
  $('#f-clean').textContent = S.lastClean ?? NA;
  $('#f-admin').textContent = 'Modo administrador: desligado';
}

function render() {
  const r = parseRoute();
  const cat = catOf(r);
  if (cat !== S.ui.lastCat) { S.ui.lastCat = cat; S.ui.openCat = null; }   // mudou de categoria: abre a atual
  const id = r.page;
  const v = $('#view');
  v.innerHTML = VIEWS[id](S, dataFor(S));
  v.classList.remove('enter');
  void v.offsetWidth;            // reinicia a animação de entrada
  v.classList.add('enter');
  renderChrome();
  applyTheme();
  save();
  if (ANCHOR[r.sub] && r.page === 'visao-geral') document.getElementById(ANCHOR[r.sub])?.scrollIntoView({ block: 'start' });
  else if (location.hash !== S.ui.lastHash) window.scrollTo(0, 0);   // troca de página: volta ao topo
  S.ui.lastHash = location.hash;
}

/* ---------- Mudanças de configuração genéricas ---------- */

function getPath(path) { return path.split('.').reduce((o, k) => (o ? o[k] : undefined), S); }
function setPath(path, value) {
  const keys = path.split('.');
  let o = S;
  for (const k of keys.slice(0, -1)) o = o[k];
  o[keys.at(-1)] = value;
}

/* Valores de data-value vêm como texto: números viram número (ex.: limite de GB, segundos). */
const asValue = (v) => (/^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v);

/* ---------- Arquivo do SCANNY: restaurar e remover (sempre com confirmação) ---------- */

async function restoreArchived(ids) {
  const items = S.archive.filter((a) => ids.includes(a.id));
  if (!items.length) return;
  const ready = items.filter((a) => a.status === 'so-scanny' && !a.conflict);
  const blocked = items.filter((a) => !ready.includes(a));
  if (!ready.length) {
    const conflict = blocked.some((a) => a.conflict);
    return toast(conflict
      ? 'Não dá para restaurar: já existe um arquivo no caminho original.'
      : 'Esses arquivos já estão no Windows.', conflict ? 'bad' : 'warn');
  }
  const ok = await openModal({
    title: ready.length === 1 ? `Restaurar ${ready[0].name}` : `Restaurar ${ready.length} arquivos`,
    body: `<p>Volta para o caminho original. A cópia continua no SCANNY até você removê-la.</p>
      <ul class="plain-list">${ready.map((a) => `<li>${esc(a.path)}</li>`).join('')}</ul>
      ${blocked.length ? alertBox('warn', `${blocked.length} ficam de fora`, 'Já estão no Windows ou há conflito no caminho original.') : ''}`,
    buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Restaurar', value: 'ok', cls: 'primary' }],
  });
  if (ok !== 'ok') return;
  ready.forEach((a) => {
    a.status = 'nos-dois';
    ARCH_SEL.delete(a.id);
    logFile('restaurado', a.name, a.path, 'Restaurado para o caminho original');
  });
  pushHistory({
    category: 'Arquivo do SCANNY', action: `Restaurar ${ready.length} arquivo(s)`, result: 'Restaurado',
    undo: { type: 'archive', ids: ready.map((a) => a.id) },
  });
  render();
  toast(`${ready.length} ${ready.length === 1 ? 'arquivo restaurado' : 'arquivos restaurados'}.`);
}

async function removeArchived(ids, title = 'Remover do arquivo do SCANNY') {
  const items = S.archive.filter((a) => ids.includes(a.id));
  if (!items.length) return;
  const onlyCopy = items.filter((a) => a.status === 'so-scanny');
  const ok = await openModal({
    title,
    danger: true,
    body: `<p>A cópia sai do SCANNY e não volta.</p>
      ${onlyCopy.length
    ? alertBox('bad', `${onlyCopy.length} ${onlyCopy.length === 1 ? 'arquivo não existe' : 'arquivos não existem'} mais no Windows`, 'Remover agora apaga a única cópia.')
    : '<p class="small muted">Os originais continuam no Windows.</p>'}
      <ul class="plain-list">${items.slice(0, 8).map((a) => `<li>${esc(a.name)} <span class="muted small">· ${sizeText(a.size)}</span></li>`).join('')}${items.length > 8 ? `<li class="muted small">e mais ${items.length - 8}</li>` : ''}</ul>`,
    buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Remover', value: 'ok', cls: 'danger' }],
  });
  if (ok !== 'ok') return;
  items.forEach((a) => {
    ARCH_SEL.delete(a.id);
    logFile('removido', a.name, a.path, 'Removido do arquivo do SCANNY');
  });
  S.archive = S.archive.filter((a) => !ids.includes(a.id));
  pushHistory({ category: 'Arquivo do SCANNY', action: `Remover ${items.length} do arquivo`, result: 'Não pode ser desfeito' });
  render();
  toast(`${items.length} ${items.length === 1 ? 'removido' : 'removidos'} do arquivo do SCANNY.`, 'warn');
}

/* ---------- Ações ---------- */

const ACTIONS = {
  go: (arg) => go(arg),

  /* Analisar sistema: somente leitura. */
  async 'analisar-run'() {
    if (S.analysis.status === 'running') return;
    S.analysis = { status: 'running', step: 0, results: false, when: null };
    render();
    await runSteps(10, (i) => { S.analysis.step = i; render(); }, { delay: 380 });
    S.analysis = { status: 'done', step: 10, results: true, when: nowText() };
    S.lastAnalysis = S.analysis.when;
    pushHistory({ category: 'Analisar sistema', action: 'Análise somente de leitura', result: 'Concluída, nada alterado' });
    render();
    toast('Análise concluída. Nada foi alterado.');
  },

  async relatorio(tipo) {
    const d = dataFor(S);
    const ar = archiveStats(S);
    const rows = [
      ['Versão do Windows', d.os.name ? `${d.os.name} ${d.os.version}` : NA],
      ['Discos', d.disks.map((x) => `${x.name}: ${gb(x.total - x.used)} livre`).join('; ') || NA],
      ['Arquivo do SCANNY', `${ar.count} arquivos, ${sizeText(ar.used)}`],
      ['Análise em', S.analysis.when ?? NA],
    ];
    let text, mime, name = `scanny-relatorio.${tipo}`;
    if (tipo === 'json') { text = JSON.stringify(Object.fromEntries(rows), null, 2); mime = 'application/json'; }
    else if (tipo === 'txt') { text = rows.map(([k, v]) => `${k}: ${v}`).join('\n'); mime = 'text/plain'; }
    else { text = `<!doctype html><meta charset="utf-8"><title>Relatório SCANNY</title><h1>Relatório SCANNY</h1><ul>${rows.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ul>`; mime = 'text/html'; }
    download(name, text, mime);
    toast('Relatório baixado. Ele não inclui conteúdo pessoal.');
  },

  /* Otimização segura: lista o que será feito e leva para Limpeza. */
  async otimizar() {
    const ok = await openModal({
      title: 'Otimização segura',
      body: `<ol class="plain-list numbered">
        <li>Analisa o sistema, sem alterar nada.</li>
        <li>Mostra as ações recomendadas, todas selecionáveis.</li>
        <li>Desmarca sozinho as ações avançadas.</li>
        <li>Cria ponto de restauração se necessário.</li>
        <li>Pede confirmação e executa uma ação por vez.</li>
        <li>Mostra o resumo e oferece desfazer.</li>
      </ol>`,
      buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Começar análise', value: 'ok', cls: 'primary' }],
    });
    if (ok !== 'ok') return;
    go('limpeza');
    await cleanAnalyze();
  },

  /* Limpeza, fase 1: analisar (calcula tamanhos, não apaga nada). */
  'analisar-clean': () => cleanAnalyze(),

  async 'limpeza-run'() { await cleanRun(); },

  async 'cache-open'(id) {
    if (!SCANNY_NATIVE.available) return toast('Abrir pastas só está disponível na aplicação Windows.', 'warn');
    try { const path = await SCANNY_NATIVE.openCacheFolder(id); toast(`Pasta aberta: ${path}`); }
    catch (err) { toast(`Não foi possível abrir a pasta: ${err}`, 'bad'); }
  },

  'limpeza-clear'() {
    S.clean.selected = [];
    S.clean.recycle = false;
    S.clean.browser = false;
    render();
  },

  'limpeza-nova'() {
    S.clean = { ...S.clean, analyzed: false, result: null, selected: [], recycle: false, browser: false };
    render();
  },

  async log() {
    const lines = S.history.length
      ? S.history.map((h) => `${h.when}  ${h.category} — ${h.action} — ${h.result ?? ''}`).join('\n')
      : 'Nenhum registro ainda.';
    await openModal({ title: 'Log do SCANNY', body: `<pre class="code"><code>${esc(lines)}</code></pre>`, buttons: [{ label: 'Fechar', value: 'ok', cls: 'primary' }] });
  },

  perfil(arg) {
    if (arg === 'personalizado' && S.effects.profile !== 'personalizado') {
      S.effects.custom = { ...S.effects.current };
    }
    S.effects.profile = arg;
    render();
  },

  /* Escolhe um modo visual e aplica, com confirmação. */
  modo(arg) { S.effects.profile = arg; return ACTIONS['efeitos-aplicar'](); },

  /* Abre ou fecha uma categoria do menu. Ao abrir, vai para a primeira subcategoria. */
  cat(name) {
    const r = parseRoute();
    const isOpen = (S.ui.openCat ?? catOf(r)) === name;
    if (isOpen) { S.ui.openCat = ''; return render(); }
    S.ui.openCat = name;
    const c = NAV.find((x) => x.cat === name);
    if (!c.items.some((i) => sameItem(i, r))) return go(itemPath(c.items[0]));
    render();
  },

  async 'efeitos-aplicar'() {
    const target = effTarget(S);
    const prev = { ...S.effects.current };
    const n = EFFECTS.filter((e) => target[e.k] !== prev[e.k]).length;
    if (!n) return toast('Esse modo já está ativo.');
    const ok = await openModal({
      title: 'Aplicar efeitos visuais',
      body: `<p>${n} mudança(s). Antes de aplicar, o SCANNY guarda o estado atual, e você pode voltar depois.</p>`,
      buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Aplicar', value: 'ok', cls: 'primary' }],
    });
    if (ok !== 'ok') return;
    S.effects.previous = prev;
    S.effects.current = target;
    pushHistory({
      category: 'Desempenho', action: 'Aplicar efeitos visuais',
      before: `${countOn(prev)} ativos`, after: `${countOn(target)} ativos`,
      undo: { type: 'effects', prev },
    });
    render();
    toast('Efeitos aplicados. Você pode desfazer no histórico.');
  },

  'efeitos-restaurar'() {
    if (!S.effects.previous) return;
    S.effects.current = { ...S.effects.previous };
    S.effects.previous = null;
    pushHistory({ category: 'Desempenho', action: 'Restaurar estado anterior de efeitos', result: 'Concluído' });
    render();
    toast('Estado anterior restaurado.');
  },

  'init-filter'(arg) { S.ui.initFilter = arg; render(); },

  async 'startup-toggle'(id) {
    const item = dataFor(S).startup.find((x) => x.id === id);
    if (!item) return;
    const off = !S.startupOff[id];
    S.startupOff[id] = off;
    pushHistory({
      category: 'Inicialização', action: `${off ? 'Desativar' : 'Reativar'} ${item.name}`,
      before: off ? 'Ativo' : 'Desativado', after: off ? 'Desativado' : 'Ativo',
      undo: { type: 'startup', id, off: !off },
    });
    render();
    toast(`${item.name} ${off ? 'desativado' : 'reativado'}. Nada foi apagado.`);
  },

  'priv-toggle'(key) {
    const prev = S.privacy[key];
    S.privacy[key] = !prev;
    pushHistory({
      category: 'Privacidade', action: `Alterar: ${key}`,
      before: prev ? 'Ativo' : 'Desativado', after: !prev ? 'Ativo' : 'Desativado',
      undo: { type: 'privacy', key, value: prev },
    });
    render();
  },

  async 'repair-ask'(id) {
    const r = dataFor(S).repairs.find((x) => x.id === id);
    if (!r) return;
    const ok = await openModal({
      title: r.name,
      body: `<p>${esc(r.desc)}</p>
        <p class="small muted">Comando exato que será executado:</p>
        <pre class="code"><code>${esc(r.cmd)}</code></pre>
        <p class="small muted">Tempo estimado: ${r.time}${r.restart ? ' · pode pedir reinício' : ''}. Você pode cancelar durante a execução.</p>`,
      buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Executar', value: 'ok', cls: 'primary' }],
    });
    if (ok !== 'ok') return;
    await repairRun(r);
  },

  'repair-cancel'() {
    repairSignal.cancelled = true;
  },

  async 'jogo-medir'() {
    if (!S.settings.sample) return toast('Ative os dados de exemplo para ver uma medição.', 'warn');
    S.games.measure = { before: 74, after: 66, freed: 0.8, note: 'exemplo' };
    pushHistory({ category: 'Jogos', action: 'Medição antes e depois', result: 'Exemplo' });
    render();
  },

  'show-path'(arg) {
    return openModal({
      title: 'Caminho',
      body: `<p class="small muted">Copie e cole onde precisar:</p><pre class="code"><code>${esc(arg)}</code></pre>`,
      buttons: [
        { label: 'Fechar', value: 'ok', cls: 'ghost' },
        { label: 'Copiar', value: 'copy', cls: 'primary', keep: true, onClick: () => copyText(arg) },
      ],
    });
  },

  /* Excluir arquivos grandes: simulado. Com a opção ligada, cada um vai antes para o Arquivo do SCANNY. */
  async 'big-delete'() {
    const paths = [...document.querySelectorAll('[data-check="big"]:checked')].map((i) => i.value);
    const picked = dataFor(S).largeFiles.filter((f) => paths.includes(f.path) && !S.gone[f.path]);
    if (!picked.length) return toast('Escolha ao menos um arquivo.', 'warn');
    const keep = S.settings.archiveBeforeDelete;
    const ok = await openModal({
      title: 'Excluir arquivos',
      danger: true,
      body: `<p>Você escolheu ${picked.length} arquivo(s). Eles não são enviados para a lixeira.</p>
        ${keep
    ? '<p>Uma cópia vai para o <strong>Arquivo do SCANNY</strong> antes de sair do Windows. Você pode restaurar depois.</p>'
    : alertBox('bad', 'Sem cópia', 'Com "Guardar cópia antes de excluir" desligado, a exclusão não pode ser desfeita.')}
        <ul class="plain-list">${picked.map((f) => `<li>${esc(f.path)}</li>`).join('')}</ul>
        <p class="small muted">Protótipo: nenhum arquivo é removido de verdade aqui.</p>`,
      buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Excluir', value: 'ok', cls: 'danger' }],
    });
    if (ok !== 'ok') return;
    picked.forEach((f) => {
      if (keep) archiveFile(f, 'Arquivo grande');
      else logFile('removido', f.name, f.path, 'Excluído sem cópia');
      S.gone[f.path] = true;
    });
    pushHistory({
      category: 'Armazenamento', action: `Excluir ${picked.length} arquivo(s) escolhidos`,
      result: keep ? 'Cópia guardada no SCANNY (simulado)' : 'Sem cópia (simulado)',
    });
    render();
    toast(keep ? 'Simulado: cópias guardadas no Arquivo do SCANNY.' : 'Simulado: nada foi excluído de verdade.', 'warn');
  },

  async restore() {
    const ok = await openModal({
      title: 'Criar ponto de restauração',
      body: `<p>Um ponto de restauração permite voltar o Windows a um estado anterior. Pode levar alguns minutos.</p>`,
      buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Criar', value: 'ok', cls: 'primary' }],
    });
    if (ok !== 'ok') return;
    await runSteps(3, () => {}, { delay: 500 });
    pushHistory({ category: 'Segurança e restauração', action: 'Criar ponto de restauração', result: 'Criado (protótipo)' });
    render();
    toast('Ponto de restauração criado.');
  },

  /* Arquivo do SCANNY */
  'arq-restaurar'(id) { return restoreArchived([id]); },
  'arq-restaurar-sel'() { return restoreArchived([...ARCH_SEL]); },
  'arq-remover'(id) { return removeArchived([id]); },
  'arq-remover-sel'() { return removeArchived([...ARCH_SEL]); },
  'arq-sel-clear'() { ARCH_SEL.clear(); refreshArchive(S); },
  'arq-status'(arg) { S.ui.archStatus = arg; render(); },
  'arq-limpar'() { S.ui.archQuery = ''; S.ui.archStatus = 'todos'; S.ui.archType = 'todos'; render(); },
  'arq-esvaziar'() { return removeArchived(S.archive.map((a) => a.id), 'Esvaziar o Arquivo do SCANNY'); },

  /* Recentes */
  'rec-filter'(arg) { S.ui.recFilter = arg; render(); },

  /* Ao vivo: taxa de atualização (0 = pausado). */
  refresh(arg) { S.ui.refresh = Number(arg); LIVE.elapsed = 0; render(); },

  'undo'(id) { undoEntry(id); },

  'restore-all'() {
    [...S.history].filter((h) => h.undo).forEach((h) => undoEntry(h.id, false));
    render();
    toast('Alterações desfeitas.');
  },

  async 'hist-clear'() {
    const ok = await openModal({
      title: 'Limpar histórico',
      body: '<p>O histórico do SCANNY será apagado. Suas alterações continuam feitas, mas deixam de aparecer aqui.</p>',
      buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Limpar', value: 'ok', cls: 'danger' }],
    });
    if (ok !== 'ok') return;
    S.history = [];
    render();
  },

  'hist-filter'(arg) { S.ui.histFilter = arg; render(); },

  async 'apagar-dados'() {
    const ok = await openModal({
      title: 'Apagar dados do SCANNY',
      danger: true,
      body: '<p>Remove configurações, histórico, registro e o Arquivo do SCANNY. Não toca nos seus arquivos originais.</p>',
      buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Apagar', value: 'ok', cls: 'danger' }],
    });
    if (ok !== 'ok') return;
    store.clear();
    S = clone(DEFAULT_STATE);
    ARCH_SEL.clear();
    LIVE.cpu = []; LIVE.ram = []; LIVE.disk = [];
    render();
    toast('Dados do SCANNY apagados.');
  },

  /* Botão de uma recomendação: executa o que ela diz, sem mudar nada sozinho. */
  rec(id) {
    const r = runRecommendation(S, id);
    if (!r) return;
    const a = r.act;
    if (a.kind === 'go') return go(a.arg);
    if (a.kind === 'tab') return go('desempenho');
    if (a.kind === 'modo') return ACTIONS.modo(a.arg);
    if (a.kind === 'action') return ACTIONS[a.arg]();
  },

  'check-update'() { toast('Protótipo: nenhuma atualização real para verificar.'); },

  'backup-export'() {
    const payload = { app: 'SCANNY', version: APP_VERSION, exportedAt: new Date().toISOString(), data: S };
    download('scanny-backup.json', JSON.stringify(payload, null, 2), 'application/json');
    S.lastBackup = nowText();
    render();
    toast('Backup exportado.');
  },

  'backup-import'() { $('#backup-file').click(); },

  async 'admin-ask'() {
    await openModal({
      title: 'Modo administrador',
      body: '<p>O SCANNY só pede administrador quando uma ação precisar. O Windows mostra a janela de confirmação, e você decide.</p>',
      buttons: [{ label: 'Entendi', value: 'ok', cls: 'primary' }],
    });
  },

  async notifs() {
    const list = S.history.slice(0, 5);
    await openModal({
      title: 'Notificações',
      body: list.length
        ? `<ul class="plain-list">${list.map((h) => `<li><strong>${esc(h.action)}</strong> <span class="muted small">${esc(h.when)}</span></li>`).join('')}</ul>`
        : '<p class="muted">Nenhuma notificação ainda.</p>',
      buttons: [{ label: 'Fechar', value: 'ok', cls: 'primary' }],
    });
  },

};

/* ---------- Limpeza ---------- */

async function cleanAnalyze() {
  if (S.clean.running) return;
  S.clean = { ...S.clean, running: true, result: null, progress: null };
  render();
  await sleep(900);
  if (SCANNY_NATIVE.available) {
    try {
      const found = await SCANNY_NATIVE.analyzeCleanup();
      S.nativeCleanup = found;
      const cache = found.map((x) => ({ id: x.id, name: x.name, size: x.bytes / 1073741824, safe: true, note: `${x.files} ficheiro(s); recentes/em uso serão ignorados.` }));
      S.nativeData = { ...(S.nativeData || {}), cleanup: cache };
      S.clean = { ...S.clean, running: false, analyzed: true, selected: cache.map((c) => c.id), allTempCaches: true, recycle: false, browser: false };
      render();
      return;
    } catch (err) { S.clean = { ...S.clean, running: false }; render(); return toast(`Não foi possível analisar os caches: ${err}`, 'bad'); }
  }
  const safe = dataFor(S).cleanup.filter((c) => c.safe).map((c) => c.id);
  S.clean = { ...S.clean, running: false, analyzed: true, selected: safe, allTempCaches: true, recycle: false, browser: false };
  render();
}
async function cleanRun() {
  const d = dataFor(S);
  if (SCANNY_NATIVE.available) {
    const ids = (S.nativeCleanup || []).filter((x) => S.clean.selected.includes(x.id)).map((x) => x.id);
    if (!ids.length) return toast('Selecione pelo menos um cache temporário analisado.', 'warn');
    const ok = await openModal({ title: 'Confirmar limpeza segura', danger: true, body: '<p>O SCANNY removerá apenas o conteúdo das pastas de cache temporário selecionadas.</p><p class="small muted">A pasta-base, Downloads, documentos, dados pessoais e ficheiros recentes/em uso ficam protegidos.</p>', buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Limpar caches', value: 'ok', cls: 'danger' }] });
    if (ok !== 'ok') return;
    try {
      const [freed, removed] = await SCANNY_NATIVE.cleanCacheIds(ids);
      S.clean = { ...S.clean, analyzed: true, selected: [], allTempCaches: false, result: { freed: freed / 1073741824, skipped: 0, errors: 0, time: `${removed} arquivo(s)` } };
      S.lastClean = nowText();
      pushHistory({ category: 'Caches e Dados', action: 'Limpeza de caches temporários', result: `${removed} arquivo(s) removido(s)` });
      render();
      return toast(`Limpeza concluída: ${removed} arquivo(s) removido(s).`);
    } catch (err) { return toast(`Falha na limpeza: ${err}`, 'bad'); }
  }
  if (!S.settings.sample) return toast('Ative os dados de exemplo para simular a limpeza.', 'warn');
  const items = d.cleanup.filter((c) => S.clean.selected.includes(c.id)).map((c) => ({ name: c.name, size: c.size }));
  if (S.clean.recycle) items.push({ name: 'Lixeira', size: d.recycle.size });
  if (S.clean.browser) items.push({ name: 'Cache de navegadores', size: d.browserCache.size });
  if (!items.length) return;
  const total = items.reduce((a, i) => a + i.size, 0);
  const ok = await openModal({ title: 'Confirmar limpeza', danger: true, body: `<p>O SCANNY vai remover estes itens, um de cada vez:</p><ul class="plain-list">${items.map((i) => `<li>${esc(i.name)} <span class="muted small">· ${gb(i.size)}</span></li>`).join('')}</ul><p class="small muted">Espaço estimado: <strong>${gb(total)}</strong>. Temporários não entram no Arquivo do SCANNY.</p>`, buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Limpar agora', value: 'ok', cls: 'danger' }] });
  if (ok !== 'ok') return;
  const t0 = Date.now(); S.clean.running = true; S.clean.progress = { label: 'Preparando…', done: 0, total: items.length }; render();
  let freed = 0;
  await runSteps(items.length, (i) => { freed += items[i].size; S.clean.progress = { label: `Removendo ${items[i].name}`, done: i + 1, total: items.length }; render(); }, { delay: 450 });
  const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
  S.clean = { ...S.clean, running: false, progress: null, analyzed: true, selected: [], allTempCaches: false, recycle: false, browser: false, result: { freed, skipped: 0, errors: 0, time: `${secs} s` } };
  S.lastClean = nowText(); pushHistory({ category: 'Limpeza', action: `Limpeza de ${items.length} item(ns)`, result: `${gb(freed)} liberados` }); render(); toast(`Limpeza concluída: ${gb(freed)} liberados.`);
}
/* ---------- Reparos ---------- */

async function repairRun(r) {
  repairSignal = { cancelled: false };
  const lines = [`> ${r.cmd}`, '[simulação] Iniciando…'];
  S.repair = { id: r.id, name: r.name, lines, running: true, restart: r.restart, cancelled: false };
  render();

  const script = ['Verificando componentes…', 'Aplicando correções…', 'Concluindo…'];
  await runSteps(script.length, (i) => {
    S.repair.lines.push(`[simulação] ${script[i]}`);
    render();
  }, { delay: 800, signal: repairSignal });

  const cancelled = repairSignal.cancelled;
  S.repair = {
    ...S.repair,
    running: false,
    cancelled,
    lines: cancelled ? [...S.repair.lines, 'Cancelado pelo usuário.'] : [...S.repair.lines, '[simulação] Concluído.'],
  };
  pushHistory({ category: 'Reparos', action: r.name, result: cancelled ? 'Cancelado' : 'Concluído (simulação)' });
  render();
  if (!cancelled) toast(r.restart ? 'Concluído. Reinicie quando puder.' : 'Concluído.');
}

/* ---------- Desfazer ---------- */

function undoEntry(id, rerender = true) {
  const h = S.history.find((x) => x.id === id);
  if (!h || !h.undo) return;
  const u = h.undo;
  if (u.type === 'startup') S.startupOff[u.id] = u.off;
  if (u.type === 'privacy') S.privacy[u.key] = u.value;
  if (u.type === 'effects') S.effects.current = { ...u.prev };
  if (u.type === 'power') S.powerPlan = u.value;
  if (u.type === 'archive') S.archive.forEach((a) => { if (u.ids.includes(a.id)) a.status = 'so-scanny'; });
  h.undo = null;
  h.result = 'Desfeito';
  pushHistory({ category: h.category, action: `Desfazer: ${h.action}`, before: h.after, after: h.before });
  if (rerender) { render(); toast('Alteração desfeita.'); }
}

/* ---------- Utilidades ---------- */

function download(name, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copiado.'); }
  catch (e) { toast('Não foi possível copiar. Selecione o texto e copie.', 'warn'); }
}

/* Relógio das telas ao vivo: a cada segundo atualiza a barra de próxima leitura e,
 * quando chega a hora, faz uma nova leitura. Só mexe na tela; não refaz a página. */
function startTicker() {
  setInterval(() => {
    const page = parseRoute().page;
    if (!S.settings.sample || (page !== 'visao-geral' && page !== 'ao-vivo')) return;
    if (S.ui.refresh) {
      LIVE.elapsed += 1;
      if (LIVE.elapsed >= S.ui.refresh) { LIVE.elapsed = 0; liveStep(S); }
    }
    liveDom(S);
  }, 1000);
}

/* ---------- Eventos (um único ponto de entrada) ---------- */

function bindEvents() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action],[data-toggle],[data-set]');
    if (!t || t.disabled) return;

    if (t.dataset.toggle) {
      setPath(t.dataset.toggle, !getPath(t.dataset.toggle));
      if (t.dataset.toggle === 'settings.theme') applyTheme();
      if (t.dataset.toggle === 'settings.sample' && S.settings.sample) seedSample();
      return render();
    }
    if (t.dataset.set) {
      setPath(t.dataset.set, asValue(t.dataset.value));
      return render();
    }
    const fn = ACTIONS[t.dataset.action];
    if (fn) fn(t.dataset.arg, t);
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    /* Busca do Arquivo: redesenha só a lista, para não perder o foco do campo. */
    if (t.dataset.archive === 'query') {
      S.ui.archQuery = t.value;
      refreshArchive(S);
      return save();
    }
    /* Busca do menu: filtra os itens da barra lateral. */
    if (t.id === 'nav-q') {
      NAV_Q = t.value;
      buildNav();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.id === 'nav-q' && e.key === 'Enter') {
      const first = document.querySelector('#nav .sub-item');
      if (first) first.click();
    }
  });

  document.addEventListener('change', async (e) => {
    const t = e.target;

    if (t.dataset.archive === 'sort') { S.ui.archSort = t.value; refreshArchive(S); return save(); }
    if (t.dataset.archive === 'type') { S.ui.archType = t.value; refreshArchive(S); return save(); }
    if (t.dataset.check === 'arch') {
      if (t.checked) ARCH_SEL.add(t.value); else ARCH_SEL.delete(t.value);
      return refreshArchive(S);
    }

    if (t.dataset.check === 'clean') {
      const id = t.value;
      S.clean.selected = t.checked ? [...new Set([...S.clean.selected, id])] : S.clean.selected.filter((x) => x !== id);
      const ids = (S.nativeCleanup || dataFor(S).cacheFolders || []).map((x) => x.id);
      if (ids.length) S.clean.allTempCaches = ids.every((x) => S.clean.selected.includes(x));
      return render();
    }
    if (t.dataset.check === 'recycle') { S.clean.recycle = t.checked; return render(); }
    if (t.dataset.check === 'browser') { S.clean.browser = t.checked; return render(); }
    if (t.dataset.check === 'all-caches') { const ids = (S.nativeCleanup || dataFor(S).cacheFolders || []).map((x) => x.id); S.clean.allTempCaches = t.checked; S.clean.selected = t.checked ? [...new Set(ids)] : []; return render(); }
    if (t.dataset.check === 'effect') {
      S.effects.custom = { ...(S.effects.custom || S.effects.current), [t.value]: t.checked };
      render();
      return refocus(`input[data-check="effect"][value="${t.value}"]`);
    }

    if (t.dataset.setPlan) {
      const plan = t.dataset.setPlan;
      const ok = await openModal({
        title: 'Trocar plano de energia',
        body: `<p>Trocar para <strong>${esc(plan)}</strong>? Isso muda consumo de bateria, calor e ruído.</p>`,
        buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Trocar', value: 'ok', cls: 'primary' }],
      });
      if (ok === 'ok') {
        const prev = S.powerPlan ?? dataFor(S).power.current;
        S.powerPlan = plan;
        pushHistory({ category: 'Energia', action: 'Trocar plano de energia', before: prev, after: plan, undo: { type: 'power', value: prev } });
        toast(`Plano alterado para ${plan}.`);
      }
      return render();
    }

    if (t.id === 'backup-file' && t.files[0]) {
      try {
        const json = JSON.parse(await t.files[0].text());
        if (json.app !== 'SCANNY' || !json.data || !json.data.settings) throw new Error('arquivo inválido');
        S = mergeState(DEFAULT_STATE, json.data);
        S.analysis = { status: 'idle', step: 0, results: false, when: null };
        S.clean = { ...DEFAULT_STATE.clean };
        S.repair = null;
        ARCH_SEL.clear();
        render();
        toast('Backup importado.');
      } catch (err) {
        toast('Backup inválido. Nada foi importado.', 'bad');
      }
      t.value = '';
    }
  });

  window.addEventListener('hashchange', render);
}

/* Mantém o foco em um controle depois de um render (para checkboxes). */
function refocus(selector) {
  const el = document.querySelector(selector);
  if (el) el.focus();
}

/* ---------- Início ---------- */

function init() {
  S = mergeState(DEFAULT_STATE, store.load(DEFAULT_STATE));
  // Estados de execução nunca sobrevivem a um recarregamento.
  S.analysis = { ...S.analysis, status: S.analysis.results ? 'done' : 'idle' };
  S.clean = { ...S.clean, running: false, progress: null };
  S.repair = null;
  if (S.settings.sample) seedSample();   // dados de exemplo já ligados antes desta versão
  applyTheme();
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
  buildNav();
  bindEvents();
  startTicker();
  if (!location.hash) history.replaceState(null, '', '#/visao-geral');
  render();
  if (SCANNY_NATIVE.available) loadNativeSnapshot();
}

init();

async function loadNativeSnapshot() { try { S.nativeData = await SCANNY_NATIVE.snapshot(); render(); } catch (err) { console.warn('SCANNY: coleta nativa indisponível', err); } }
