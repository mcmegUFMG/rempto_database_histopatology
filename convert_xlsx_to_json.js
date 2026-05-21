const fs = require('fs');
const xlsx = require('xlsx');
const input = process.argv[2] || 'Cópia de ovario_base_com_dicionario.xlsx';
const output = process.argv[3] || 'data.json';
const headerRowArg = Number(process.argv[4] || 7); // 1-based row number to use as header
const wb = xlsx.readFile(input);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
const headerIndex = headerRowArg - 1;
const headers = rows[headerIndex].map(h => String(h).trim()).map((h, idx) => h || `Column_${idx+1}`);
const dataRows = rows.slice(headerIndex + 1).filter(row => row.some(cell => String(cell).trim() !== ''));
const data = dataRows.map(row => {
  const item = {};
  headers.forEach((header, idx) => {
    item[header] = row[idx] !== undefined ? row[idx] : '';
  });
  return item;
});
fs.writeFileSync(output, JSON.stringify(data, null, 2), 'utf8');
console.log(`Escreveu ${data.length} registros em ${output} usando cabeçalho na linha ${headerRowArg}`);
