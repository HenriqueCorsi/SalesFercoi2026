/* ============================================================
   pedidos.js
   View "Pedidos": tabela com busca/filtro/ordenação e CRUD
   (criar, editar, excluir) com modal de formulário.
   ============================================================ */

const Pedidos = {
  sortKey: 'data',
  sortDir: 'desc',

  init() {
    document.getElementById('btnNovoPedido').onclick = () => this.openModal(null);
    document.getElementById('btnCancelPedido').onclick = () => this.closeModal();
    document.getElementById('pedidoForm').onsubmit = (e) => this.handleSubmit(e);
    document.getElementById('searchInput').oninput = () => this.render();
    document.getElementById('btnSalvarGithub').onclick = () => this.handleSaveGithub();

    document.querySelectorAll('#pedidosTable th[data-sort]').forEach(th => {
      th.onclick = () => {
        const key = th.dataset.sort;
        if (this.sortKey === key) {
          this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortKey = key;
          this.sortDir = 'asc';
        }
        this.render();
      };
    });

    // Recalcula a comissão prevista ao digitar valor / %
    ['f_valor', 'f_comissaoPct'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => this.updateCommissionPreview());
    });

    this.populateFilters();
    this.render();
  },

  populateFilters() {
    const filterMonth = document.getElementById('filterMonth');
    const filterEmpresa = document.getElementById('filterEmpresa');
    const empresaList = document.getElementById('empresaList');

    // Meses de competência presentes nos dados
    const keys = new Set();
    Store.orders.forEach(o => {
      const c = Store.competencia(o.data);
      if (c) keys.add(`${c.year}-${String(c.month + 1).padStart(2, '0')}`);
    });
    const sortedKeys = Array.from(keys).sort();
    filterMonth.innerHTML = `<option value="">Todas as competências</option>` +
      sortedKeys.map(k => {
        const [y, m] = k.split('-');
        return `<option value="${k}">${MONTH_NAMES[parseInt(m, 10) - 1]}/${y}</option>`;
      }).join('');

    const empresas = Store.availableEmpresas();
    filterEmpresa.innerHTML = `<option value="">Todas as empresas</option>` +
      empresas.map(e => `<option value="${e}">${e}</option>`).join('');

    empresaList.innerHTML = empresas.map(e => `<option value="${e}">`).join('');

    filterMonth.onchange = () => this.render();
    filterEmpresa.onchange = () => this.render();
  },

  filteredOrders() {
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const month = document.getElementById('filterMonth').value;
    const empresa = document.getElementById('filterEmpresa').value;

    let rows = Store.orders.slice();

    if (month) {
      rows = rows.filter(o => Store.competenciaKey(o.data) === month);
    }
    if (empresa) {
      rows = rows.filter(o => o.empresa === empresa);
    }
    if (search) {
      rows = rows.filter(o =>
        (o.empresa || '').toLowerCase().includes(search) ||
        String(o.pedido || '').includes(search) ||
        String(o.nf || '').includes(search)
      );
    }

    rows.sort((a, b) => {
      let av, bv;
      if (this.sortKey === 'competencia') {
        av = Store.competenciaKey(a.data);
        bv = Store.competenciaKey(b.data);
      } else {
        av = a[this.sortKey];
        bv = b[this.sortKey];
      }
      if (av === undefined || av === null) av = '';
      if (bv === undefined || bv === null) bv = '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return this.sortDir === 'asc' ? -1 : 1;
      if (av > bv) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  },

  render() {
    const rows = this.filteredOrders();
    const tbody = document.getElementById('pedidosTbody');

    tbody.innerHTML = rows.map(o => `
      <tr data-id="${o.id}">
        <td>${fmtDate(o.data)}</td>
        <td>${o.pedido ?? ''}</td>
        <td class="num">${fmtBRL(o.valor)}</td>
        <td class="num">${fmtPct(o.comissaoPct)}</td>
        <td class="num">${o.nf ?? ''}</td>
        <td>${o.empresa ?? ''}</td>
        <td class="num">${o.peso != null ? fmtNum(o.peso) : ''}</td>
        <td class="num">${fmtBRL(o.comissaoValor)}</td>
        <td>
          <div class="row-actions">
            <button title="Editar" data-action="edit" data-id="${o.id}">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            </button>
            <button title="Excluir" data-action="delete" data-id="${o.id}">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => {
      btn.onclick = () => this.openModal(parseInt(btn.dataset.id, 10));
    });
    tbody.querySelectorAll('button[data-action="delete"]').forEach(btn => {
      btn.onclick = () => this.handleDelete(parseInt(btn.dataset.id, 10));
    });

    const totalValor = rows.reduce((a, o) => a + (o.valor || 0), 0);
    const totalComissao = rows.reduce((a, o) => a + (o.comissaoValor || 0), 0);
    document.getElementById('tableSummary').textContent =
      `${rows.length} pedido(s) · Faturamento: ${fmtBRL(totalValor)} · Comissão: ${fmtBRL(totalComissao)}`;

    // Atualiza indicadores de ordenação
    document.querySelectorAll('#pedidosTable th[data-sort]').forEach(th => {
      th.classList.toggle('sorted', th.dataset.sort === this.sortKey);
    });
  },

  updateCommissionPreview() {
    const valor = parseFloat(document.getElementById('f_valor').value) || 0;
    const pct = parseFloat(document.getElementById('f_comissaoPct').value) || 0;
    document.getElementById('f_comissaoPreview').value = fmtBRL(valor * pct);
  },

  openModal(id) {
    const isEdit = id !== null;
    document.getElementById('pedidoModalTitle').textContent = isEdit ? 'Editar pedido' : 'Novo pedido';
    const form = document.getElementById('pedidoForm');
    form.reset();

    if (isEdit) {
      const o = Store.orders.find(x => x.id === id);
      document.getElementById('f_id').value = o.id;
      document.getElementById('f_data').value = o.data || '';
      document.getElementById('f_empresa').value = o.empresa || '';
      document.getElementById('f_pedido').value = o.pedido ?? '';
      document.getElementById('f_nf').value = o.nf ?? '';
      document.getElementById('f_valor').value = o.valor ?? '';
      document.getElementById('f_peso').value = o.peso ?? '';
      document.getElementById('f_comissaoPct').value = o.comissaoPct ?? 0.0075;
    } else {
      document.getElementById('f_id').value = '';
      document.getElementById('f_comissaoPct').value = 0.0075;
      document.getElementById('f_data').value = new Date().toISOString().slice(0, 10);
    }
    this.updateCommissionPreview();
    document.getElementById('pedidoModalOverlay').classList.add('active');
  },

  closeModal() {
    document.getElementById('pedidoModalOverlay').classList.remove('active');
  },

  handleSubmit(e) {
    e.preventDefault();
    const idStr = document.getElementById('f_id').value;
    const valor = parseFloat(document.getElementById('f_valor').value) || 0;
    const comissaoPct = parseFloat(document.getElementById('f_comissaoPct').value) || 0;

    const order = {
      id: idStr ? parseInt(idStr, 10) : null,
      data: document.getElementById('f_data').value,
      empresa: document.getElementById('f_empresa').value.trim(),
      pedido: parseInt(document.getElementById('f_pedido').value, 10) || null,
      nf: document.getElementById('f_nf').value ? parseInt(document.getElementById('f_nf').value, 10) : null,
      valor: valor,
      peso: document.getElementById('f_peso').value ? parseFloat(document.getElementById('f_peso').value) : null,
      comissaoPct: comissaoPct,
      comissaoValor: Math.round(valor * comissaoPct * 100) / 100
    };

    Store.upsert(order);
    this.closeModal();
    this.populateFilters();
    this.render();
    Charts.renderAll();
    Analise.refreshFilters();
    Main.markDirty();
  },

  handleDelete(id) {
    const order = Store.orders.find(o => o.id === id);
    if (!order) return;
    if (!confirm(`Excluir o pedido nº ${order.pedido} (${order.empresa})?`)) return;

    Store.remove(id);
    this.populateFilters();
    this.render();
    Charts.renderAll();
    Analise.refreshFilters();
    Main.markDirty();
  },

  async handleSaveGithub() {
    const btn = document.getElementById('btnSalvarGithub');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Salvando…';
    try {
      await Store.save();
      Main.setSyncStatus('ok', 'Sincronizado com o GitHub');
      Main.toast('Alterações salvas no GitHub com sucesso.');
    } catch (err) {
      Main.setSyncStatus('error', 'Falha ao salvar');
      Main.toast(err.message || 'Erro ao salvar no GitHub.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }
};
