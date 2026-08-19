const fs = require('fs');
let content = fs.readFileSync('components/NewEntry.tsx', 'utf8');

const targetButton = `<GlassButton type="submit" className="w-full py-4 text-lg shadow-xl shadow-blue-500/20 rounded-3xl" disabled={isSubmitting}>`;
const replacementButton = `{errorMsg && <p className="text-red-500 text-sm font-bold text-center mt-4 bg-red-100/50 p-2 rounded-xl">{errorMsg}</p>}\n        <GlassButton type="submit" className="w-full py-4 text-lg shadow-xl shadow-blue-500/20 rounded-3xl" disabled={isSubmitting}>`;

content = content.replace(targetButton, replacementButton);
fs.writeFileSync('components/NewEntry.tsx', content);
