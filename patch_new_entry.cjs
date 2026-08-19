const fs = require('fs');
let content = fs.readFileSync('components/NewEntry.tsx', 'utf8');

// 1. Error message state
content = content.replace(
  "const [searchTerm, setSearchTerm] = useState('');",
  "const [searchTerm, setSearchTerm] = useState('');\n  const [errorMsg, setErrorMsg] = useState('');"
);

// 2. Enhanced search logic
const oldSearch = `  const filteredProducts = searchTerm \n      ? PRODUCT_LIST.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase()))\n      : PRODUCT_LIST;`;
const newSearch = `  const filteredProducts = searchTerm \n      ? PRODUCT_LIST.filter(p => {\n          const searchWords = searchTerm.toLowerCase().split(' ').filter(Boolean);\n          const productLower = p.toLowerCase();\n          return searchWords.every(word => productLower.includes(word));\n        })\n      : PRODUCT_LIST;`;
content = content.replace(oldSearch, newSearch);

// 3. Validation in handleSubmit
const oldSubmitStart = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isWeekOff) {`;
const newSubmitStart = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!isWeekOff) {
        const invalidItems = items.some(i => !i.productName.trim() || i.quantity <= 0 || i.price < 0);
        if (invalidItems) {
            setErrorMsg('Please complete all product entries correctly. Product name cannot be empty, quantity must be > 0, and price >= 0.');
            return;
        }
    }
    
    if (isWeekOff) {`;
content = content.replace(oldSubmitStart, newSubmitStart);

// 4. Render errorMsg just above submit button
const targetButton = `<GlassButton type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 py-4 rounded-3xl mt-6">`;
const replacementButton = `{errorMsg && <p className="text-red-500 text-xs font-bold text-center mt-4">{errorMsg}</p>}
        <GlassButton type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 py-4 rounded-3xl mt-6">`;
content = content.replace(targetButton, replacementButton);

fs.writeFileSync('components/NewEntry.tsx', content);
