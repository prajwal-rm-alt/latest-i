const fs = require('fs');
let content = fs.readFileSync('services/excelExportService.ts', 'utf8');

const target = "  { category: 'OTG', rdArticle: '494343664', description: 'MR OTG 29 RCAP DIGI' },";
const replacement = "  { category: 'OTG', rdArticle: '494343664', description: 'MR OTG 29 RCAP DIGI' },\n  { category: 'OTG', rdArticle: 'N/A', description: 'MR OTG 60 RCSS B' },\n  { category: 'OTG', rdArticle: 'N/A', description: 'MR OTG 60L' },";

content = content.replace(target, replacement);
fs.writeFileSync('services/excelExportService.ts', content);
