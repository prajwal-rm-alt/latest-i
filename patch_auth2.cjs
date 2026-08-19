const fs = require('fs');
let content = fs.readFileSync('components/Auth.tsx', 'utf8');

content = content.replace(
  "const profile = await getFromStore('users', user.uid);",
  "const profile = await getFromStore<UserProfile>('users', user.uid);"
);

content = content.replace(
  "// it's just setting form data, what caused the error?",
  "setFormData(prev => ({ ...prev, name: user.displayName || '' }));"
);

fs.writeFileSync('components/Auth.tsx', content);
