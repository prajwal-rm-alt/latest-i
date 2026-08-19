const fs = require('fs');
let content = fs.readFileSync('services/storageService.ts', 'utf8');

content = content.replace(
  "export const logoutUser = () => {\n  localStorage.removeItem(LS_KEYS.USER);\n};",
  "import { logoutFirebase } from './firebase';\nexport const logoutUser = async () => {\n  localStorage.removeItem(LS_KEYS.USER);\n  await logoutFirebase();\n};"
);

fs.writeFileSync('services/storageService.ts', content);
