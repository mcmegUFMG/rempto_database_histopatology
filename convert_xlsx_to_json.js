const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const [,, inputPath, outputPath = 'data.json'] = process.argv;
if (!inputPath) {
  console.error('Usage: node convert_xlsx_to_json.js <input.xlsx> [output.json]');
  process.exit(1);
}

const resolvedInput = path.resolve(inputPath);
const resolvedOutput = path.resolve(outputPath);
if (!fs.existsSync(resolvedInput)) {
  console.error(`Input not found: ${resolvedInput}`);
  process.exit(1);
}

const workbook = xlsx.readFile(resolvedInput, { cellDates: true });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: true, raw: false, dateNF: 'yyyy-mm-dd' });

const isHeaderRow = row => {
  if (!Array.isArray(row)) return false;
  const normalized = row.map(cell => (cell === null || cell === undefined ? '' : String(cell).trim().toLowerCase()));
  const headerTokens = [
    'patient id',
    'identificador paciente',
    'file name',
    'nome arquivo',
    'idade',
    'dia',
    'diagnóstico',
    'diagnostico',
    'idade da paciente',
    'data do óbito',
    'data do obito',
    'tumor stage',
    'estadio',
    'estágio',
    'hcg'
  ];
  return normalized.some(value => headerTokens.some(token => value.includes(token)));
};

const headerRowIndex = rows.findIndex(row => {
  if (!Array.isArray(row)) return false;
  const normalized = row.map(cell => (cell === null || cell === undefined ? '' : String(cell).trim().toLowerCase()));
  return normalized.includes('patient id') || normalized.includes('identificador paciente');
});

if (headerRowIndex === -1) {
  console.error('Header row not found in spreadsheet.');
  process.exit(1);
}

let dataRows = rows.slice(headerRowIndex + 1);
while (dataRows.length && isHeaderRow(dataRows[0])) {
  dataRows = dataRows.slice(1);
}

const headers = rows[headerRowIndex].map(value => (value === null || value === undefined ? '' : String(value).trim()));
const data = dataRows
  .filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
  .map(row => {
    const item = {};
    headers.forEach((header, colIndex) => {
      if (!header) return;
      let value = row[colIndex];
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      }
      if (typeof value === 'string') {
        value = value.trim();
        if (value === '') value = null;
      }
      item[header] = value;
    });
    return item;
  });

fs.writeFileSync(resolvedOutput, JSON.stringify(data, null, 2), 'utf8');
console.log(`Converted ${resolvedInput} -> ${resolvedOutput} (${data.length} records)`);
