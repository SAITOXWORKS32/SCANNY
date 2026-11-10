/* SCANNY — recomendações baseadas no hardware e no estado deste PC.
 * Cada regra lê um valor real (placa de vídeo, driver, memória, disco, bateria, inicialização…).
 * Sem dados (Dados de exemplo desligados) não há recomendação: nada é inventado.
 *
 * Para criar uma regra: adicione um bloco em recommendations() com id, page, title, why, risk, act.
 * act.kind: 'go' (abre a página), 'tab' (abre Desempenho), 'modo' (aplica um modo visual), 'action' (chama ACTIONS[arg]). */

const VENDOR_NAME = { nvidia: 'NVIDIA', amd: 'AMD', intel: 'Intel' };
const VENDOR_SITE = { nvidia: 'nvidia.com', amd: 'amd.com (AMD Adrenalin)', intel: 'intel.com (Intel Graphics)' };

/* Dias desde uma data "dd/mm/aaaa" ou "mm/aaaa". Null se não der para ler. */
function daysSince(s) {
  if (!s || s === NA || s === '—') return null;
  const p = s.split('/').map(Number);
  const [d, m, y] = p.length === 3 ? p : [1, p[0], p[1]];
  const t = new Date(y, m - 1, d).getTime();
  return isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000);
}

const LEVEL_ORDER = [0, 1, 2];   // 0 = crítico, 1 = atenção, 2 = dica

function recommendations(S) {
  if (!S.settings.sample) return [];      // sem análise real, não há o que recomendar
  const d = dataFor(S);
  const out = [];
  const push = (r) => out.push(r);

  /* Placa de vídeo: driver antigo (mais de 6 meses) */
  d.gpu.filter((g) => !g.integrated).forEach((g) => {
    const age = daysSince(g.driverDate);
    if (age !== null && age > 180) push({
      id: `drv-${g.vendor}`, level: 1, page: 'desempenho', risk: 'baixo',
      title: `Atualizar o driver da ${g.name}`,
      why: `Driver ${g.driver}, instalado há ${Math.round(age / 30)} meses. Confira a versão mais nova em ${VENDOR_SITE[g.vendor] ?? 'o site do fabricante'} antes de mexer em outras configurações.`,
      act: { label: 'Ver hardware', kind: 'tab', arg: 'hardware' },
    });
  });

  /* Só GPU integrada: efeitos visuais pesam mais */
  if (d.gpu.length && d.gpu.every((g) => g.integrated)) push({
    id: 'sem-gpu', level: 2, page: 'desempenho', risk: 'seguro',
    title: 'Sem placa de vídeo dedicada',
    why: `${d.gpu[0].name} é integrada. Os efeitos visuais pesam mais nesse caso: o perfil Desempenho reduz animações e transparência.`,
    act: { label: 'Escolher perfil Desempenho', kind: 'modo', arg: 'desempenho' },
  });

  /* Inicialização: programas de impacto alto (mais grave com pouca memória) */
  const highStart = d.startup.filter((x) => x.impact === 'Alto' && !S.startupOff[x.id]);
  if (highStart.length >= 2) {
    const ram = d.ram.total;
    push({
      id: 'inicio-alto', level: ram !== null && ram <= 8 ? 1 : 2, page: 'inicializacao', risk: 'baixo',
      title: `${highStart.length} programas de impacto alto abrem com o Windows`,
      why: `${ram !== null ? `Seu PC tem ${ram} GB de memória. ` : ''}Entre eles: ${highStart.map((x) => x.name).join(', ')}. Desative o que você não usa logo no início. Nada é apagado.`,
      act: { label: 'Revisar inicialização', kind: 'go', arg: 'inicializacao' },
    });
  }

  /* Memória em uso alto */
  if (d.ram.total && d.ram.used !== null && d.ram.used / d.ram.total >= 0.8) push({
    id: 'ram-alta', level: 1, page: 'desempenho', risk: 'seguro',
    title: `Memória em ${Math.round((d.ram.used / d.ram.total) * 100)}% de uso`,
    why: `${d.ram.top ? `${d.ram.top.name} usa ${d.ram.top.value}. ` : ''}Feche o que não está em uso. O SCANNY não libera memória sozinho.`,
    act: { label: 'Ver processos', kind: 'tab', arg: 'processos' },
  });

  /* Disco com pouco espaço livre (cálculo exato, sem arredondar) */
  d.disks.forEach((x) => {
    const freePct = ((x.total - x.used) / x.total) * 100;
    if (freePct < 20) push({
      id: `disco-${x.id}`, level: freePct < 10 ? 0 : 1, page: 'armazenamento', risk: 'seguro',
      title: `${x.name} com ${freePct.toFixed(1).replace('.', ',')}% livre`,
      why: `${x.type === 'SSD' ? 'SSD com pouco espaço livre perde velocidade de escrita.' : 'HDD com pouco espaço fica mais lento e mais fragmentado.'} Restam ${gb(x.total - x.used)}.`,
      act: { label: 'Ver armazenamento', kind: 'go', arg: 'armazenamento' },
    });
  });

  /* Notebook no plano de alto desempenho */
  const plan = S.powerPlan ?? d.power.current;
  if (d.power.laptop && plan === 'Alto desempenho') push({
    id: 'energia-notebook', level: 1, page: 'desempenho', risk: 'baixo',
    title: 'Alto desempenho num notebook',
    why: 'Gasta mais bateria, esquenta e faz mais barulho. Para o uso do dia a dia, o plano Equilibrado costuma render mais.',
    act: { label: 'Ver energia', kind: 'tab', arg: 'energia' },
  });

  /* Temperatura do processador */
  if (d.cpu.temp !== null && d.cpu.temp >= 80) push({
    id: 'cpu-temp', level: 0, page: 'desempenho', risk: 'seguro',
    title: `Processador a ${d.cpu.temp} °C`,
    why: `${d.cpu.name ?? 'O processador'} passa de 80 °C. Verifique ventilação e poeira antes de qualquer ajuste de software.`,
    act: { label: 'Ver hardware', kind: 'tab', arg: 'hardware' },
  });

  /* Limpeza: temporários seguros */
  const safe = d.cleanup.filter((c) => c.safe && c.size !== null);
  const safeTotal = safe.reduce((a, c) => a + c.size, 0);
  if (safe.length && safeTotal >= 1) push({
    id: 'limpeza-segura', level: 2, page: 'limpeza', risk: 'seguro',
    title: `${gb(safeTotal)} em arquivos temporários seguros`,
    why: 'Temporários, miniaturas e relatórios antigos. Nada pessoal é tocado, e o Windows recria o que precisar.',
    act: { label: 'Ir para limpeza', kind: 'go', arg: 'limpeza' },
  });

  /* Inicialização: itens sem fabricante conhecido */
  const unknown = d.startup.filter((x) => (x.cls === 'analisar' || x.cls === 'desconhecido') && !S.startupOff[x.id]);
  if (unknown.length) push({
    id: 'inicio-desconhecido', level: 1, page: 'inicializacao', risk: 'medio',
    title: `${unknown.length} item(ns) sem fabricante conhecido na inicialização`,
    why: `Ex.: ${unknown[0].name}, em ${unknown[0].path}. Confira antes de desativar: o SCANNY não recomenda desativar sozinho.`,
    act: { label: 'Revisar', kind: 'go', arg: 'inicializacao' },
  });

  /* Segurança: reinício pendente e ponto de restauração antigo */
  if (d.security.pendingReboot) push({
    id: 'reinicio', level: 1, page: 'seguranca', risk: 'seguro',
    title: 'Reinicialização pendente',
    why: 'Atualizações já instaladas esperam um reinício para valer.',
    act: { label: 'Ver segurança', kind: 'go', arg: 'seguranca' },
  });
  const restoreAge = daysSince(String(d.security.lastRestore ?? '').split(' ')[0]);
  if (restoreAge !== null && restoreAge > 30) push({
    id: 'restauracao', level: 2, page: 'seguranca', risk: 'seguro',
    title: 'Último ponto de restauração é antigo',
    why: `Criado há ${restoreAge} dias. Crie um novo antes de instalar drivers ou fazer reparos.`,
    act: { label: 'Criar ponto agora', kind: 'action', arg: 'restore' },
  });

  /* Arquivo do SCANNY: passou do limite de espaço */
  const archUsed = (S.archive || []).reduce((a, x) => a + (x.size || 0), 0);
  if (archUsed > S.settings.archiveLimit) push({
    id: 'arquivo-limite', level: 1, page: 'arquivo', risk: 'seguro',
    title: `Arquivo do SCANNY com ${gb(archUsed)}, acima do limite de ${S.settings.archiveLimit} GB`,
    why: 'Remova cópias que você não precisa mais ou aumente o limite. O SCANNY não apaga nada sozinho.',
    act: { label: 'Ver arquivo', kind: 'go', arg: 'arquivo' },
  });

  /* Arquivo do SCANNY: cópias antigas que são a única cópia do arquivo */
  const oldOnly = (S.archive || []).filter((x) => x.status === 'so-scanny' && (daysSince(x.archivedAt.split(' ')[0]) ?? 0) > 90);
  if (oldOnly.length) push({
    id: 'arquivo-antigo', level: 2, page: 'arquivo', risk: 'baixo',
    title: `${oldOnly.length} ${oldOnly.length === 1 ? 'cópia antiga é' : 'cópias antigas são'} a única cópia`,
    why: `Guardadas há mais de 90 dias. Ex.: ${oldOnly[0].name}. O original já saiu do Windows, então confira antes de remover.`,
    act: { label: 'Revisar arquivo', kind: 'go', arg: 'arquivo' },
  });

  return out.sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
}

/* Executa a ação de uma recomendação. Usado por ACTIONS.rec em app.js. */
function runRecommendation(S, id) {
  const r = recommendations(S).find((x) => x.id === id);
  if (!r) return null;
  return r;
}
