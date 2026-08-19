const fs = require('fs');
let content = fs.readFileSync('package.json', 'utf8');

const oldScripts = `"scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "tsc --noEmit",
    "preview": "vite preview"
  },`;

const newScripts = `"scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "lint": "tsc --noEmit"
  },`;

content = content.replace(oldScripts, newScripts);
fs.writeFileSync('package.json', content);
