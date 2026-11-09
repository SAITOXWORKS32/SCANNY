/* SCANNY — telas. Cada função recebe o estado (S) e devolve HTML.
 * Cliques e mudanças são tratados em app.js pelos atributos data-action, data-toggle, data-set, data-check e data-set-plan. */

const PAGES = [
  { id: 'visao-geral', title: 'Resumo', icon: 'home' },
  { id: 'analisar', title: 'Análise', icon: 'scan' },
  { id: 'limpeza', title: 'Limpeza', icon: 'sparkles' },
  { id: 'desempenho', title: 'Desempenho', icon: 'gauge' },
  { id: 'inicializacao', title: 'Inicialização', icon: 'power' },
  { id: 'armazenamento', title: 'Armazenamento', icon: 'disk' },
  { id: 'jogos', title: 'Jogos', icon: 'gamepad' },
  { id: 'reparos', title: 'Reparos', icon: 'wrench' },
  { id: 'privacidade', title: 'Privacidade', icon: 'eye' },
  { id: 'seguranca', title: 'Segurança e restauração', icon: 'shield' },
  { id: 'historico', title: 'Histórico', icon: 'history' },
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

function dataFor(S) { return S.settings.sample ? SCANNY_SAMPLE : EMPTY_DATA; }

/* Classificação de item de inicialização: texto curto e estado em tons de cinza. */
const CLS_LABEL = { baixo: 'Comum', analisar: 'Confira antes', essencial: 'Essencial', desconhecido: 'Desconhecido' };
const CLS_ST = { baixo: 'st-ok', analisar: 'st-warn', essencial: 'st-off', desconhecido: 'st-na' };

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
function clsBadge(c) {
  return `<span class="st ${CLS_ST[c] || 'st-na'}"><i></i>${CLS_LABEL[c] || NA}</span>`;
}

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

function emptyText(text) { return `<p class="empty-t">${text}</p>`; }

/* ---------- Resumo ---------- */

function vVisaoGeral(S) {
  const d = dataFor(S);
  const c = d.disks[0];
  const cUsed = c ? Math.round((c.used / c.total) * 100) : null;
  const ramPct = d.ram.total ? (d.ram.used / d.ram.total) * 100 : null;
  const startOn = d.startup.filter((x) => !S.startupOff[x.id]).length;
  const recent = S.history.slice(0, 5);

  return `
  <header class="page-head">
    <h1>Resumo</h1>
    <div class="head-actions">
      <button class="btn" data-action="otimizar">${icon('sparkles')} Otimização segura</button>
      <button class="btn primary" data-action="go" data-arg="analisar">${icon('scan')} Analisar</button>
    </div>
  </header>

  <div class="stats">
    ${stat('Processador', pctText(d.cpu.usage), d.cpu.name ? esc(d.cpu.name) : NA, d.cpu.usage)}
    ${stat('Memória em uso', d.ram.total ? gb(d.ram.used) : NA, d.ram.total ? `de ${gb(d.ram.total)}` : NA, ramPct)}
    ${stat('Disco C: livre', c ? gb(c.total - c.used) : NA, c ? `de ${gb(c.total)}` : NA, cUsed)}
    ${stat('Na inicialização', d.startup.length ? String(startOn) : NA, 'programas', null)}
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

  <section class="block" id="atividade">
    <h2>Atividade</h2>
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

  <section class="block">
    <h2>Arquivos grandes</h2>
    ${d.largeFiles.length ? `
      <div class="checks">
        ${d.largeFiles.map((f, i) => `
          <label class="check">
            <input type="checkbox" data-check="big" value="${i}">
            <span class="box"></span>
            <span class="check-t"><strong>${esc(f.name)}</strong><span>${esc(f.path)} · ${f.date}</span></span>
            <span class="check-n">${gb(f.size)}</span>
          </label>`).join('')}
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
      <p class="muted">Salva as configurações e o histórico do SCANNY. Seus arquivos não entram.</p>
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
  const seg = (path, cur, opts) => `<div class="seg">${opts.map(([v, n]) => `<button class="${cur === v ? 'on' : ''}" aria-pressed="${cur === v}" data-set="${path}" data-value="${v}">${n}</button>`).join('')}</div>`;
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
    <h2>Privacidade do SCANNY</h2>
    ${line('Telemetria', 'Nenhum dado pessoal é enviado.', `<span class="st st-ok"><i></i>Desligada</span>`)}
    ${line('Registro local', 'Fica só neste computador.', toggleBtn('settings.logs', st.logs))}
    ${line('Apagar dados do SCANNY', 'Configurações, histórico e registro. Seus arquivos não são tocados.', `<button class="link-btn danger-t" data-action="apagar-dados">Apagar</button>`)}
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
    </ol>
  </section>
  <p class="muted small">${APP_VERSION}</p>`;
}

const VIEWS = {
  'visao-geral': vVisaoGeral,
  analisar: vAnalisar,
  limpeza: vLimpeza,
  desempenho: vDesempenho,
  inicializacao: vInicializacao,
  armazenamento: vArmazenamento,
  jogos: vJogos,
  reparos: vReparos,
  privacidade: vPrivacidade,
  seguranca: vSeguranca,
  historico: vHistorico,
  configuracoes: vConfiguracoes,
  sobre: vSobre,
};
