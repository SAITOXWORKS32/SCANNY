/* SCANNY — telas. Cada função recebe o estado (S) e devolve HTML.
 * Cliques e mudanças ficam em app.js: data-action, data-toggle, data-set, data-check, data-set-plan e data-archive. */

const PAGES = [
  { id: 'visao-geral', title: 'Resumo', icon: 'home' },
  { id: 'arquivo', title: 'Arquivo do SCANNY', icon: 'archive' },
  { id: 'recentes', title: 'Recentes', icon: 'clock' },
  { id: 'armazenamento', title: 'Armazenamento', icon: 'disk' },
  { id: 'ao-vivo', title: 'Ao vivo', icon: 'wave' },
  { id: 'historico', title: 'Histórico', icon: 'history' },
  { id: 'analisar', title: 'Análise', icon: 'scan' },
  { id: 'limpeza', title: 'Limpeza', icon: 'sparkles' },
  { id: 'desempenho', title: 'Desempenho', icon: 'gauge' },
  { id: 'inicializacao', title: 'Inicialização', icon: 'power' },
  { id: 'jogos', title: 'Jogos', icon: 'gamepad' },
  { id: 'reparos', title: 'Reparos', icon: 'wrench' },
  { id: 'privacidade', title: 'Privacidade', icon: 'eye' },
  { id: 'seguranca', title: 'Segurança e restauração', icon: 'shield' },
  { id: 'configuracoes', title: 'Configurações', icon: 'cog' },
  { id: 'sobre', title: 'Sobre', icon: 'info' },
];

/* Dados vazios: mesma forma dos de exemplo, com tudo "Não disponível". */
const EMPTY_DATA = {
  os: { name: null, version: null, arch: null, privileges: null },
  cpu: { name: null, cores: null, threads: null, usage: null, temp: null, freq: null, top: null },
  gpu: [],
  ram: { total: null, used: null, speed: null, type: null, sticks: null, top: null },
  disks: [],
  cleanup: SCANNY_SAMPLE.cleanup.map((c) => ({ ...c, size: null })),
  cacheFolders: SCANNY_SAMPLE.cacheFolders,
  recycle: { size: null },
  browserCache: { size: null },
  startup: [],
  processes: [],
  games: [],
  power: { current: null, plans: [], battery: null, laptop: null },
  security: { defender: null, firewall: null, update: null, pendingReboot: null, lastRestore: null },
  largeFiles: [],
  repairs: SCANNY_SAMPLE.repairs,
};

/* Dados do Windows vêm da análise (ou ficam "Não disponível"). O Arquivo do SCANNY é do próprio app. */
function dataFor(S) { if (S.nativeData) return { ...EMPTY_DATA, ...S.nativeData }; return S.settings.sample ? SCANNY_SAMPLE : EMPTY_DATA; }

/* ---------- Formatação e tipos de arquivo ---------- */

/* Tamanho em GB com tamanho pequeno em MB. */
function sizeText(v) {
  if (v === null || v === undefined) return NA;
  return v < 1 ? `${Math.round(v * 1024)} MB` : gb(v);
}

/* "dd/mm/aaaa hh:mm" -> número para ordenar. */
function tsOf(s) {
  const m = /(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?/.exec(s || '');
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime() : 0;
}

/* Tipo do arquivo pela extensão. */
const KIND = {
  documento: { n: 'Documento', i: 'doc' },
  imagem: { n: 'Imagem', i: 'image' },
  video: { n: 'Vídeo', i: 'film' },
  compactado: { n: 'Compactado', i: 'zip' },
  instalador: { n: 'Instalador', i: 'box' },
  outro: { n: 'Outro', i: 'file' },
};
function kindOf(name) {
  const e = (String(name).split('.').pop() || '').toLowerCase();
  if (['iso', 'exe', 'msi'].includes(e)) return 'instalador';
  if (['zip', 'rar', '7z'].includes(e)) return 'compactado';
  if (['mp4', 'mov', 'mkv', 'avi'].includes(e)) return 'video';
  if (['jpg', 'jpeg', 'png', 'heic', 'gif'].includes(e)) return 'imagem';
  if (['docx', 'doc', 'pdf', 'txt', 'xlsx', 'pptx'].includes(e)) return 'documento';
  return 'outro';
}

/* Resumo do Arquivo do SCANNY: o que ocupa espaço e quanto é só cópia. */
function archiveStats(S) {
  const list = S.archive || [];
  const sum = (arr) => arr.reduce((a, x) => a + (x.size || 0), 0);
  const soScanny = list.filter((a) => a.status === 'so-scanny');
  const both = list.filter((a) => a.status === 'nos-dois');
  const used = sum(list);
  const limit = S.settings.archiveLimit;
  return {
    count: list.length, used, limit,
    pct: Math.min(100, (used / limit) * 100),
    over: used > limit,
    soScanny: sum(soScanny), soCount: soScanny.length,
    both: sum(both), bothCount: both.length,
  };
}

/* ---------- Pequenos componentes ---------- */

/* Estado em texto com um ponto. Cores em tons de cinza. */
const STATE = {
  normal: ['Ok', 'st-ok'],
  atencao: ['Atenção', 'st-warn'],
  recomendado: ['Recomendado', 'st-rec'],
  avancado: ['Avançado', 'st-warn'],
  bloqueado: ['Bloqueado', 'st-off'],
  naodisponivel: [NA, 'st-na'],
};
function badge(key) {
  const [label, cls] = STATE[key] || STATE.naodisponivel;
  return `<span class="st ${cls}"><i></i>${label}</span>`;
}
const CLS_LABEL = { baixo: 'Comum', analisar: 'Confira antes', essencial: 'Essencial', desconhecido: 'Desconhecido' };
const CLS_ST = { baixo: 'st-ok', analisar: 'st-warn', essencial: 'st-off', desconhecido: 'st-na' };
function clsBadge(c) {
  return `<span class="st ${CLS_ST[c] || 'st-na'}"><i></i>${CLS_LABEL[c] || NA}</span>`;
}

/* Efeitos visuais: usados só pelo código (não aparecem como lista na tela). */
const EFFECTS = [
  { k: 'anim_controls' }, { k: 'anim_windows' }, { k: 'anim_taskbar' }, { k: 'fade_menus' },
  { k: 'fade_tooltips' }, { k: 'shadow' }, { k: 'drag_content' }, { k: 'thumbnails' },
  { k: 'smooth_fonts' }, { k: 'visual_styles' }, { k: 'transparency' },
];
const PROFILES = {
  equilibrado: { n: 'Equilibrado', on: ['smooth_fonts', 'thumbnails', 'visual_styles', 'drag_content', 'anim_windows', 'shadow'] },
  desempenho: { n: 'Desempenho', on: ['smooth_fonts', 'thumbnails', 'visual_styles'] },
  maximo: { n: 'Máximo', on: ['smooth_fonts'] },
  personalizado: { n: 'Personalizado', on: null },
};
const PLANS = ['Economia', 'Equilibrado', 'Alto desempenho', 'Melhor desempenho'];

/* Taxas de atualização do Ao vivo (segundos; 0 = pausado). */
const REFRESH_OPTS = [[2, '2 s'], [5, '5 s'], [15, '15 s'], [0, 'Pausar']];

/* Anel de porcentagem. */
function ring(pct, center, sub = '') {
  const p = pct === null || pct === undefined ? null : Math.max(0, Math.min(100, Math.round(pct)));
  return `<div class="ring${p === null ? ' na' : ''}" style="--p:${p ?? 0}">
    <div class="ring-c"><strong>${center}</strong>${sub ? `<span>${sub}</span>` : ''}</div>
  </div>`;
}

/* Número grande com rótulo e linha fina opcional. */
function stat(label, value, sub, pct) {
  return `<div class="stat">
    <span class="stat-l">${label}</span>
    <strong class="stat-v">${value}</strong>
    <span class="stat-s">${sub}</span>
    ${pct === null || pct === undefined ? '' : `<div class="line"><span style="width:${Math.min(100, Math.max(0, pct))}%"></span></div>`}
  </div>`;
}

/* Linha de lista: título, detalhe opcional e ação à direita. */
function row(title, detail = '', right = '') {
  return `<div class="row">
    <div class="row-main"><strong>${title}</strong>${detail ? `<span>${detail}</span>` : ''}</div>
    ${right ? `<div class="row-end">${right}</div>` : ''}
  </div>`;
}

function switchBtn(action, arg, on) {
  return `<button class="switch${on ? ' on' : ''}" data-action="${action}" data-arg="${arg}" aria-pressed="${!!on}"><span></span></button>`;
}
function toggleBtn(path, on) {
  return `<button class="switch${on ? ' on' : ''}" data-toggle="${path}" aria-pressed="${!!on}"><span></span></button>`;
}

/* Botões de escolha única (segmentos). Valores numéricos viram número no app.js. */
function seg(path, cur, opts) {
  return `<div class="seg">${opts.map(([v, n]) => `<button class="${cur === v ? 'on' : ''}" aria-pressed="${cur === v}" data-set="${path}" data-value="${v}">${n}</button>`).join('')}</div>`;
}

function emptyText(text) { return `<p class="empty-t">${text}</p>`; }

/* Barra com padrão de hachura: o que está "só no SCANNY" ou ocupado por cópias. */
function hatchBar(pct) {
  return `<div class="hatch-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${Math.min(100, Math.max(0, pct))}%"></span></div>`;
}

/* ---------- Ao vivo: ondas, taxa de atualização e processamento ---------- */

const LIVE_N = 60;
const LIVE = { cpu: [], ram: [], disk: [], base: {}, elapsed: 0, at: null };
const clampV = (v) => Math.max(0, Math.min(100, v));

/* Preenche as ondas com valores perto dos dados de exemplo (só com dados de exemplo ligados). */
function liveSeed(S) {
  if (LIVE.cpu.length || !S.settings.sample) return;
  const d = SCANNY_SAMPLE;
  LIVE.base = { cpu: d.cpu.usage, ram: (d.ram.used / d.ram.total) * 100, disk: 22 };
  for (const k of ['cpu', 'ram', 'disk']) {
    let v = LIVE.base[k];
    LIVE[k] = Array.from({ length: LIVE_N }, () => (v = clampV(v + (LIVE.base[k] - v) * 0.2 + (Math.random() - 0.5) * 14)));
  }
  LIVE.at = nowTime();
}

/* Uma nova leitura: empurra a onda para a esquerda. */
function liveStep(S) {
  if (!S.settings.sample || !LIVE.cpu.length) return;
  for (const k of ['cpu', 'ram', 'disk']) {
    const last = LIVE[k].at(-1);
    LIVE[k] = [...LIVE[k].slice(1), clampV(last + (LIVE.base[k] - last) * 0.2 + (Math.random() - 0.5) * 14)];
  }
  LIVE.at = nowTime();
}

function nowTime() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/* Atualiza só os números e as ondas na tela, sem refazer a página. */
function liveDom(S) {
  for (const k of ['cpu', 'ram', 'disk']) {
    const wave = document.querySelector(`[data-wave="${k}"]`);
    if (wave) wave.innerHTML = waveSvg(LIVE[k]);
    const v = document.querySelector(`[data-live-val="${k}"]`);
    if (v && LIVE[k].length) v.textContent = `${Math.round(LIVE[k].at(-1))}%`;
  }
  const r = S.ui.refresh;
  const bar = document.querySelector('[data-live-bar]');
  if (bar) bar.style.width = r ? `${Math.min(100, (LIVE.elapsed / r) * 100)}%` : '0%';
  const t = document.querySelector('[data-live-time]');
  if (t) t.textContent = LIVE.at ? `Atualizado às ${LIVE.at}` : '';
}

/* Onda em SVG: área preenchida com pontos (padrão) e linha por cima. Cores só em cinza/preto/branco. */
function waveSvg(series) {
  const n = series.length;
  if (!n) return '';
  const W = 600, H = 120, pad = 8;
  const x = (i) => (n === 1 ? W : (i / (n - 1)) * W);
  const y = (v) => H - pad - (clampV(v) / 100) * (H - pad * 2);
  const line = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const grid = [25, 50, 75].map((g) => `<line class="g" x1="0" x2="${W}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs><pattern id="wave-dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.4" fill="currentColor"/></pattern></defs>
    ${grid}
    <path class="area" d="${area}"/>
    <path class="stroke" d="${line}"/>
  </svg>`;
}

/* Bloco de onda: rótulo, valor atual e a onda. */
function waveBlock(key, label, value, sub = '') {
  return `<div class="wave-block">
    <div class="wave-head"><span class="wave-l">${label}${sub ? ` <span class="muted">${sub}</span>` : ''}</span><strong class="wave-v" data-live-val="${key}">${value}</strong></div>
    <div class="wave" data-wave="${key}">${waveSvg(LIVE[key])}</div>
    <div class="wave-axis"><span>Últimos 60 registros</span><span>agora</span></div>
  </div>`;
}

/* Taxa de atualização: barra que mostra quanto falta para a próxima leitura. */
function liveBar(S) {
  const r = S.ui.refresh;
  return `<div class="tick-row">
    <span class="muted small">${r ? `Atualiza a cada ${r} s` : 'Atualização pausada'}</span>
    <div class="line tick"><span data-live-bar style="width:0%"></span></div>
    <span class="muted small" data-live-time>${LIVE.at ? `Atualizado às ${LIVE.at}` : ''}</span>
  </div>`;
}

function livePill(S) {
  if (!S.settings.sample) return `<span class="pill"><span class="dot"></span>Sem dados</span>`;
  return S.ui.refresh ? `<span class="pill live"><span class="live-dot"></span>Ao vivo</span>` : `<span class="pill"><span class="dot"></span>Pausado</span>`;
}

/* Indicador de processamento: aparece quando uma análise, limpeza ou reparo está rodando. */
function activityStrip(S) {
  const items = [];
  if (S.clean.running) items.push(S.clean.progress ? `${esc(S.clean.progress.label)} · ${S.clean.progress.done} de ${S.clean.progress.total}` : 'Analisando a limpeza…');
  if (S.analysis.status === 'running') items.push(`Análise: passo ${Math.min(10, S.analysis.step + 1)} de 10`);
  if (S.repair && S.repair.running) items.push(`${esc(S.repair.name)} em andamento`);
  return items.map((t) => `<div class="activity" role="status"><span class="dots-run"><i></i><i></i><i></i></span>${t}</div>`).join('');
}

/* ---------- Resumo ---------- */

function vVisaoGeral(S) {
  const d = dataFor(S);
  const c = d.disks[0];
  const cUsed = c ? Math.round((c.used / c.total) * 100) : null;
  const ramPct = d.ram.total ? (d.ram.used / d.ram.total) * 100 : null;
  const startOn = d.startup.filter((x) => !S.startupOff[x.id]).length;
  const recent = S.history.slice(0, 5);
  const ar = archiveStats(S);
  liveSeed(S);

  return `
  <header class="page-head">
    <h1>Resumo</h1>
    <div class="head-actions">
      <button class="btn" data-action="otimizar">${icon('sparkles')} Otimização segura</button>
      <button class="btn primary" data-action="go" data-arg="analisar">${icon('scan')} Analisar</button>
    </div>
  </header>

  ${activityStrip(S)}

  <section class="hero">
    ${S.settings.sample ? `
      <div class="hero-wave">${waveBlock('cpu', 'Processador', `${Math.round(LIVE.cpu.at(-1))}%`)}</div>
      ${liveBar(S)}`
    : emptyText(`${NA}. Ative os dados de exemplo para ver o processador ao vivo.`)}
  </section>

  <div class="stats">
    ${stat('Memória em uso', d.ram.total ? gb(d.ram.used) : NA, d.ram.total ? `de ${gb(d.ram.total)}` : NA, ramPct)}
    ${stat('Disco C: livre', c ? gb(c.total - c.used) : NA, c ? `de ${gb(c.total)}` : NA, cUsed)}
    ${stat('Na inicialização', d.startup.length ? String(startOn) : NA, 'programas', null)}
    ${stat('Arquivo do SCANNY', sizeText(ar.used), `de ${ar.limit} GB`, ar.pct)}
  </div>

  <div class="split">
    <section class="block">
      <h2>Discos</h2>
      <div class="disks">
        ${d.disks.length ? d.disks.map((x) => {
    const p = Math.round((x.used / x.total) * 100);
    return `<div class="disk">
            ${ring(p, `${p}%`, 'usado')}
            <div class="disk-t"><strong>${esc(x.name)}</strong><span>${esc(x.type)} · ${gb(x.used)} de ${gb(x.total)}</span></div>
          </div>`;
  }).join('') : emptyText(NA)}
      </div>
    </section>

    <section class="block" id="rec-all">
      <h2>Recomendações</h2>
      ${recList(S)}
    </section>
  </div>

  <section class="block">
    <h2>Últimas ações</h2>
    ${recent.length ? recent.map((h) => row(esc(h.action), `${esc(h.when)} · ${esc(h.category)}`,
    h.undo ? `<button class="link-btn" data-action="undo" data-arg="${h.id}">Desfazer</button>` : '')).join('')
      : emptyText('Nenhuma ação ainda.')}
  </section>`;
}

/* Lista de recomendações (regras em recomendacoes.js). */
function recList(S) {
  if (!S.settings.sample) return emptyText(NA);
  const list = recommendations(S);
  if (!list.length) return emptyText('Nada para ajustar agora.');
  return list.map((r) => `<div class="row rec">
    <div class="row-main"><strong>${esc(r.title)}</strong><span>${esc(r.why)}</span></div>
    <div class="row-end"><button class="btn small" data-action="rec" data-arg="${esc(r.id)}">${esc(r.act.label)}</button></div>
  </div>`).join('');
}

/* ---------- Arquivo do SCANNY ---------- */

/* Seleção dos arquivos (fica só na tela; não é salva). */
const ARCH_SEL = new Set();

/* Filtros e ordem aplicados à lista. */
function archiveFiltered(S) {
  const q = (S.ui.archQuery || '').trim().toLowerCase();
  const st = S.ui.archStatus;
  const ty = S.ui.archType;
  const sorters = {
    recentes: (a, b) => tsOf(b.archivedAt) - tsOf(a.archivedAt),
    antigos: (a, b) => tsOf(a.archivedAt) - tsOf(b.archivedAt),
    maior: (a, b) => b.size - a.size,
    menor: (a, b) => a.size - b.size,
    nome: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
  };
  return S.archive
    .filter((a) => st === 'todos' || a.status === st)
    .filter((a) => ty === 'todos' || kindOf(a.name) === ty || a.kind === ty)
    .filter((a) => !q || a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q))
    .sort(sorters[S.ui.archSort] || sorters.recentes);
}

/* Lista da tabela. Também é redesenhada sozinha ao filtrar (sem perder o foco da busca). */
function archiveListHtml(S) {
  if (!S.archive.length) {
    return emptyState('archive', 'Nada guardado ainda',
      'Quando um arquivo grande sair do Windows pelo SCANNY, a cópia aparece aqui antes disso.',
      `<button class="btn small" data-action="go" data-arg="armazenamento">${icon('disk')} Ir para Armazenamento</button>`);
  }
  const list = archiveFiltered(S);
  if (!list.length) {
    return `${emptyText('Nenhum arquivo com esses filtros.')}
      <button class="link-btn" data-action="arq-limpar">Limpar filtros</button>`;
  }
  return `
    <div class="table arch">
      <div class="t-head arch-cols"><span></span><span>Arquivo</span><span>Tipo</span><span class="num">Tamanho</span><span>Guardado em</span><span>Situação</span><span></span></div>
      ${list.map((a) => {
    const sel = ARCH_SEL.has(a.id);
    const restorable = a.status === 'so-scanny' && !a.conflict;
    return `<div class="t-row arch-cols hoverable${sel ? ' sel' : ''}">
          <label class="pick" title="Selecionar">
            <input type="checkbox" data-check="arch" value="${esc(a.id)}" ${sel ? 'checked' : ''}>
            <span class="box"></span>
          </label>
          <div class="file">
            <span class="file-ic">${icon(KIND[a.kind]?.i || 'file')}</span>
            <div class="file-t"><strong>${esc(a.name)}</strong><span class="muted small">${esc(a.path)}</span></div>
          </div>
          <span class="muted small">${esc(KIND[a.kind]?.n || 'Outro')}</span>
          <span class="num">${sizeText(a.size)}</span>
          <span class="small">${esc(a.archivedAt)}<br><span class="muted small">${esc(a.origin)}</span></span>
          <span class="situ">
            ${a.status === 'nos-dois'
    ? `<span class="st st-ok"><i></i>Também no Windows</span>`
    : `<span class="st st-warn"><i></i>Só no SCANNY</span>`}
            ${a.conflict ? `<span class="st st-off"><i></i>Conflito no destino</span>` : ''}
          </span>
          <span class="row-acts">
            <button class="link-btn" data-action="arq-restaurar" data-arg="${esc(a.id)}" ${restorable ? '' : 'disabled'} title="${a.status === 'nos-dois' ? 'Já está no Windows' : a.conflict ? 'Já existe um arquivo nesse caminho' : 'Restaurar no caminho original'}">Restaurar</button>
            <button class="icon-btn" data-action="arq-remover" data-arg="${esc(a.id)}" aria-label="Remover do arquivo do SCANNY" title="Remover do arquivo do SCANNY">${icon('trash')}</button>
          </span>
        </div>`;
  }).join('')}
    </div>`;
}

/* Barra de ações em lote (aparece com itens selecionados). */
function archiveFloatHtml(S) {
  const ids = [...ARCH_SEL].filter((id) => S.archive.some((a) => a.id === id));
  const items = S.archive.filter((a) => ids.includes(a.id));
  const total = items.reduce((s, a) => s + (a.size || 0), 0);
  return `<div class="floating${items.length ? '' : ' idle'}" id="arch-float">
    <div><strong>${items.length} ${items.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}</strong><span>${sizeText(total)}</span></div>
    <div class="head-actions">
      <button class="link-btn" data-action="arq-sel-clear">Limpar seleção</button>
      <button class="btn" data-action="arq-restaurar-sel" ${items.some((a) => a.status === 'so-scanny' && !a.conflict) ? '' : 'disabled'}>${icon('restore')} Restaurar</button>
      <button class="btn danger" data-action="arq-remover-sel">${icon('trash')} Remover do arquivo</button>
    </div>
  </div>`;
}

/* Atualiza só a lista e a barra de lote (usado pela busca, filtros e seleção). */
function refreshArchive(S) {
  const list = document.getElementById('arch-list');
  if (list) list.innerHTML = archiveListHtml(S);
  const fl = document.getElementById('arch-float');
  if (fl) fl.outerHTML = archiveFloatHtml(S);
  const count = document.getElementById('arch-count');
  if (count) count.textContent = `${archiveFiltered(S).length} de ${S.archive.length}`;
}

function vArquivo(S) {
  const ar = archiveStats(S);
  const statusTabs = [
    ['todos', 'Todos', ar.count],
    ['so-scanny', 'Só no SCANNY', ar.soCount],
    ['nos-dois', 'Também no Windows', ar.bothCount],
  ];
  const types = [...new Set(S.archive.map((a) => kindOf(a.name)))];
  const sorts = [['recentes', 'Mais recentes'], ['antigos', 'Mais antigos'], ['maior', 'Maior primeiro'], ['menor', 'Menor primeiro'], ['nome', 'Nome (A a Z)']];

  return `
  <header class="page-head">
    <h1>Arquivo do SCANNY</h1>
    <div class="head-actions">
      <button class="link-btn danger-t" data-action="arq-esvaziar" ${ar.count ? '' : 'disabled'}>Esvaziar arquivo</button>
    </div>
  </header>

  <section class="arch-top">
    <div class="arch-main">
      <span class="stat-l">Guardado pelo SCANNY</span>
      <strong class="arch-big">${sizeText(ar.used)}</strong>
      <span class="stat-s">de ${ar.limit} GB de limite</span>
      ${hatchBar(ar.pct)}
      <div class="arch-limit">
        <span class="muted small">Limite</span>
        ${seg('settings.archiveLimit', ar.limit, [[5, '5 GB'], [10, '10 GB'], [20, '20 GB'], [50, '50 GB']])}
      </div>
    </div>
    <div class="arch-parts">
      <div class="arch-part">
        <span class="st st-warn"><i></i>Só no SCANNY</span>
        <strong>${sizeText(ar.soScanny)}</strong>
        <span class="stat-s">${ar.soCount} ${ar.soCount === 1 ? 'arquivo apagado' : 'arquivos apagados'} do Windows</span>
      </div>
      <div class="arch-part">
        <span class="st st-ok"><i></i>Também no Windows</span>
        <strong>${sizeText(ar.both)}</strong>
        <span class="stat-s">${ar.bothCount} ${ar.bothCount === 1 ? 'arquivo continua' : 'arquivos continuam'} no lugar original</span>
      </div>
    </div>
  </section>

  ${ar.over ? alertBox('warn', 'Passou do limite', 'Remova cópias antigas ou aumente o limite. O SCANNY não apaga nada sozinho.') : ''}

  <div class="arch-tools">
    <label class="field">
      ${icon('search')}
      <input type="search" data-archive="query" placeholder="Buscar por nome ou pasta" value="${esc(S.ui.archQuery || '')}" aria-label="Buscar no arquivo">
    </label>
    <label class="select-wrap">
      <span class="sr">Ordenar</span>
      <select class="select" data-archive="sort" aria-label="Ordenar">
        ${sorts.map(([v, n]) => `<option value="${v}" ${S.ui.archSort === v ? 'selected' : ''}>${n}</option>`).join('')}
      </select>
    </label>
    <label class="select-wrap">
      <span class="sr">Tipo</span>
      <select class="select" data-archive="type" aria-label="Tipo">
        <option value="todos" ${S.ui.archType === 'todos' ? 'selected' : ''}>Todos os tipos</option>
        ${types.map((t) => `<option value="${t}" ${S.ui.archType === t ? 'selected' : ''}>${KIND[t].n}</option>`).join('')}
      </select>
    </label>
  </div>

  <div class="tabs-row">
    <div class="tabs" role="tablist">
      ${statusTabs.map(([k, n, c]) => `<button class="tab${S.ui.archStatus === k ? ' on' : ''}" role="tab" aria-selected="${S.ui.archStatus === k}" data-action="arq-status" data-arg="${k}">${n} <span class="tab-n">${c}</span></button>`).join('')}
    </div>
    <span class="muted small" id="arch-count">${archiveFiltered(S).length} de ${S.archive.length}</span>
  </div>

  <section class="arch-list" id="arch-list">${archiveListHtml(S)}</section>

  <p class="muted small mt-s">Cópias ficam só neste computador, em %LOCALAPPDATA%\\SCANNY\\Arquivo.</p>
  ${archiveFloatHtml(S)}`;
}

/* ---------- Recentes: arquivos que o app tocou ---------- */

const FILE_LOG_TYPES = [['todos', 'Todos'], ['arquivado', 'Arquivados'], ['restaurado', 'Restaurados'], ['removido', 'Removidos'], ['grande', 'Arquivos grandes']];
const FILE_LOG_ICON = { arquivado: 'archive', restaurado: 'restore', removido: 'trash', grande: 'box' };

function vRecentes(S) {
  const f = S.ui.recFilter || 'todos';
  const list = S.fileLog.filter((x) => f === 'todos' || x.type === f);
  return `
  <header class="page-head"><h1>Recentes</h1></header>
  <div class="chips">${FILE_LOG_TYPES.map(([k, n]) => `<button class="chip${f === k ? ' on' : ''}" data-action="rec-filter" data-arg="${k}">${n}</button>`).join('')}</div>
  <section class="block">
    ${list.length ? list.map((x) => `
      <div class="log-row hoverable">
        <span class="log-ic">${icon(FILE_LOG_ICON[x.type] || 'file')}</span>
        <div class="row-main"><strong>${esc(x.name)}</strong><span>${esc(x.text)} · ${esc(x.path)}</span></div>
        <span class="muted small log-when">${esc(x.when)}</span>
      </div>`).join('')
    : emptyState('clock', 'Nada por aqui ainda', 'Os arquivos que o SCANNY tocar aparecem aqui, do mais novo para o mais antigo.')}
  </section>`;
}

/* ---------- Análise ---------- */

function vAnalisar(S) {
  const d = dataFor(S);
  const steps = ['Windows', 'Privilégios', 'Discos', 'Arquivos temporários', 'Inicialização',
    'Visual', 'Energia', 'Serviços', 'Proteção', 'Relatório'];
  const a = S.analysis;
  const running = a.status === 'running';
  const freePct = (x) => ((x.total - x.used) / x.total) * 100;
  const safe = d.cleanup.filter((c) => c.safe);
  const tempTotal = safe.every((c) => c.size !== null) ? safe.reduce((s, c) => s + c.size, 0) : null;
  const highStart = d.startup.filter((x) => x.impact === 'Alto').length;

  const rows = [
    ['Windows', d.os.name ? `${d.os.name} ${d.os.version}` : NA, d.os.name ? 'normal' : 'naodisponivel'],
    ['Processador', d.cpu.name ? esc(d.cpu.name) : NA, d.cpu.name ? 'normal' : 'naodisponivel'],
    ['Placa de vídeo', d.gpu.length ? d.gpu.map((g) => esc(g.name)).join(' + ') : NA, d.gpu.length ? 'normal' : 'naodisponivel'],
    ['Discos', d.disks.length ? d.disks.map((x) => `${esc(x.name)} · ${gb(x.total - x.used)} livres`).join(' · ') : NA,
      d.disks.length ? (d.disks.some((x) => freePct(x) < 20) ? 'atencao' : 'normal') : 'naodisponivel'],
    ['Limpeza segura', tempTotal === null ? NA : gb(tempTotal), tempTotal === null ? 'naodisponivel' : tempTotal > 1 ? 'recomendado' : 'normal'],
    ['Inicialização', d.startup.length ? `${d.startup.length} programas · ${highStart} de impacto alto` : NA, d.startup.length ? (highStart ? 'atencao' : 'normal') : 'naodisponivel'],
    ['Reinício pendente', d.security.pendingReboot === null ? NA : d.security.pendingReboot ? 'Sim' : 'Não', d.security.pendingReboot ? 'atencao' : d.security.pendingReboot === null ? 'naodisponivel' : 'normal'],
  ];

  return `
  <header class="page-head">
    <h1>Análise</h1>
    <div class="head-actions">
      <button class="btn primary" data-action="analisar-run" ${running ? 'disabled' : ''}>${icon('scan')} ${running ? 'Analisando…' : 'Analisar'}</button>
    </div>
  </header>

  ${activityStrip(S)}

  <div class="split">
    <section class="block">
      <ol class="steps">
        ${steps.map((s, i) => {
    let st = 'pending';
    if (a.status === 'done' || (running && i < a.step)) st = 'done';
    if (running && i === a.step) st = 'running';
    return `<li class="step ${st}"><span class="step-dot">${st === 'done' ? icon('check') : ''}</span>${s}</li>`;
  }).join('')}
      </ol>
    </section>

    <section class="block">
      <h2>Resultado</h2>
      ${a.results ? `
        ${rows.map(([n, v, st]) => `<div class="row"><div class="row-main"><strong>${n}</strong><span>${v}</span></div><div class="row-end">${badge(st)}</div></div>`).join('')}
        <div class="export">
          <button class="link-btn" data-action="relatorio" data-arg="txt">Baixar texto</button>
          <button class="link-btn" data-action="relatorio" data-arg="json">Baixar dados</button>
        </div>`
    : emptyText('Clique em Analisar. A análise só lê o computador.')}
    </section>
  </div>`;
}

/* ---------- Limpeza ---------- */

function vLimpeza(S) {
  const d = dataFor(S);
  const c = S.clean;
  const sel = new Set(c.selected);
  const selCount = sel.size + (c.recycle ? 1 : 0) + (c.browser ? 1 : 0);
  const selTotal = d.cleanup.filter((i) => sel.has(i.id)).reduce((a, i) => a + (i.size ?? 0), 0);
  const total = c.analyzed && S.settings.sample
    ? selTotal + (c.recycle ? d.recycle.size : 0) + (c.browser ? d.browserCache.size : 0) : null;

  const item = (i) => `
    <label class="check">
      <input type="checkbox" data-check="clean" value="${i.id}" ${sel.has(i.id) ? 'checked' : ''} ${c.analyzed ? '' : 'disabled'}>
      <span class="box"></span>
      <span class="check-t"><strong>${esc(i.name)}</strong><span>${esc(i.note)}</span></span>
      <span class="check-n">${c.analyzed ? val(i.size, (x) => gb(x)) : NA}</span>
    </label>`;

  const result = c.result;
  return `
  <header class="page-head">
    <h1>Limpeza</h1>
    <div class="head-actions">
      <button class="btn" data-action="analisar-clean" ${c.running ? 'disabled' : ''}>${c.running ? 'Analisando…' : c.analyzed ? 'Analisar de novo' : 'Analisar'}</button>
    </div>
  </header>

  ${activityStrip(S)}

  ${result ? `
  <div class="done">
    <strong>${gb(result.freed)} liberados</strong>
    <span>${result.time} · ${result.skipped} em uso, ignorados</span>
    <div class="head-actions"><button class="link-btn" data-action="log">Ver registro</button><button class="link-btn" data-action="limpeza-nova">Nova análise</button></div>
  </div>` : ''}

  <div class="split wide">
    <section class="block">
      ${c.running ? (c.progress ? progressBlock(c.progress) : skeleton(5))
    : !c.analyzed ? emptyText('Analise primeiro para ver o tamanho de cada item.')
      : `<div class="checks">${d.cleanup.map(item).join('')}</div>`}
    </section>

    <aside class="block aside">
      <h2>Também</h2>
      <label class="check">
        <input type="checkbox" data-check="recycle" ${c.recycle ? 'checked' : ''} ${c.analyzed ? '' : 'disabled'}>
        <span class="box"></span>
        <span class="check-t"><strong>Esvaziar a lixeira</strong><span>Não pode ser desfeito.</span></span>
        <span class="check-n">${c.analyzed ? val(d.recycle.size, (x) => gb(x)) : NA}</span>
      </label>
      <label class="check">
        <input type="checkbox" data-check="browser" ${c.browser ? 'checked' : ''} ${c.analyzed ? '' : 'disabled'}>
        <span class="box"></span>
        <span class="check-t"><strong>Cache dos navegadores</strong><span>Alguns sites podem pedir login de novo.</span></span>
        <span class="check-n">${c.analyzed ? val(d.browserCache.size, (x) => gb(x)) : NA}</span>
      </label>
    </aside>
  </div>

  <section class="block" id="caches-dados">
    <div class="row-between"><div><h2>Caches e Dados</h2><p class="muted small">Apenas caches temporários permitidos. Dados pessoais e pastas-base nunca entram na limpeza.</p></div>
      <label class="check compact"><input type="checkbox" data-check="all-caches" ${c.allTempCaches ? 'checked' : ''} ${c.analyzed ? '' : 'disabled'}><span class="box"></span><span class="check-t"><strong>Deletar todos os caches temporários?</strong><span>Ficheiros recentes ou em uso serão ignorados.</span></span></label>
    </div>
    <div class="checks cache-list">${(S.nativeCleanup?.length ? S.nativeCleanup : (d.cacheFolders || [])).map((x) => `<div class="row"><div class="row-main"><strong>${esc(x.name)}</strong><span>${esc(x.path || `${x.files ?? 0} ficheiro(s) analisado(s)`)} · ${esc(x.note || 'Cache temporário permitido')}</span></div><div class="row-end"><button class="link-btn" data-action="cache-open" data-arg="${esc(x.id)}">Abrir pasta</button></div></div>`).join('')}</div>
  </section>

  <div class="floating${selCount ? '' : ' idle'}">
    <div>
      <strong>${selCount ? `${selCount} ${selCount === 1 ? 'item' : 'itens'}` : 'Nada selecionado'}</strong>
      <span>${total === null ? '' : gb(total)}</span>
    </div>
    <div class="head-actions">
      <button class="link-btn" data-action="limpeza-clear" ${selCount ? '' : 'disabled'}>Limpar seleção</button>
      <button class="btn danger" data-action="limpeza-run" ${selCount && c.analyzed && !c.running ? '' : 'disabled'}>${icon('trash')} Limpar</button>
    </div>
  </div>`;
}

function progressBlock(p) {
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  return `<div class="progress" aria-live="polite">
    <div class="row-between"><strong>${esc(p.label || 'Preparando…')}</strong><span>${p.done} de ${p.total}</span></div>
    <div class="line"><span style="width:${pct}%"></span></div>
  </div>`;
}

/* ---------- Ao vivo ---------- */

function vAoVivo(S) {
  const d = dataFor(S);
  liveSeed(S);
  const top = [...d.processes].sort((a, b) => b.cpu - a.cpu).slice(0, 5);
  const topMax = Math.max(1, ...top.map((p) => p.cpu));
  const memUsed = d.ram.total ? `${gb(d.ram.used)} de ${gb(d.ram.total)}` : '';

  return `
  <header class="page-head">
    <h1>Ao vivo</h1>
    <div class="head-actions">${livePill(S)}</div>
  </header>

  ${activityStrip(S)}

  <div class="chips">
    ${REFRESH_OPTS.map(([v, n]) => `<button class="chip${S.ui.refresh === v ? ' on' : ''}" data-action="refresh" data-arg="${v}" aria-pressed="${S.ui.refresh === v}">${n}</button>`).join('')}
  </div>
  ${S.settings.sample ? liveBar(S) : ''}

  ${S.settings.sample ? `
    <section class="waves">
      ${waveBlock('cpu', 'Processador', `${Math.round(LIVE.cpu.at(-1))}%`, d.cpu.name ? `· ${esc(d.cpu.name)}` : '')}
      ${waveBlock('ram', 'Memória', `${Math.round(LIVE.ram.at(-1))}%`, memUsed ? `· ${memUsed}` : '')}
      ${waveBlock('disk', 'Disco C: atividade', `${Math.round(LIVE.disk.at(-1))}%`)}
    </section>

    <section class="block mt">
      <h2>Quem mais usa o processador</h2>
      ${top.map((p) => `<div class="bar-row">
        <strong>${esc(p.name)}</strong>
        <div class="hbar"><span style="width:${(p.cpu / topMax) * 100}%"></span></div>
        <span class="num">${p.cpu}%</span>
      </div>`).join('')}
    </section>`
    : emptyState('wave', 'Sem dados ao vivo', 'Ative os dados de exemplo em Configurações > Desenvolvimento para ver o gráfico.',
      `<button class="btn small" data-action="go" data-arg="configuracoes">${icon('cog')} Configurações</button>`)}`;
}

/* ---------- Desempenho: o computador, o modo visual, a energia e os programas em uso ---------- */

function vDesempenho(S) {
  const d = dataFor(S);
  const c = d.cpu;
  const currentPlan = S.powerPlan ?? d.power.current;
  const profile = S.effects.profile;
  const procs = [...d.processes].sort((a, b) => b.cpu - a.cpu).slice(0, 6);

  const gpus = d.gpu.length ? d.gpu.map((g) => `
    <div class="spec">
      <span>${g.integrated ? 'Gráfico integrado' : 'Placa de vídeo'}</span>
      <strong>${esc(g.name)}</strong>
      <small>${g.vram ? `${g.vram} GB` : 'Memória do sistema'} · driver ${esc(g.driver)} de ${esc(g.driverDate)}</small>
    </div>`).join('') : `<div class="spec"><span>Placa de vídeo</span><strong>${NA}</strong></div>`;

  return `
  <header class="page-head"><h1>Desempenho</h1></header>

  <section class="specs">
    <div class="spec">
      <span>Processador</span>
      <strong>${esc(val(c.name))}</strong>
      <small>${c.cores ? `${c.cores} núcleos · ${c.threads} threads · ${esc(val(c.freq))}` : NA}</small>
    </div>
    ${gpus}
    <div class="spec">
      <span>Memória</span>
      <strong>${val(d.ram.total, (v) => gb(v))}</strong>
      <small>${d.ram.type ? `${esc(d.ram.type)} · ${esc(val(d.ram.speed))} · ${d.ram.sticks} pentes` : NA}</small>
    </div>
  </section>

  <div class="split">
    <section class="block">
      <h2>Visual</h2>
      <div class="chips">
        ${['equilibrado', 'desempenho', 'maximo'].map((k) => `
          <button class="chip${k === profile ? ' on' : ''}" data-action="modo" data-arg="${k}" aria-pressed="${k === profile}">${PROFILES[k].n}</button>`).join('')}
      </div>
      <div class="head-actions"><button class="link-btn" data-action="efeitos-restaurar" ${S.effects.previous ? '' : 'disabled'}>Voltar ao anterior</button></div>
    </section>

    <section class="block">
      <h2>Energia</h2>
      <div class="chips">
        ${PLANS.map((p) => `<label class="chip${currentPlan === p ? ' on' : ''}"><input type="radio" name="plano" data-set-plan="${p}" ${currentPlan === p ? 'checked' : ''} ${d.power.plans.length ? '' : 'disabled'}>${p}</label>`).join('')}
      </div>
      ${d.power.laptop && currentPlan === 'Alto desempenho' ? `<p class="muted small">Em notebook, o Equilibrado gasta menos bateria.</p>` : ''}
    </section>
  </div>

  <section class="block">
    <h2>Programas em uso</h2>
    ${d.processes.length ? `
      <div class="table">
        <div class="t-head"><span>Programa</span><span>Processador</span><span>Memória</span></div>
        ${procs.map((p) => `<div class="t-row"><span><strong>${esc(p.name)}</strong></span><span>${p.cpu}%</span><span>${gb(p.ram)}</span></div>`).join('')}
      </div>` : emptyText(NA)}
  </section>`;
}

/* ---------- Inicialização ---------- */

function vInicializacao(S, d) {
  const f = S.ui.initFilter;
  const list = d.startup.filter((x) => f === 'todos' || x.cls === f);
  const filters = [['todos', 'Todos'], ['baixo', 'Comuns'], ['analisar', 'Confira'], ['essencial', 'Essenciais'], ['desconhecido', 'Desconhecidos']];
  return `
  <header class="page-head"><h1>Inicialização</h1></header>
  <div class="chips">${filters.map(([k, n]) => `<button class="chip${f === k ? ' on' : ''}" data-action="init-filter" data-arg="${k}">${n}</button>`).join('')}</div>

  <section class="block">
    ${list.length ? list.map((x) => {
    const off = !!S.startupOff[x.id];
    const essential = x.cls === 'essencial';
    return `<div class="row">
        <div class="row-main"><strong>${esc(x.name)}</strong><span>${esc(x.maker)} · impacto ${esc(x.impact.toLowerCase())}</span></div>
        <div class="row-end">
          ${clsBadge(x.cls)}
          ${essential ? `<span class="muted small">Protegido</span>` : switchBtn('startup-toggle', x.id, !off)}
        </div>
      </div>`;
  }).join('') : emptyText(NA)}
  </section>`;
}

/* ---------- Armazenamento ---------- */

function vArmazenamento(S, d) {
  const ar = archiveStats(S);
  const c = d.disks[0];
  const largeFiles = d.largeFiles.filter((f) => !S.gone[f.path]);
  /* Disco C: parte usada pelo sistema e parte que é o Arquivo do SCANNY (com hachura). */
  const cTotal = c ? c.total : 0;
  const cOthers = c ? ((c.used - ar.used) / cTotal) * 100 : 0;
  const cArch = c ? (ar.used / cTotal) * 100 : 0;

  return `
  <header class="page-head"><h1>Armazenamento</h1></header>

  <div class="disk-grid">
    ${d.disks.length ? d.disks.map((x) => {
    const freePct = Math.round(((x.total - x.used) / x.total) * 100);
    return `<div class="disk-big">
        ${ring(100 - freePct, `${freePct}%`, 'livre')}
        <div class="disk-t"><strong>${esc(x.name)}</strong><span>${esc(x.type)} · ${gb(x.used)} usados de ${gb(x.total)}</span></div>
      </div>`;
  }).join('') : emptyText(NA)}
  </div>

  ${c ? `
  <section class="block">
    <h2>O que ocupa o disco C:</h2>
    <div class="stack" role="img" aria-label="Disco C: sistema e arquivos, e o Arquivo do SCANNY">
      <span class="seg-solid" style="width:${cOthers}%"></span>
      <span class="seg-hatch" style="width:${cArch}%"></span>
    </div>
    <div class="legend">
      <span><i class="lg-solid"></i>Windows e programas · ${gb(c.used - ar.used)}</span>
      <span><i class="lg-hatch"></i>Arquivo do SCANNY · ${sizeText(ar.used)}</span>
    </div>
  </section>` : ''}

  <section class="block">
    <h2>Arquivos grandes</h2>
    ${largeFiles.length ? `
      <div class="checks">
        ${largeFiles.map((f) => `
          <label class="check">
            <input type="checkbox" data-check="big" value="${esc(f.path)}">
            <span class="box"></span>
            <span class="check-t"><strong>${esc(f.name)}</strong><span>${esc(f.path)} · ${f.date}</span></span>
            <span class="check-n">${gb(f.size)}</span>
          </label>`).join('')}
      </div>
      <div class="row mt-s">
        <div class="row-main"><strong>Guardar cópia antes de excluir</strong><span>${S.settings.archiveBeforeDelete ? 'A cópia vai para o Arquivo do SCANNY.' : 'Desligado: a exclusão não tem cópia.'}</span></div>
        <div class="row-end">${toggleBtn('settings.archiveBeforeDelete', S.settings.archiveBeforeDelete)}</div>
      </div>
      <div class="head-actions"><button class="link-btn danger-t" data-action="big-delete">Excluir selecionados</button></div>`
    : emptyText(NA)}
  </section>`;
}

/* ---------- Jogos ---------- */

function vJogos(S, d) {
  const m = S.games.measure;
  return `
  <header class="page-head"><h1>Jogos</h1></header>

  <div class="split">
    <section class="block">
      <h2>Instalados</h2>
      ${d.games.length ? d.games.map((g) => row(esc(g.name), `${esc(g.platform)} · ${gb(g.size)} · jogado em ${g.last}`)).join('') : emptyText(NA)}
    </section>
    <section class="block">
      <h2>Modo de Jogo</h2>
      <div class="row">
        <div class="row-main"><strong>Modo de Jogo do Windows</strong><span>Abre a configuração oficial.</span></div>
        <div class="row-end"><button class="link-btn" data-action="show-path" data-arg="ms-settings:gaming-gamemode">Ver caminho</button></div>
      </div>
      <div class="row">
        <div class="row-main"><strong>Barra de jogos</strong><span>Barra do Xbox.</span></div>
        <div class="row-end">${toggleBtn('settings.gameBar', S.settings.gameBar)}</div>
      </div>
      <h2 class="mt">Antes e depois</h2>
      ${m ? `<div class="stats small-stats">
        ${stat('Memória antes', `${m.before}%`, 'em uso', null)}
        ${stat('Memória depois', `${m.after}%`, 'em uso', null)}
      </div>` : emptyText(`${NA}. A medição usa os dados de exemplo.`)}
      <div class="head-actions"><button class="btn small" data-action="jogo-medir" ${S.settings.sample ? '' : 'disabled'}>${icon('play')} Medir</button></div>
    </section>
  </div>`;
}

/* ---------- Reparos ---------- */

function vReparos(S) {
  const d = dataFor(S);
  const run = S.repair;
  return `
  <header class="page-head"><h1>Reparos</h1></header>
  <p class="muted">O comando aparece inteiro antes de rodar.</p>

  <section class="block">
    ${d.repairs.map((r) => row(esc(r.name), `${esc(r.desc)} · ${r.time}${r.restart ? ' · pede reinício' : ''}`,
    `<button class="btn small" data-action="repair-ask" data-arg="${r.id}" ${run && run.running ? 'disabled' : ''}>${icon('play')} Executar</button>`)).join('')}
  </section>

  ${run ? `
  <section class="block">
    <div class="row-between"><h2>${esc(run.name)}</h2>
      ${run.running ? `<button class="link-btn" data-action="repair-cancel">Cancelar</button>` : `<span class="muted small">${run.cancelled ? 'Cancelado' : 'Concluído'}</span>`}
    </div>
    <pre class="term" aria-live="polite">${run.lines.map((l) => esc(l)).join('\n')}</pre>
    ${!run.running && run.restart ? `<p class="muted small">Reinicie o computador quando puder.</p>` : ''}
  </section>` : ''}`;
}

/* ---------- Privacidade ---------- */

function vPrivacidade(S, d) {
  const items = [
    ['anuncios', 'Anúncios personalizados', 'Usa suas atividades para escolher anúncios.'],
    ['iniciar', 'Sugestões do menu Iniciar', 'Mostra apps e arquivos sugeridos.'],
    ['historico', 'Histórico de atividades', 'Guarda o que você abriu e usou.'],
    ['localizacao', 'Localização', 'Apps que podem usar sua localização.'],
    ['camera', 'Câmera e microfone', 'Apps que podem usar câmera e microfone.'],
    ['explorador', 'Sugestões do Explorador', 'Dicas e anúncios dentro do Explorador.'],
  ];
  return `
  <header class="page-head"><h1>Privacidade</h1></header>
  <section class="block">
    ${items.map(([k, n, t]) => {
    const v = d.os.name ? S.privacy[k] : null;
    return `<div class="row">
        <div class="row-main"><strong>${n}</strong><span>${t}</span></div>
        <div class="row-end">${v === null ? `<span class="muted small">${NA}</span>` : switchBtn('priv-toggle', k, v)}</div>
      </div>`;
  }).join('')}
  </section>`;
}

/* ---------- Segurança e restauração ---------- */

function vSeguranca(S, d) {
  const sec = d.security;
  const mine = S.history.filter((h) => h.undo);
  const st = (v) => (v === null || v === undefined ? NA : v);
  return `
  <header class="page-head">
    <h1>Segurança e restauração</h1>
    <div class="head-actions"><button class="btn" data-action="restore">${icon('restore')} Criar ponto de restauração</button></div>
  </header>

  <div class="split">
    <section class="block">
      <h2>Proteção</h2>
      ${row('Microsoft Defender', '', badge(sec.defender ? 'normal' : 'naodisponivel'))}
      ${row('Firewall', '', badge(sec.firewall ? 'normal' : 'naodisponivel'))}
      ${row('Atualizações do Windows', '', `<span class="muted small">${esc(st(sec.update))}</span>`)}
      ${row('Último ponto de restauração', '', `<span class="muted small">${esc(st(sec.lastRestore))}</span>`)}
      <p class="muted small mt-s">O SCANNY nunca desativa Defender, Firewall nem atualizações.</p>
    </section>

    <section class="block">
      <h2>Backup</h2>
      <p class="muted">Salva as configurações, o histórico e o Arquivo do SCANNY. Seus arquivos originais não entram.</p>
      <div class="head-actions">
        <button class="btn small" data-action="backup-export">${icon('download')} Exportar</button>
        <button class="btn small" data-action="backup-import">${icon('upload')} Importar</button>
      </div>
      <p class="muted small">Último backup: ${S.lastBackup ? esc(S.lastBackup) : NA}</p>
    </section>
  </div>

  <section class="block">
    <div class="row-between"><h2>Alterações que podem ser desfeitas</h2>
      ${mine.length ? `<button class="link-btn" data-action="restore-all">Desfazer tudo</button>` : ''}
    </div>
    ${mine.length ? mine.map((h) => row(esc(h.action), `${esc(h.when)} · ${esc(h.category)}`, `<button class="link-btn" data-action="undo" data-arg="${h.id}">Desfazer</button>`)).join('')
    : emptyText('Nada para desfazer.')}
  </section>`;
}

/* ---------- Histórico ---------- */

function vHistorico(S) {
  const f = S.ui.histFilter;
  const list = S.history.filter((h) => f === 'todas' || h.category === f);
  const cats = ['todas', ...new Set(S.history.map((h) => h.category))];
  return `
  <header class="page-head">
    <h1>Histórico</h1>
    <div class="head-actions"><button class="link-btn" data-action="hist-clear" ${S.history.length ? '' : 'disabled'}>Limpar</button></div>
  </header>
  <div class="chips">${cats.map((c) => `<button class="chip${f === c ? ' on' : ''}" data-action="hist-filter" data-arg="${esc(c)}">${c === 'todas' ? 'Todas' : esc(c)}</button>`).join('')}</div>
  <section class="block">
    ${list.length ? list.map((h) => row(esc(h.action),
    `${esc(h.when)} · ${esc(h.category)}${h.before ? ` · ${esc(h.before)} → ${esc(h.after ?? '—')}` : ''} · ${esc(h.result ?? '')}`,
    h.undo ? `<button class="link-btn" data-action="undo" data-arg="${h.id}">Desfazer</button>` : '')).join('')
    : emptyText('Nenhuma ação registrada.')}
  </section>`;
}

/* ---------- Configurações ---------- */

function vConfiguracoes(S) {
  const st = S.settings;
  const line = (n, t, control) => `<div class="row"><div class="row-main"><strong>${n}</strong>${t ? `<span>${t}</span>` : ''}</div><div class="row-end">${control}</div></div>`;
  return `
  <header class="page-head"><h1>Configurações</h1></header>

  <section class="block">
    <h2>Geral</h2>
    ${line('Tema', '', seg('settings.theme', st.theme, [['escuro', 'Escuro'], ['claro', 'Claro'], ['auto', 'Automático']]))}
    ${line('Iniciar com o Windows', 'Desligado por padrão.', toggleBtn('settings.startWithWindows', st.startWithWindows))}
    ${line('Minimizar para a bandeja', '', toggleBtn('settings.minimizeTray', st.minimizeTray))}
    ${line('Confirmar ações', 'Recomendado.', toggleBtn('settings.confirmDanger', st.confirmDanger))}
    ${line('Notificações', '', toggleBtn('settings.notifs', st.notifs))}
  </section>

  <section class="block">
    <h2>Arquivo do SCANNY</h2>
    ${line('Guardar cópia antes de excluir', 'Arquivos grandes ficam guardados antes de sair do Windows.', toggleBtn('settings.archiveBeforeDelete', st.archiveBeforeDelete))}
    ${line('Limite de espaço', 'Passou do limite, o SCANNY avisa. Nunca apaga sozinho.', seg('settings.archiveLimit', st.archiveLimit, [[5, '5 GB'], [10, '10 GB'], [20, '20 GB'], [50, '50 GB']]))}
  </section>

  <section class="block">
    <h2>Atualização ao vivo</h2>
    ${line('Taxa de atualização', 'Vale para Resumo e Ao vivo.', seg('ui.refresh', S.ui.refresh, REFRESH_OPTS))}
  </section>

  <section class="block">
    <h2>Privacidade do SCANNY</h2>
    ${line('Telemetria', 'Nenhum dado pessoal é enviado.', `<span class="st st-ok"><i></i>Desligada</span>`)}
    ${line('Registro local', 'Fica só neste computador.', toggleBtn('settings.logs', st.logs))}
    ${line('Apagar dados do SCANNY', 'Configurações, histórico, registro e o Arquivo do SCANNY. Seus arquivos não são tocados.', `<button class="link-btn danger-t" data-action="apagar-dados">Apagar</button>`)}
  </section>

  <section class="block">
    <h2>Atualizações</h2>
    ${line('Verificar automaticamente', 'Só verifica. Nunca instala sozinho.', toggleBtn('settings.autoCheck', st.autoCheck))}
    ${line('Versão', APP_VERSION, `<button class="link-btn" data-action="check-update">Verificar</button>`)}
  </section>

  <section class="block">
    <h2>Desenvolvimento</h2>
    ${line('Dados de exemplo', 'Desligado mostra "Não disponível" em todas as telas.', toggleBtn('settings.sample', st.sample))}
  </section>`;
}

/* ---------- Sobre ---------- */

function vSobre() {
  return `
  <header class="page-head"><h1>Sobre o SCANNY</h1></header>
  <p class="lead">Analisa, limpa e ajusta o Windows, sempre com a sua confirmação.</p>
  <section class="block">
    <h2>Princípios</h2>
    <ol class="plain-list">
      <li>Analisar nunca altera nada.</li>
      <li>Toda mudança pede confirmação e fica registrada.</li>
      <li>O que pode ser desfeito, tem botão para desfazer.</li>
      <li>Arquivos pessoais e o sistema não são tocados automaticamente.</li>
      <li>Antes de excluir um arquivo grande, o SCANNY guarda uma cópia no próprio arquivo, se você deixar ligado.</li>
    </ol>
  </section>
  <p class="muted small">${APP_VERSION}</p>`;
}

const VIEWS = {
  'visao-geral': vVisaoGeral,
  arquivo: vArquivo,
  recentes: vRecentes,
  armazenamento: vArmazenamento,
  'ao-vivo': vAoVivo,
  historico: vHistorico,
  analisar: vAnalisar,
  limpeza: vLimpeza,
  desempenho: vDesempenho,
  inicializacao: vInicializacao,
  jogos: vJogos,
  reparos: vReparos,
  privacidade: vPrivacidade,
  seguranca: vSeguranca,
  configuracoes: vConfiguracoes,
  sobre: vSobre,
};
