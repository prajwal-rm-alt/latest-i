const fs = require('fs');
const content = fs.readFileSync('dist/server.cjs', 'utf-8');
console.log("Requires vite?", content.includes('require("vite")'));
