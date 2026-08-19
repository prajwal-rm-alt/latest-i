const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'import { createServer as createViteServer } from "vite";\n',
  ''
);

const oldViteCreate = `    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);`;

const newViteCreate = `    const vite = await import("vite");
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(viteServer.middlewares);`;

content = content.replace(oldViteCreate, newViteCreate);

// Also fix the Express 5 route matching from '*all' to '*'
// Wait, I noticed earlier that Express 5 requires named parameters for wildcard in some cases, or * doesn't work.
// Let's use '*' just in case. Oh wait, if Express 5 throws on '*', maybe I should stick to '*all' or use '/*'.
// Let's check my test-express.cjs output: " *all works", " * fails".
// So '*all' actually works for Express 5!
// Wait, I will just leave it as '*all' because it worked.

fs.writeFileSync('server.ts', content);
