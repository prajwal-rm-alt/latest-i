const fs = require('fs');
let content = fs.readFileSync('metadata.json', 'utf8');

const oldMeta = `"requestFramePermissions": [
    "camera"
  ]`;
const newMeta = `"requestFramePermissions": [
    "camera"
  ],
  "majorCapabilities": [
    "MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"
  ]`;

content = content.replace(oldMeta, newMeta);
fs.writeFileSync('metadata.json', content);
