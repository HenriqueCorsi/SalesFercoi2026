/* ============================================================
   store.js
   Estado em memória dos pedidos + lógica de "mês de competência".

   Regra de competência (definida pelo usuário):
   Vendas realizadas de 26 do mês anterior até 25 do mês corrente
   pertencem à competência do mês corrente.
   Ex: venda em 26/03 a 25/04 -> competência ABRIL.
   ============================================================ */

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const Store = {
  orders: [],
  sha: null,
  source: null,
  dirty: false,

  async load() {
    const { orders, sha, source } = await GitHubAPI.fetchData();
    this.orders = orders;
    this.sha = sha;
    this.source = source;
    this.dirty = false;
    return this.orders;
  },

  async save() {
    const newSha = await GitHubAPI.saveData(this.orders, this.sha,
      `Atualiza pedidos via dashboard (${new Date().toLocaleString('pt-BR')})`);
    this.sha = newSha;
    this.dirty = false;
  },

  nextId() {
    return this.orders.reduce((max, o) => Math.max(max, o.id || 0), 0) + 1;
  },

  upsert(order) {
    const idx = this.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      this.orders[idx] = order;
    } else {
      order.id = this.nextId();
      this.orders.push(order);
    }
    this.dirty = true;
    return order;
  },

  remove(id) {
    this.orders = this.orders.filter(o => o.id !== id);
    this.dirty = true;
  },

  /**
   * Calcula a competência (mês/ano) de uma data no formato YYYY-MM-DD,
   * aplicando a regra do dia 26 ao 25.
   * Retorna { year, month } com month 0-indexado (0 = Janeiro).
   */
  competencia(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    let year = y;
    let month = m - 1; // 0-indexed
    if (d >= 26) {
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
    return { year, month };
  },

  competenciaLabel(dateStr) {
    const c = this.competencia(dateStr);
    if (!c) return '';
    return `${MONTH_NAMES[c.month]}/${c.year}`;
  },

  competenciaKey(dateStr) {
    const c = this.competencia(dateStr);
    if (!c) return '';
    return `${c.year}-${String(c.month + 1).padStart(2, '0')}`;
  },

  /** Lista de anos de competência presentes nos dados, ordenada. */
  availableYears() {
    const years = new Set();
    this.orders.forEach(o => {
      const c = this.competencia(o.data);
      if (c) years.add(c.year);
    });
    return Array.from(years).sort();
  },

  /** Lista de empresas únicas, ordenada. */
  availableEmpresas() {
    const set = new Set();
    this.orders.forEach(o => { if (o.empresa) set.add(o.empresa); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },

  /** Totais (faturamento e comissão) por mês para um determinado ano. */
  monthlyTotals(year) {
    const totals = Array.from({ length: 12 }, () => ({ valor: 0, comissaoValor: 0, count: 0 }));
    this.orders.forEach(o => {
      const c = this.competencia(o.data);
      if (!c || c.year !== year) return;
      totals[c.month].valor += o.valor || 0;
      totals[c.month].comissaoValor += o.comissaoValor || 0;
      totals[c.month].count += 1;
    });
    return totals;
  },

  /** Totais por empresa para uma competência (year, month 0-indexed). */
  companyTotals(year, month) {
    const map = new Map();
    this.orders.forEach(o => {
      const c = this.competencia(o.data);
      if (!c || c.year !== year || c.month !== month) return;
      const cur = map.get(o.empresa) || { valor: 0, comissaoValor: 0 };
      cur.valor += o.valor || 0;
      cur.comissaoValor += o.comissaoValor || 0;
      map.set(o.empresa, cur);
    });
    return Array.from(map.entries())
      .map(([empresa, totals]) => ({ empresa, ...totals }))
      .sort((a, b) => b.valor - a.valor);
  },

  /**
   * Análise customizada: filtra pedidos por ano, meses de competência
   * (conjunto de índices 0-11) e, opcionalmente, por empresa.
   * Retorna totais gerais e um detalhamento:
   *  - se uma empresa específica for informada, detalha por mês;
   *  - se nenhuma empresa for informada ("Todas"), detalha por empresa.
   */
  analise({ year, empresa, months }) {
    const rows = this.orders.filter(o => {
      const c = this.competencia(o.data);
      if (!c || c.year !== year) return false;
      if (months && months.size > 0 && !months.has(c.month)) return false;
      if (empresa && o.empresa !== empresa) return false;
      return true;
    });

    const totals = rows.reduce((acc, o) => {
      acc.valor += o.valor || 0;
      acc.comissaoValor += o.comissaoValor || 0;
      acc.peso += o.peso || 0;
      acc.count += 1;
      return acc;
    }, { valor: 0, comissaoValor: 0, peso: 0, count: 0 });

    const map = new Map();
    rows.forEach(o => {
      const key = empresa ? this.competencia(o.data).month : o.empresa;
      const cur = map.get(key) || { valor: 0, comissaoValor: 0, peso: 0, count: 0 };
      cur.valor += o.valor || 0;
      cur.comissaoValor += o.comissaoValor || 0;
      cur.peso += o.peso || 0;
      cur.count += 1;
      map.set(key, cur);
    });

    let breakdown;
    if (empresa) {
      breakdown = Array.from(map.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([month, t]) => ({ label: MONTH_NAMES[month], ...t }));
    } else {
      breakdown = Array.from(map.entries())
        .map(([emp, t]) => ({ label: emp, ...t }))
        .sort((a, b) => b.valor - a.valor);
    }

    return { totals, breakdown };
  },

  /** Totais (ano completo). */
  yearTotals(year) {
    let valor = 0, comissaoValor = 0, count = 0;
    this.orders.forEach(o => {
      const c = this.competencia(o.data);
      if (!c || c.year !== year) return;
      valor += o.valor || 0;
      comissaoValor += o.comissaoValor || 0;
      count += 1;
    });
    return { valor, comissaoValor, count };
  }
};

/* ===== Helpers de formatação ===== */
const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (v, dec = 2) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtPct = (v) => `${((v || 0) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};
