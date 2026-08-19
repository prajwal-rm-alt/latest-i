const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

const oldAuthState = `      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const storedSales = await getSalesWithoutImages();
          setSalesData(storedSales);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      });`;

const newAuthState = `      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const storedSales = await getSalesWithoutImages();
          setSalesData(storedSales);
          setIsLoading(false);
        } else {
          logoutUser();
          setUser(null);
          setIsLoading(false);
        }
      });`;

content = content.replace(oldAuthState, newAuthState);
fs.writeFileSync('App.tsx', content);
