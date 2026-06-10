/* ============================================================
   main.js
   Inicialização do app: navegação entre views, tema, modal de
   configurações de sincronização e carregamento inicial dos dados.
   ============================================================ */

const Main = {
  async init() {
    Config.applyTheme();
    this.bindNav();
    this.bindTheme();
    this.bindSettings();

    this.setSyncStatus('local', 'Carregando dados…');

    try {
      await Store.load();
      if (Store.source === 'github') {
        this.setSyncStatus('ok', 'Dados carregados do GitHub');
      } else {
        this.setSyncStatus('local', Config.isConfigured()
          ? 'Usando arquivo local (configure o token para sincronizar)'
          : 'Usando arquivo local — configure a sincronização');
      }
    } catch (err) {
      this.setSyncStatus('error', 'Erro ao carregar dados');
      this.toast(err.message || 'Erro ao carregar dados.');
    }

    Charts.initSelectors();
    Charts.renderAll();
    Pedidos.init();
    Analise.init();

    window.addEventListener('beforeunload', (e) => {
      if (Store.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const view = btn.dataset.view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${view}`).classList.add('active');

        const titles = { dashboard: 'Dashboard', pedidos: 'Pedidos', analise: 'Análise' };
        document.getElementById('viewTitle').textContent = titles[view] || view;
      });
    });
  },

  bindTheme() {
    document.getElementById('themeToggle').addEventListener('click', () => {
      Config.toggleTheme();
      Charts.refreshTheme();
    });
  },

  bindSettings() {
    const overlay = document.getElementById('settingsModalOverlay');
    const form = document.getElementById('settingsForm');

    document.getElementById('settingsBtn').addEventListener('click', () => {
      const cfg = Config.get() || {};
      document.getElementById('s_owner').value = cfg.owner || '';
      document.getElementById('s_repo').value = cfg.repo || '';
      document.getElementById('s_branch').value = cfg.branch || 'main';
      document.getElementById('s_path').value = cfg.path || 'data/orders.json';
      document.getElementById('s_token').value = cfg.token || '';
      overlay.classList.add('active');
    });

    document.getElementById('btnCancelSettings').addEventListener('click', () => {
      overlay.classList.remove('active');
    });

    document.getElementById('btnLimparToken').addEventListener('click', () => {
      Config.clearToken();
      document.getElementById('s_token').value = '';
      this.toast('Token removido deste navegador.');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cfg = {
        owner: document.getElementById('s_owner').value.trim(),
        repo: document.getElementById('s_repo').value.trim(),
        branch: document.getElementById('s_branch').value.trim() || 'main',
        path: document.getElementById('s_path').value.trim() || 'data/orders.json',
        token: document.getElementById('s_token').value.trim()
      };
      Config.set(cfg);
      overlay.classList.remove('active');
      this.toast('Configuração salva. Recarregando dados…');

      this.setSyncStatus('local', 'Carregando dados…');
      try {
        await Store.load();
        if (Store.source === 'github') {
          this.setSyncStatus('ok', 'Sincronizado com o GitHub');
        } else {
          this.setSyncStatus('local', 'Usando arquivo local');
        }
        Charts.initSelectors();
        Charts.renderAll();
        Pedidos.populateFilters();
        Pedidos.render();
        Analise.refreshFilters();
      } catch (err) {
        this.setSyncStatus('error', 'Erro ao carregar dados');
        this.toast(err.message || 'Erro ao carregar dados.');
      }
    });
  },

  markDirty() {
    if (Store.dirty) {
      this.setSyncStatus('local', 'Alterações não salvas — clique em "Salvar no GitHub"');
    }
  },

  setSyncStatus(state, text) {
    const dot = document.getElementById('syncDot');
    dot.className = `dot ${state}`;
    document.getElementById('syncText').textContent = text;
  },

  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => Main.init());
