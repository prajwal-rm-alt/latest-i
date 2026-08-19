const fs = require('fs');
let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

const targetContent = "  return (";
const replacementContent = \`  const todayStr = new Date().toISOString().split('T')[0];
  const { todayItemsSold, todayRevenue, todayCrmAdded } = useMemo(() => {
      const todaySales = sales.filter(s => s.date === todayStr);
      const revenue = todaySales.reduce((sum, s) => sum + s.totalValue, 0);
      const items = todaySales.reduce((sum, s) => sum + s.totalQty, 0);
      const crmAdded = complaints.filter(c => c.date.startsWith(todayStr)).length;
      return { todayItemsSold: items, todayRevenue: revenue, todayCrmAdded: crmAdded };
  }, [sales, complaints]);

  return (\`;

content = content.replace(targetContent, replacementContent);
fs.writeFileSync('components/Dashboard.tsx', content);
