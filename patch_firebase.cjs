const fs = require('fs');
let content = fs.readFileSync('services/firebase.ts', 'utf8');

content = content.replace(
  "import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';",
  "import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';"
);

content = content.replace(
  "export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);",
  "export const loginWithGoogle = () => signInWithRedirect(auth, googleProvider);\nexport const loginWithGooglePopup = () => signInWithPopup(auth, googleProvider);"
);

fs.writeFileSync('services/firebase.ts', content);
