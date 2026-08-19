const originalExit = process.exit;
process.exit = (code) => {
  console.log('process.exit called with', code);
  console.trace();
  originalExit(code);
};
process.on('exit', (code) => {
  console.log('process ' + process.pid + ' is exiting with code', code);
});
require('./dist/server.cjs');
