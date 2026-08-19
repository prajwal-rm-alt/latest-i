const fs = require('fs');
let content = fs.readFileSync('components/Auth.tsx', 'utf8');

content = content.replace(
  'let user = result?.user;',
  'let user = result?.user || null;'
);

fs.writeFileSync('components/Auth.tsx', content);
