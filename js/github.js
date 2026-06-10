/* ============================================================
   github.js
   Wrapper fino sobre a Contents API do GitHub para ler e gravar
   o arquivo de dados (data/orders.json) diretamente no repositório.
   ============================================================ */

const GitHubAPI = {

  /**
   * Busca o conteúdo + sha atual do arquivo de dados.
   * Usa a API do GitHub (sempre a versão mais recente, sem cache da CDN do Pages)
   * quando há token configurado; caso contrário, cai para o arquivo estático
   * publicado pelo GitHub Pages (somente leitura).
   */
  async fetchData() {
    const cfg = Config.get();

    if (cfg && cfg.owner && cfg.repo && cfg.path) {
      try {
        const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}` +
                     (cfg.branch ? `?ref=${encodeURIComponent(cfg.branch)}` : '');
        const headers = { 'Accept': 'application/vnd.github+json' };
        if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;

        const res = await fetch(url, { headers, cache: 'no-store' });
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        const json = await res.json();
        const content = decodeBase64Utf8(json.content);
        return {
          orders: JSON.parse(content),
          sha: json.sha,
          source: 'github'
        };
      } catch (err) {
        console.warn('Falha ao buscar via API do GitHub, usando arquivo local:', err);
      }
    }

    // Fallback: arquivo estático servido pelo GitHub Pages / disco local
    const res = await fetch(`data/orders.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Não foi possível carregar data/orders.json');
    const orders = await res.json();
    return { orders, sha: null, source: 'local' };
  },

  /**
   * Grava a lista de pedidos de volta no repositório via Contents API.
   * Requer token configurado com permissão de escrita (Contents: read & write).
   */
  async saveData(orders, sha, message) {
    const cfg = Config.get();
    if (!cfg || !cfg.token || !cfg.owner || !cfg.repo || !cfg.path) {
      throw new Error('Configuração do GitHub incompleta. Abra "Sincronização" e preencha owner, repo e token.');
    }

    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
    const body = {
      message: message || `Atualiza pedidos (${new Date().toISOString()})`,
      content: encodeBase64Utf8(JSON.stringify(orders, null, 2)),
      branch: cfg.branch || 'main'
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${cfg.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (res.status === 409 || res.status === 422) {
        throw new Error('Conflito: o arquivo foi alterado por outro perfil. Recarregue a página e tente novamente.');
      }
      throw new Error(`Erro ao salvar no GitHub (${res.status}): ${errBody.message || 'desconhecido'}`);
    }

    const json = await res.json();
    return json.content.sha;
  }
};

function decodeBase64Utf8(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

function encodeBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}
