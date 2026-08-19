const express = require('express');
const app = express();
const server = app.listen(3000, () => console.log('Listening 3000'));
console.log('Server unref?', server.unref ? 'yes' : 'no');
