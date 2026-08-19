const express = require('express');
const app = express();
try {
  app.get('*all', (req, res) => res.send('ok'));
  console.log(' *all works');
} catch (e) {
  console.log(' *all fails', e.message);
}
try {
  app.get('*', (req, res) => res.send('ok'));
  console.log(' * works');
} catch (e) {
  console.log(' * fails', e.message);
}
