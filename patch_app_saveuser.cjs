const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(
  "import { getUser, logoutUser, getSalesWithoutImages, getTheme, saveTheme } from './services/storageService';",
  "import { getUser, logoutUser, getSalesWithoutImages, getTheme, saveTheme, saveUser } from './services/storageService';"
);

fs.writeFileSync('App.tsx', content);
