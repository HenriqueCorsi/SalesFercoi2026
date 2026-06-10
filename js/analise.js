/* ============================================================
   analise.js
   View "Análise": permite cruzar Empresa x Mês(es) x Ano para
   responder perguntas como:
   - "Quantos kg a empresa X comprou em março?"
   - "Quanto foi a comissão com o cliente Y nos meses A, B e C?"
   ============================================================ */

const Analise = {
  selectedMonths: new Set(),

  init() {
    this.populateFilters();
    this.renderMonthsGrid();

    document.getElementById('anEmpresa').onchange = () => this.render();
    document.getElementById('anAno').onchange = () => this.render();
    document.getElementById('anMesesTodos').onclick = () => {
      this.selectedMonths = new Set(MONTH_NAMES.map((_, i) => i));
      this.renderMonthsGrid();
      this.render();
    };
    document.getElementById('anMesesNenhum').onclick = () => {
      this.selectedMonths.clear();
      this.renderMonthsGrid();
      this.render();
    };

    this.render();
  },

  populateFilters() {
    const anos = Store.availableYears();
    const currentYear = new Date().getFullYear();
    if (anos.length === 0) anos.push(currentYear);

    const anoSelect = document.getElementById('anAno');
    anoSelect.innerHTML = anos.map(y => `<option value="${y}">${y}</option>`).join('');
    anoSelect.value = anos.includes(currentYear) ? currentYear : anos[anos.length - 1];

    const empresaSelect = document.getElementById('anEmpresa');
    empresaSelect.innerHTML = `<option value="">Todas as empresas</option>` +
      Store.availableEmpresas().map(e => `<option value="${e}">${e}</option>`).join('');

    // Por padrão, considera todos os meses do ano selecionado.
    this.selectedMonths = new Set(MONTH_NAMES.map((_, i) => i));
  },

  refreshFilters() {
    this.populateFilters();
    this.renderMonthsGrid();
    this.render();
  },

  renderMonthsGrid() {
    const grid = document.getElementById('anMesesGrid');
    grid.innerHTML = MONTH_NAMES.map((name, i) => `
      <button class="toggle-btn month-btn ${this.selectedMonths.has(i) ? 'active' : ''}" data-month="${i}">${name.slice(0, 3)}</button>
    `).join('');

    grid.querySelectorAll('.month-btn').forEach(btn => {
      btn.onclick = () => {
        const m = parseInt(btn.dataset.month, 10);
        if (this.selectedMonths.has(m)) {
          this.selectedMonths.delete(m);
        } else {
          this.selectedMonths.add(m);
        }
        btn.classList.toggle('active');
        this.render();
      };
    });
  },

  render() {
    const year = parseInt(document.getElementById('anAno').value, 10);
    const empresa = document.getElementById('anEmpresa').value;

    const { totals, breakdown } = Store.analise({ year, empresa, months: this.selectedMonths });

    document.getElementById('anPedidos').textContent = totals.count.toLocaleString('pt-BR');
    document.getElementById('anPeso').textContent = `${fmtNum(totals.peso)} kg`;
    document.getElementById('anValor').textContent = fmtBRL(totals.valor);
    document.getElementById('anComissao').textContent = fmtBRL(totals.comissaoValor);

    const titleEl = document.getElementById('anBreakdownTitle');
    const head = document.getElementById('anTableHead');
    const body = document.getElementById('anTableBody');

    if (empresa) {
      titleEl.textContent = `Detalhamento por mês — ${empresa}`;
      head.innerHTML = `<th>Mês</th><th class="num">Pedidos</th><th class="num">Peso (Kg)</th><th class="num">Faturamento</th><th class="num">Comissão</th>`;
    } else {
      titleEl.textContent = 'Detalhamento por empresa';
      head.innerHTML = `<th>Empresa</th><th class="num">Pedidos</th><th class="num">Peso (Kg)</th><th class="num">Faturamento</th><th class="num">Comissão</th>`;
    }

    if (breakdown.length === 0) {
      body.innerHTML = `<tr><td colspan="5">Nenhum pedido encontrado para os filtros selecionados.</td></tr>`;
    } else {
      body.innerHTML = breakdown.map(r => `
        <tr>
          <td>${r.label}</td>
          <td class="num">${r.count}</td>
          <td class="num">${fmtNum(r.peso)}</td>
          <td class="num">${fmtBRL(r.valor)}</td>
          <td class="num">${fmtBRL(r.comissaoValor)}</td>
        </tr>
      `).join('');
    }
  }
};
