/* SCANNY — estado, roteamento e ações.
 * Regra de ouro: analisar nunca altera nada. Toda mudança passa por confirmação (quando necessária),
 * é registrada no histórico e, quando possível, pode ser desfeita. */

const APP_VERSION = SCANNY_NATIVE?.available ? '1.0.0 (desktop)' : '1.0.0 (protótipo)';

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
  clean: { analyzed: false, running: false, progress: null, selected: [], recycle: false, browser: false, result: null },
  repair: null,
  powerPlan: null,
  games: { measure: null },
  history: [],
  lastAnalysis: null,
  lastClean: null,
  lastBackup: null,
  ui: { perfTab: 'efeitos', initFilter: 'todos', histFilter: 'todas' },
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

/* Efeito "alvo" = o que o botão Aplicar vai deixar ativo. */
function effTarget(s) {
  const p = s.effects.profile;
  if (p === 'personalizado') return { ...(s.effects.custom || s.effects.current) };
  const on = PROFILES[p].on;
  return Object.fromEntries(EFFECTS.map((e) => [e.k, on.includes(e.k)]));
}
const countOn = (o) => Object.values(o).filter(Boolean).length;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* Menu em categorias. Cada categoria abre a sua lista de subcategorias.
 * Rota: #/pagina ou #/pagina/subcategoria (ex.: #/desempenho/hardware). */
const NAV = [
  { cat: 'Visão geral', icon: 'home', items: [
    { title: 'Resumo', page: 'visao-geral' },
    { title: 'Recomendações', page: 'visao-geral', sub: 'recomendacoes' },
    { title: 'Atividade', page: 'visao-geral', sub: 'atividade' },
  ] },
  { cat: 'Otimização', icon: 'sparkles', items: [
    { title: 'Análise', page: 'analisar' },
    { title: 'Limpeza', page: 'limpeza' },
    { title: 'Desempenho', page: 'desempenho' },
    { title: 'Inicialização', page: 'inicializacao' },
  ] },
  { cat: 'Sistema', icon: 'disk', items: [
    { title: 'Armazenamento', page: 'armazenamento' },
    { title: 'Jogos', page: 'jogos' },
    { title: 'Reparos', page: 'reparos' },
  ] },
  { cat: 'Proteção', icon: 'shield', items: [
    { title: 'Privacidade', page: 'privacidade' },
    { title: 'Segurança e restauração', page: 'seguranca' },
    { title: 'Histórico', page: 'historico' },
  ] },
  { cat: 'Aplicativo', icon: 'cog', items: [
    { title: 'Configurações', page: 'configuracoes' },
    { title: 'Sobre', page: 'sobre' },
  ] },
];
const DEFAULT_SUB = {};
const ANCHOR = { recomendacoes: 'rec-all', atividade: 'atividade' };

function parseRoute() {
  const [p, sub] = location.hash.replace(/^#\/?/, '').split('/');
  const page = PAGES.some((x) => x.id === p) ? p : 'visao-geral';
  return { page, sub: sub ?? DEFAULT_SUB[page] ?? null };
}
const sameItem = (i, r) => i.page === r.page && (i.sub ?? DEFAULT_SUB[i.page] ?? null) === r.sub;
const itemPath = (i) => (i.sub ? `${i.page}/${i.sub}` : i.page);
const catOf = (r) => NAV.find((c) => c.items.some((i) => sameItem(i, r)))?.cat ?? null;
const findItem = (r) => NAV.flatMap((c) => c.items).find((i) => sameItem(i, r)) ?? null;
const pageIdFromHash = () => parseRoute().page;

function save() { store.save(S); }

function pushHistory(entry) {
  S.history.unshift({
    id: `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
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
  $('#nav').innerHTML = NAV.map((c) => {
    const isOpen = c.cat === open;
    return `<div class="cat-group${isOpen ? ' open' : ''}">
      <button class="cat${c.cat === active ? ' on' : ''}" data-action="cat" data-arg="${esc(c.cat)}" aria-expanded="${isOpen}">
        ${icon(c.icon)}<span>${esc(c.cat)}</span>${icon('chevron', 'chev')}
      </button>
      <ul class="sub-list"${isOpen ? '' : ' hidden'}>
        ${c.items.map((i) => {
    const on = sameItem(i, r);
    return `<li><button class="sub-item${on ? ' on' : ''}" data-action="go" data-arg="${itemPath(i)}"${on ? ' aria-current="page"' : ''}>${esc(i.title)}</button></li>`;
  }).join('')}
      </ul>
    </div>`;
  }).join('');
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
  // Painel "Recomendado para este PC" entra logo depois do título da página (primeiro </section>).
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

/* Mantém o foco em um controle depois de um render (para checkboxes). */
function refocus(selector) {
  const el = document.querySelector(selector);
  if (el) el.focus();
}

/* ---------- Mudanças de configuração genéricas ---------- */

function getPath(path) { return path.split('.').reduce((o, k) => (o ? o[k] : undefined), S); }
function setPath(path, value) {
  const keys = path.split('.');
  let o = S;
  for (const k of keys.slice(0, -1)) o = o[k];
  o[keys.at(-1)] = value;
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
    const rows = [
      ['Versão do Windows', d.os.name ? `${d.os.name} ${d.os.version}` : NA],
      ['Discos', d.disks.map((x) => `${x.name}: ${gb(x.total - x.used)} livre`).join('; ') || NA],
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
    if (SCANNY_NATIVE.available) {
      try { await SCANNY_NATIVE.visualProfile(S.effects.profile); }
      catch (err) { return toast(`Não foi possível aplicar o perfil: ${err}`, 'bad'); }
    }
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

  async 'big-delete'() {
    const picked = [...document.querySelectorAll('[data-check="big"]:checked')].map((i) => dataFor(S).largeFiles[Number(i.value)]).filter(Boolean);
    if (!picked.length) return toast('Escolha ao menos um arquivo.', 'warn');
    const ok = await openModal({
      title: 'Excluir arquivos',
      danger: true,
      body: `<p>Você escolheu ${picked.length} arquivo(s). Eles não são enviados para a lixeira.</p>
        <ul class="plain-list">${picked.map((f) => `<li>${esc(f.path)}</li>`).join('')}</ul>
        <p class="small muted">Protótipo: nenhum arquivo é removido de verdade aqui.</p>`,
      buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Excluir', value: 'ok', cls: 'danger' }],
    });
    if (ok !== 'ok') return;
    pushHistory({ category: 'Armazenamento', action: `Excluir ${picked.length} arquivo(s) escolhidos`, result: 'Simulado (protótipo)' });
    render();
    toast('Simulado: nada foi excluído no protótipo.', 'warn');
  },

  async restore() {
    const ok = await openModal({
      title: 'Criar ponto de restauração',
      body: `<p>Um ponto de restauração permite voltar o Windows a um estado anterior. Pode levar alguns minutos.</p>`,
      buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Criar', value: 'ok', cls: 'primary' }],
    });
    if (ok !== 'ok') return;
    if (SCANNY_NATIVE.available) {
      try { await SCANNY_NATIVE.restorePoint(); }
      catch (err) { pushHistory({ category: 'Segurança e restauração', action: 'Criar ponto de restauração', result: `Falhou: ${err}` }); render(); return toast(`Falha ao criar ponto: ${err}`, 'bad'); }
    } else { await runSteps(3, () => {}, { delay: 500 }); }
    pushHistory({ category: 'Segurança e restauração', action: 'Criar ponto de restauração', result: SCANNY_NATIVE.available ? 'Solicitado ao Windows' : 'Criado (protótipo)' });
    render();
    toast('Ponto de restauração criado.');
  },

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
      body: '<p>Remove configurações, histórico e logs do SCANNY. Não toca nos seus arquivos.</p>',
      buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Apagar', value: 'ok', cls: 'danger' }],
    });
    if (ok !== 'ok') return;
    store.clear();
    S = clone(DEFAULT_STATE);
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
  const safe = dataFor(S).cleanup.filter((c) => c.safe).map((c) => c.id);
  S.clean = { ...S.clean, running: false, analyzed: true, selected: safe, recycle: false, browser: false };
  render();
}

async function cleanRun() {
  const d = dataFor(S);
  if (SCANNY_NATIVE.available) {
    const roots = (S.nativeCleanup || []).filter((x) => S.clean.selected.includes(x.id)).map((x) => x.name);
    if (!roots.length) return toast('Selecione ao menos uma pasta temporária analisada.', 'warn');
    const ok = await openModal({ title: 'Confirmar limpeza real', danger: true, body: `<p>O SCANNY vai remover arquivos dentro das pastas temporárias permitidas.</p><p class="small muted">Arquivos em uso serão ignorados. Downloads e arquivos pessoais não entram nesta operação.</p>`, buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Limpar agora', value: 'ok', cls: 'danger' }] });
    if (ok !== 'ok') return;
    try { const [freed, removed] = await SCANNY_NATIVE.cleanPaths(roots); S.clean = { ...S.clean, analyzed: true, selected: [], result: { freed: freed / 1073741824, skipped: 0, errors: 0, time: `${removed} arquivo(s)` } }; S.lastClean = nowText(); pushHistory({ category: 'Limpeza', action: 'Limpeza de temporários', result: `${removed} arquivo(s) removido(s)` }); render(); return toast(`Limpeza concluída: ${removed} arquivo(s) removido(s).`); } catch (err) { return toast(`Falha na limpeza: ${err}`, 'bad'); }
  }
  if (!S.settings.sample) return toast('Ative os dados de exemplo para simular a limpeza.', 'warn');

  const items = d.cleanup.filter((c) => S.clean.selected.includes(c.id)).map((c) => ({ name: c.name, size: c.size }));
  if (S.clean.recycle) items.push({ name: 'Lixeira', size: d.recycle.size });
  if (S.clean.browser) items.push({ name: 'Cache de navegadores', size: d.browserCache.size });
  if (!items.length) return;

  const total = items.reduce((a, i) => a + i.size, 0);
  const ok = await openModal({
    title: 'Confirmar limpeza',
    danger: true,
    body: `<p>O SCANNY vai remover estes itens, um de cada vez:</p>
      <ul class="plain-list">${items.map((i) => `<li>${esc(i.name)} <span class="muted small">· ${gb(i.size)}</span></li>`).join('')}</ul>
      <p class="small muted">Espaço estimado: <strong>${gb(total)}</strong>. Arquivos em uso são ignorados. Cada remoção fica registrada.</p>`,
    buttons: [{ label: 'Cancelar', value: 'no', cls: 'ghost' }, { label: 'Limpar agora', value: 'ok', cls: 'danger' }],
  });
  if (ok !== 'ok') return;

  const t0 = Date.now();
  S.clean.running = true;
  S.clean.progress = { label: 'Preparando…', done: 0, total: items.length };
  render();
  let freed = 0;
  await runSteps(items.length, (i) => {
    freed += items[i].size;
    S.clean.progress = { label: `Removendo ${items[i].name}`, done: i + 1, total: items.length };
    render();
  }, { delay: 450 });

  const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
  S.clean = {
    ...S.clean,
    running: false, progress: null, analyzed: true, selected: [], recycle: false, browser: false,
    result: { freed, skipped: 0, errors: 0, time: `${secs} s` },
  };
  S.lastClean = nowText();
  pushHistory({ category: 'Limpeza', action: `Limpeza de ${items.length} item(ns)`, result: `${gb(freed)} liberados` });
  render();
  toast(`Limpeza concluída: ${gb(freed)} liberados.`);
}

/* ---------- Reparos ---------- */

async function repairRun(r) {
  repairSignal = { cancelled: false };
  const lines = [`> ${r.cmd}`, '[simulação] Iniciando…'];
  S.repair = { id: r.id, name: r.name, lines, running: true, restart: r.restart, cancelled: false };
  render();

  const script = ['Verificando componentes…', 'Aplicando correções…', 'Concluindo…'];
  if (SCANNY_NATIVE.available) {
    try { const output = await SCANNY_NATIVE.repair(r.id); S.repair.lines.push(output || 'Concluído.'); }
    catch (err) { S.repair.lines.push(String(err)); }
  } else {
    await runSteps(script.length, (i) => {
      S.repair.lines.push(`[simulação] ${script[i]}`);
      render();
    }, { delay: 800, signal: repairSignal });
  }

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

/* ---------- Eventos (um único ponto de entrada) ---------- */

function bindEvents() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action],[data-toggle],[data-set]');
    if (!t || t.disabled) return;

    if (t.dataset.toggle) {
      setPath(t.dataset.toggle, !getPath(t.dataset.toggle));
      if (t.dataset.toggle === 'settings.theme') applyTheme();
      return render();
    }
    if (t.dataset.set) {
      setPath(t.dataset.set, t.dataset.value);
      return render();
    }
    const fn = ACTIONS[t.dataset.action];
    if (fn) fn(t.dataset.arg, t);
  });

  document.addEventListener('change', async (e) => {
    const t = e.target;

    if (t.dataset.check === 'clean') {
      const id = t.value;
      S.clean.selected = t.checked ? [...new Set([...S.clean.selected, id])] : S.clean.selected.filter((x) => x !== id);
      return render();
    }
    if (t.dataset.check === 'recycle') { S.clean.recycle = t.checked; return render(); }
    if (t.dataset.check === 'browser') { S.clean.browser = t.checked; return render(); }
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

/* ---------- Início ---------- */

function init() {
  S = mergeState(DEFAULT_STATE, store.load(DEFAULT_STATE));
  // Estados de execução nunca sobrevivem a um recarregamento.
  S.analysis = { ...S.analysis, status: S.analysis.results ? 'done' : 'idle' };
  S.clean = { ...S.clean, running: false, progress: null };
  S.repair = null;
  applyTheme();
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
  buildNav();
  bindEvents();
  if (!location.hash) history.replaceState(null, '', '#/visao-geral');
  render();
}

init();
