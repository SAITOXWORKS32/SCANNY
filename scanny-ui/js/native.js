/* SCANNY native bridge: Tauri v2 when packaged, safe fallback in browser. */
window.SCANNY_NATIVE = {
  available: Boolean(window.__TAURI__?.core?.invoke),
  invoke(command, args) {
    if (!this.available) return Promise.reject(new Error('SCANNY está rodando no navegador; funções nativas indisponíveis.'));
    return window.__TAURI__.core.invoke(command, args || {});
  },
  async info() { return this.invoke('system_info'); },
  async analyzeCleanup() { return this.invoke('analyze_cleanup'); },
  async cleanPaths(paths) { return this.invoke('clean_paths', { paths }); },
  async visualProfile(profile) { return this.invoke('apply_visual_profile', { profile }); },
  async restorePoint() { return this.invoke('create_restore_point'); },
  async repair(id) { return this.invoke('run_repair', { id }); },
};
