const fs = require('fs');
let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

// Reverse the first mess up
const badStatsCode = `const todayStr = new Date().toISOString().split('T')[0];
  const { todayItemsSold, todayRevenue, todayCrmAdded } = useMemo(() => {
      const todaySales = sales.filter(s => s.date === todayStr);
      const revenue = todaySales.reduce((sum, s) => sum + s.totalValue, 0);
      const items = todaySales.reduce((sum, s) => sum + s.totalQty, 0);
      const crmAdded = complaints.filter(c => c.date.startsWith(todayStr)).length;
      return { todayItemsSold: items, todayRevenue: revenue, todayCrmAdded: crmAdded };
  }, [sales, complaints, todayStr]);

  return (`;

content = content.replace(badStatsCode, "return (");

// Now apply it to the CORRECT place.
const correctTarget = `  return (
    <div className="space-y-6">`;

const correctReplacement = `  const todayStr = new Date().toISOString().split('T')[0];
  const { todayItemsSold, todayRevenue, todayCrmAdded } = useMemo(() => {
      const todaySales = sales.filter(s => s.date === todayStr);
      const revenue = todaySales.reduce((sum, s) => sum + s.totalValue, 0);
      const items = todaySales.reduce((sum, s) => sum + s.totalQty, 0);
      const crmAdded = complaints.filter(c => c.date.startsWith(todayStr)).length;
      return { todayItemsSold: items, todayRevenue: revenue, todayCrmAdded: crmAdded };
  }, [sales, complaints, todayStr]);

  return (
    <div className="space-y-6">`;

content = content.replace(correctTarget, correctReplacement);

fs.writeFileSync('components/Dashboard.tsx', content);
