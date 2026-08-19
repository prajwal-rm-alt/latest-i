const fs = require('fs');
let content = fs.readFileSync('services/firebase.ts', 'utf8');

content = content.replace(
  "import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';",
  "import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';"
);

fs.writeFileSync('services/firebase.ts', content);
