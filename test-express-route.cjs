const express = require('express');
const app = express();
app.get('*all', (req, res) => res.send('ok'));
const server = app.listen(3000, async () => {
  try {
    const r1 = await fetch('http://localhost:3000/').then(r => r.status);
    const r2 = await fetch('http://localhost:3000/some-route').then(r => r.status);
    console.log('GET / ->', r1);
    console.log('GET /some-route ->', r2);
  } catch (e) {
    console.error(e);
  } finally {
    server.close();
  }
});
