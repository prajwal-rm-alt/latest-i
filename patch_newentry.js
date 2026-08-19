const fs = require('fs');
let file = fs.readFileSync('components/NewEntry.tsx', 'utf8');

const replacement = `import { saveSaleEntry, compressImage } from '../services/storageService';
import { generateTextReport, formatToDisplayDate } from '../services/reportService';
import { BAJAJ_PRODUCTS, MR_PRODUCTS } from '../services/excelExportService';

const PRODUCT_LIST = [...BAJAJ_PRODUCTS, ...MR_PRODUCTS].map(p => p.description);`;

file = file.replace(/import \{ saveSaleEntry.*?const PRODUCT_LIST = \[[^\]]*\];/s, replacement);
fs.writeFileSync('components/NewEntry.tsx', file);
