const fs = require('fs');
let content = fs.readFileSync('services/reportService.ts', 'utf8');

content = content.replace(
  "  text += \`MTD Sale Value = ${mtdValue.toLocaleString()}\`;\n  \n  }\n  return text;",
  "  text += \`MTD Sale Value = ${mtdValue.toLocaleString()}\`;\n  return text;"
);

fs.writeFileSync('services/reportService.ts', content);
