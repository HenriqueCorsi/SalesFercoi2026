/* ============================================================
   config.js
   Local (per-browser) configuration: theme + GitHub sync settings.
   Nada aqui é compartilhado entre perfis — cada perfil/computador
   guarda sua própria configuração no localStorage.
   ============================================================ */

const CONFIG_KEY = 'fercoi_github_config';
const THEME_KEY = 'fercoi_theme';

const Config = {
  /** @returns {{owner:string, repo:string, branch:string, path:string, token:string}|null} */
  get() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  set(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  },

  clearToken() {
    const cfg = this.get();
    if (cfg) {
      delete cfg.token;
      this.set(cfg);
    }
  },

  hasToken() {
    const cfg = this.get();
    return !!(cfg && cfg.token);
  },

  isConfigured() {
    const cfg = this.get();
    return !!(cfg && cfg.owner && cfg.repo && cfg.path);
  },

  // ---- Theme ----
  getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
  },

  setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.getTheme());
  },

  toggleTheme() {
    const next = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    return next;
  }
};
