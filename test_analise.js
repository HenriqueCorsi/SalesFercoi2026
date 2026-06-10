// Script temporário de validação da função Store.analise (será removido)
const fs = require('fs');
const path = require('path');

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const orders = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'orders.json'), 'utf8'));

function competencia(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  let year = y;
  let month = m - 1;
  if (d >= 26) { month += 1; if (month > 11) { month = 0; year += 1; } }
  return { year, month };
}

function analise({ year, empresa, months }) {
  const rows = orders.filter(o => {
    const c = competencia(o.data);
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
    const key = empresa ? competencia(o.data).month : o.empresa;
    const cur = map.get(key) || { valor: 0, comissaoValor: 0, peso: 0, count: 0 };
    cur.valor += o.valor || 0;
    cur.comissaoValor += o.comissaoValor || 0;
    cur.peso += o.peso || 0;
    cur.count += 1;
    map.set(key, cur);
  });

  let breakdown;
  if (empresa) {
    breakdown = Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([month, t]) => ({ label: MONTH_NAMES[month], ...t }));
  } else {
    breakdown = Array.from(map.entries()).map(([emp, t]) => ({ label: emp, ...t })).sort((a, b) => b.valor - a.valor);
  }

  return { totals, breakdown };
}

// Teste 1: quanto a "Heating Cooling Tecnologia" comprou (peso) em Março/2026
let r = analise({ year: 2026, empresa: 'Heating Cooling Tecnologia', months: new Set([2]) });
console.log('--- Heating Cooling Tecnologia, Março/2026 ---');
console.log('Totais:', r.totals);
console.log('Detalhe:', r.breakdown);

// Teste 2: comissão da "HCI Hidraulica Conexoes Industriais" em Abril+Maio/2026
r = analise({ year: 2026, empresa: 'HCI Hidraulica Conexoes Industriais', months: new Set([3, 4]) });
console.log('\n--- HCI, Abril+Maio/2026 ---');
console.log('Totais:', r.totals);
console.log('Detalhe:', r.breakdown);

// Teste 3: todas empresas, ano todo
r = analise({ year: 2026, empresa: '', months: new Set() });
console.log('\n--- Todas empresas, 2026 ---');
console.log('Totais:', r.totals);
console.log('Top 3:', r.breakdown.slice(0, 3));
