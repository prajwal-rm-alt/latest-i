const fs = require('fs');
let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

const targetContent = `                {getReportImages(selectedDateReport).length > 0 && (`;
const replacementContent = `                {selectedDateReport.notes && (
                    <div className="mt-4 p-3 bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200/50 dark:border-zinc-700/50 rounded-3xl">
                        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-2"><Quote size={14} className="text-zinc-500" /> Notes</h4>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{selectedDateReport.notes}</p>
                    </div>
                )}
                {getReportImages(selectedDateReport).length > 0 && (`;

content = content.replace(targetContent, replacementContent);
fs.writeFileSync('components/Dashboard.tsx', content);
