const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'app.post("/api/extract-bill", async (_req, res) => {',
  'app.post("/api/extract-bill", async (req, res) => {'
);

content = content.replace(
  'app.post("/api/coach-message", async (_req, res) => {',
  'app.post("/api/coach-message", async (req, res) => {'
);

fs.writeFileSync('server.ts', content);
