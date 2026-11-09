/* SCANNY — dados de exemplo do protótipo.
 * No app real, estes valores vêm da análise de somente leitura do Windows.
 * Enquanto "Dados de exemplo" estiver desligado (Configurações > Desenvolvimento),
 * a interface mostra "Não disponível" em vez de números inventados.
 */
window.SCANNY_SAMPLE = {
  os: { name: 'Windows 11 Pro', version: '23H2', arch: '64 bits', privileges: 'Usuário normal' },

  cpu: {
    name: 'AMD Ryzen 5 5600X',
    cores: 6,
    threads: 12,
    usage: 34,
    temp: 58,
    freq: '3,7 GHz',
    top: { name: 'Chrome', value: '18%' },
  },

  /* Placas de vídeo: a dedicada e a integrada (notebook híbrido). driverDate = data de instalação do driver. */
  gpu: [
    { name: 'NVIDIA GeForce RTX 3060', vendor: 'nvidia', vram: 12, driver: '551.23', driverDate: '10/2024', integrated: false },
    { name: 'Intel UHD Graphics 770', vendor: 'intel', vram: 0, driver: '31.0.101.5186', driverDate: '03/2026', integrated: true },
  ],

  ram: {
    total: 16,
    used: 11.2,
    speed: '3200 MHz',
    type: 'DDR4',
    sticks: 2,
    top: { name: 'Discord', value: '1,4 GB' },
  },

  disks: [
    { id: 'c', name: 'Disco C:', type: 'SSD', total: 512, used: 412 },
    { id: 'd', name: 'Disco D:', type: 'HDD', total: 1000, used: 640 },
  ],

  /* Limpeza. "safe" = entra na otimização segura por padrão. */
  cleanup: [
    { id: 'temp-user', name: 'Arquivos temporários do usuário', size: 1.8, risk: 'seguro', safe: true, note: 'Arquivos antigos em %TEMP% que não estão em uso.' },
    { id: 'temp-win', name: 'Arquivos temporários do Windows', size: 0.6, risk: 'seguro', safe: true, note: 'Só pastas conhecidas. Arquivos em uso são ignorados.' },
    { id: 'thumbs', name: 'Cache de miniaturas', size: 0.18, risk: 'seguro', safe: true, note: 'O Windows recria as miniaturas quando precisar.' },
    { id: 'error-reports', name: 'Relatórios de erro antigos', size: 0.12, risk: 'seguro', safe: true, note: 'Só relatórios antigos. Novos relatórios continuam sendo criados.' },
    { id: 'shaders', name: 'Cache de shaders', size: 0.35, risk: 'baixo', safe: false, note: 'Alguns jogos recriam o cache na próxima inicialização.' },
    { id: 'logs-old', name: 'Logs antigos', size: 0.05, risk: 'baixo', safe: false, note: 'Apenas logs antigos. Logs recentes de diagnóstico ficam de fora.' },
  ],

  recycle: { size: 1.2 },
  browserCache: { size: 0.8 },

  startup: [
    { id: 'onedrive', name: 'OneDrive', maker: 'Microsoft', path: 'C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe', type: 'Registro', impact: 'Médio', cls: 'baixo', changed: '12/10/2026', state: 'Ativo' },
    { id: 'discord', name: 'Discord', maker: 'Discord Inc.', path: 'C:\\Users\\Usuario\\AppData\\Local\\Discord\\Update.exe', type: 'Pasta de inicialização', impact: 'Alto', cls: 'baixo', changed: '03/09/2026', state: 'Ativo' },
    { id: 'spotify', name: 'Spotify', maker: 'Spotify AB', path: 'C:\\Users\\Usuario\\AppData\\Roaming\\Spotify\\Spotify.exe', type: 'Registro', impact: 'Médio', cls: 'baixo', changed: '20/08/2026', state: 'Ativo' },
    { id: 'steam', name: 'Steam', maker: 'Valve', path: 'C:\\Program Files (x86)\\Steam\\steam.exe', type: 'Registro', impact: 'Alto', cls: 'baixo', changed: '01/07/2026', state: 'Ativo' },
    { id: 'teams', name: 'Microsoft Teams', maker: 'Microsoft', path: 'C:\\Users\\Usuario\\AppData\\Local\\Microsoft\\Teams\\Update.exe', type: 'Registro', impact: 'Alto', cls: 'baixo', changed: '14/10/2026', state: 'Ativo' },
    { id: 'updater', name: 'UpdaterHelper', maker: 'Não identificado', path: 'C:\\Users\\Usuario\\AppData\\Local\\Temp\\upd_helper.exe', type: 'Tarefa agendada', impact: 'Baixo', cls: 'analisar', changed: '05/10/2026', state: 'Ativo' },
    { id: 'svc32', name: 'svc_helper32', maker: 'Sem fabricante', path: 'D:\\Apps\\svc_helper32.exe', type: 'Registro', impact: 'Baixo', cls: 'desconhecido', changed: '—', state: 'Ativo' },
    { id: 'defender', name: 'Notificação do Windows Defender', maker: 'Microsoft', path: 'C:\\Windows\\System32\\SecurityHealthSystray.exe', type: 'Registro', impact: 'Baixo', cls: 'essencial', changed: '—', state: 'Ativo' },
    { id: 'audio', name: 'Realtek Audio', maker: 'Realtek', path: 'C:\\Windows\\System32\\RtkAudUService64.exe', type: 'Serviço', impact: 'Baixo', cls: 'essencial', changed: '—', state: 'Ativo' },
    { id: 'touchpad', name: 'Driver de touchpad', maker: 'Synaptics', path: 'C:\\Program Files\\Synaptics\\SynTP.exe', type: 'Registro', impact: 'Baixo', cls: 'essencial', changed: '—', state: 'Ativo' },
  ],

  processes: [
    { pid: 4120, name: 'Chrome', cpu: 18, ram: 1.9, user: 'Usuario', system: false, protected: false, path: 'C:\\Program Files\\Google\\Chrome\\chrome.exe' },
    { pid: 5032, name: 'Discord', cpu: 6, ram: 1.4, user: 'Usuario', system: false, protected: false, path: 'C:\\Users\\Usuario\\AppData\\Local\\Discord\\app.exe' },
    { pid: 2216, name: 'Steam', cpu: 3, ram: 0.7, user: 'Usuario', system: false, protected: false, path: 'C:\\Program Files (x86)\\Steam\\steam.exe' },
    { pid: 812, name: 'csrss.exe', cpu: 1, ram: 0.02, user: 'SYSTEM', system: true, protected: true, path: 'C:\\Windows\\System32\\csrss.exe' },
    { pid: 904, name: 'services.exe', cpu: 0, ram: 0.03, user: 'SYSTEM', system: true, protected: true, path: 'C:\\Windows\\System32\\services.exe' },
    { pid: 1188, name: 'svchost.exe', cpu: 4, ram: 0.2, user: 'SYSTEM', system: true, protected: true, path: 'C:\\Windows\\System32\\svchost.exe' },
  ],

  games: [
    { name: 'Jogo de exemplo A', platform: 'Steam', size: 42.1, last: '27/10/2026' },
    { name: 'Jogo de exemplo B', platform: 'Epic', size: 18.6, last: '20/10/2026' },
  ],

  power: {
    current: 'Equilibrado',
    plans: ['Economia', 'Equilibrado', 'Alto desempenho', 'Melhor desempenho'],
    battery: 78,
    laptop: true,
  },

  security: {
    defender: 'Ativo',
    firewall: 'Ativo',
    update: 'Em dia',
    pendingReboot: false,
    lastRestore: '28/10/2026 09:15',
  },

  largeFiles: [
    { name: 'instalador_antigo.iso', path: 'D:\\Downloads\\instalador_antigo.iso', size: 4.2, date: '02/06/2026' },
    { name: 'backup_2024.zip', path: 'D:\\Arquivos\\backup_2024.zip', size: 2.9, date: '11/01/2025' },
    { name: 'videos_brutos.mp4', path: 'D:\\Projetos\\videos_brutos.mp4', size: 1.7, date: '17/09/2026' },
  ],

  repairs: [
    { id: 'sfc', name: 'Verificar arquivos do sistema (SFC)', cmd: 'sfc /scannow', desc: 'Verifica arquivos protegidos do Windows e tenta restaurar os danificados.', risk: 'medio', time: '10 a 20 min', restart: false },
    { id: 'dism', name: 'Reparar a imagem do Windows (DISM)', cmd: 'DISM /Online /Cleanup-Image /RestoreHealth', desc: 'Repara a imagem do Windows usada pelo SFC. Precisa de internet.', risk: 'medio', time: '15 a 40 min', restart: true },
    { id: 'dns', name: 'Limpar cache DNS', cmd: 'ipconfig /flushdns', desc: 'Apaga o cache de endereços de sites. Não altera configurações de rede.', risk: 'seguro', time: 'Segundos', restart: false },
    { id: 'wu', name: 'Reiniciar componentes do Windows Update', cmd: 'net stop wuauserv && net start wuauserv', desc: 'Reinicia o serviço de atualização. Não bloqueia atualizações.', risk: 'medio', time: '1 min', restart: false },
  ],
};
