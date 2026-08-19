const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(
  "import { getUser, logoutUser, getSalesWithoutImages, getTheme, saveTheme } from './services/storageService';",
  "import { getUser, logoutUser, getSalesWithoutImages, getTheme, saveTheme, saveUser } from './services/storageService';\nimport { auth } from './services/firebase';\nimport { onAuthStateChanged } from 'firebase/auth';"
);

const oldInitApp = `      const storedUser = getUser();
      if (storedUser) {
        setUser(storedUser);
        const storedSales = await getSalesWithoutImages();
        setSalesData(storedSales);
      }`;

const newInitApp = `      const storedUser = getUser();
      if (storedUser) {
        setUser(storedUser);
      }
      
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const storedSales = await getSalesWithoutImages();
          setSalesData(storedSales);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      });`;

content = content.replace(oldInitApp, newInitApp);

// remove the timeout since we handle setIsLoading inside onAuthStateChanged
content = content.replace("setTimeout(() => setIsLoading(false), 2600);", "// setTimeout removed");

fs.writeFileSync('App.tsx', content);
