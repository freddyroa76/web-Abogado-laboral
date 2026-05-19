// Script temporal para leer ISP.xlsx y volcar su contenido
const fs = require('fs');
const path = require('path');

// Intentar cargar xlsx
let XLSX;
try {
  XLSX = require('xlsx');
} catch(e) {
  // Si no está instalado, usar la copia local
  const xlsxPath = path.join(__dirname, '..', 'node_modules', 'xlsx');
  if (fs.existsSync(xlsxPath)) {
    XLSX = require(xlsxPath);
  } else {
    console.log("xlsx module not available, trying to read raw file...");
    process.exit(1);
  }
}

const filePath = path.join(__dirname, 'ISP.xlsx');
const wb = XLSX.readFile(filePath);

console.log("=== HOJAS ===");
console.log(wb.SheetNames);

wb.SheetNames.forEach(name => {
  console.log(`\n=== HOJA: ${name} ===`);
  const ws = wb.Sheets[name];
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  // Print first 60 rows
  json.slice(0, 60).forEach((row, i) => {
    const vals = row.map(v => typeof v === 'number' ? v : String(v).substring(0, 30));
    console.log(`R${i+1}: ${JSON.stringify(vals)}`);
  });
  if (json.length > 60) console.log(`... (${json.length - 60} more rows)`);
});
