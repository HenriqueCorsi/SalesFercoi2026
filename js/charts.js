/* ============================================================
   charts.js
   Renderização dos gráficos do Dashboard com Chart.js.
   Paleta minimalista, adaptada ao tema claro/escuro.
   ============================================================ */

const Charts = {
  monthlyChart: null,
  companyChart: null,
  currentMetric: 'valor', // 'valor' | 'comissaoValor'

  /* Paleta minimalista para empresas (rotação de matizes suaves) */
  palette(n) {
    const colors = [];
    for (let i = 0; i < n; i++) {
      const hue = Math.round((i * 360) / Math.max(n, 1));
      colors.push(`hsl(${hue}, 55%, 58%)`);
    }
    return colors;
  },

  themeColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      grid: styles.getPropertyValue('--chart-grid').trim(),
      text: styles.getPropertyValue('--chart-text').trim(),
      accent: styles.getPropertyValue('--accent').trim(),
      accentSoft: styles.getPropertyValue('--accent-soft').trim(),
      text2: styles.getPropertyValue('--text-muted').trim()
    };
  },

  initSelectors() {
    const yearSelect = document.getElementById('yearSelect');
    const monthSelect = document.getElementById('monthSelect');

    const years = Store.availableYears();
    const currentYear = new Date().getFullYear();
    if (years.length === 0) years.push(currentYear);

    yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    yearSelect.value = years.includes(currentYear) ? currentYear : years[years.length - 1];

    this.populateMonthSelect(parseInt(yearSelect.value, 10));

    yearSelect.onchange = () => {
      this.populateMonthSelect(parseInt(yearSelect.value, 10));
      this.renderAll();
    };
    monthSelect.onchange = () => this.renderCompanyChart();

    document.getElementById('metricToggle').querySelectorAll('.toggle-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#metricToggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMetric = btn.dataset.metric;
        this.renderCompanyChart();
      };
    });
  },

  populateMonthSelect(year) {
    const monthSelect = document.getElementById('monthSelect');
    const today = new Date();
    const defaultKey = Store.competenciaKey(today.toISOString().slice(0, 10));

    monthSelect.innerHTML = MONTH_NAMES.map((name, idx) => {
      const key = `${year}-${String(idx + 1).padStart(2, '0')}`;
      return `<option value="${idx}" ${key === defaultKey ? 'selected' : ''}>${name}</option>`;
    }).join('');

    if (!monthSelect.value) monthSelect.value = '0';
  },

  renderAll() {
    this.renderKpis();
    this.renderMonthlyChart();
    this.renderCompanyChart();
  },

  renderKpis() {
    const year = parseInt(document.getElementById('yearSelect').value, 10);
    const totals = Store.yearTotals(year);
    document.getElementById('kpiFaturamentoAno').textContent = fmtBRL(totals.valor);
    document.getElementById('kpiComissaoAno').textContent = fmtBRL(totals.comissaoValor);
    document.getElementById('kpiPedidosAno').textContent = totals.count.toLocaleString('pt-BR');
    document.getElementById('kpiTicketMedio').textContent = fmtBRL(totals.count ? totals.valor / totals.count : 0);
  },

  renderMonthlyChart() {
    const year = parseInt(document.getElementById('yearSelect').value, 10);
    const totals = Store.monthlyTotals(year);
    const colors = this.themeColors();

    const data = {
      labels: MONTH_NAMES.map(m => m.slice(0, 3)),
      datasets: [
        {
          label: 'Faturamento',
          data: totals.map(t => t.valor),
          backgroundColor: colors.accent,
          borderRadius: 4,
          maxBarThickness: 28,
          yAxisID: 'y'
        },
        {
          label: 'Comissão',
          data: totals.map(t => t.comissaoValor),
          backgroundColor: colors.text2,
          borderRadius: 4,
          maxBarThickness: 28,
          yAxisID: 'y1'
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { color: colors.text, boxWidth: 10, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtBRL(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: colors.text } },
        y: {
          position: 'left',
          grid: { color: colors.grid },
          ticks: { color: colors.text, callback: (v) => 'R$ ' + (v / 1000) + 'k' }
        },
        y1: {
          position: 'right',
          grid: { display: false },
          ticks: { color: colors.text, callback: (v) => 'R$ ' + v }
        }
      }
    };

    if (this.monthlyChart) {
      this.monthlyChart.data = data;
      this.monthlyChart.options = options;
      this.monthlyChart.update();
    } else {
      this.monthlyChart = new Chart(document.getElementById('monthlyChart'), {
        type: 'bar',
        data,
        options
      });
    }
  },

  renderCompanyChart() {
    const year = parseInt(document.getElementById('yearSelect').value, 10);
    const month = parseInt(document.getElementById('monthSelect').value, 10);
    const rows = Store.companyTotals(year, month);
    const metric = this.currentMetric;
    const colors = this.themeColors();

    const labels = rows.map(r => r.empresa);
    const values = rows.map(r => r[metric]);
    const palette = this.palette(rows.length || 1);

    const data = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette,
        borderWidth: 0
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = values.reduce((a, b) => a + b, 0);
              const pct = total ? (ctx.parsed / total * 100).toFixed(1) : 0;
              return `${ctx.label}: ${fmtBRL(ctx.parsed)} (${pct}%)`;
            }
          }
        }
      }
    };

    if (this.companyChart) {
      this.companyChart.data = data;
      this.companyChart.options = options;
      this.companyChart.update();
    } else {
      this.companyChart = new Chart(document.getElementById('companyChart'), {
        type: 'doughnut',
        data,
        options
      });
    }

    this.renderCompanyLegend(rows, palette, metric);
  },

  renderCompanyLegend(rows, palette, metric) {
    const el = document.getElementById('companyLegend');
    if (rows.length === 0) {
      el.innerHTML = `<div class="legend-row">Sem dados para este mês.</div>`;
      return;
    }
    const total = rows.reduce((a, r) => a + r[metric], 0);
    el.innerHTML = rows.map((r, i) => {
      const pct = total ? (r[metric] / total * 100).toFixed(1) : '0.0';
      return `
        <div class="legend-row">
          <span class="legend-swatch" style="background:${palette[i]}"></span>
          <span class="legend-name" title="${r.empresa}">${r.empresa}</span>
          <span class="legend-value">${pct}%</span>
        </div>`;
    }).join('');
  },

  refreshTheme() {
    if (this.monthlyChart) this.renderMonthlyChart();
    if (this.companyChart) this.renderCompanyChart();
  }
};
