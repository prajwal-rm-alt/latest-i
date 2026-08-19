const fs = require('fs');
let content = fs.readFileSync('services/reportService.ts', 'utf8');

const targetContent = '  text += `MTD Sale Value = ${mtdValue.toLocaleString()}`;';
const replacementContent = `  text += \`MTD Sale Value = \${mtdValue.toLocaleString()}\`;
  
  if (report.notes) {
    text += \`\\n\\nNotes:\\n\${report.notes}\`;
  }`;

content = content.replace(targetContent, replacementContent);
fs.writeFileSync('services/reportService.ts', content);
