const fs = require('fs');
let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

content = content.replace(
  "import { DailyReport, SaleItem, UserProfile } from '../types';",
  "import { DailyReport, SaleItem, UserProfile, Complaint } from '../types';"
);
content = content.replace(
  "import { deleteDailyReport, updateDailyReport, saveUser } from '../services/storageService';",
  "import { deleteDailyReport, updateDailyReport, saveUser, getComplaints } from '../services/storageService';"
);
content = content.replace(
  "const [editItemState, setEditItemState] = useState<SaleItem | null>(null);",
  "const [editItemState, setEditItemState] = useState<SaleItem | null>(null);\n  const [complaints, setComplaints] = useState<Complaint[]>([]);"
);
content = content.replace(
  "useEffect(() => { getMotivationalQuote(user.apiKey).then(setQuote); }, [user.apiKey]);",
  "useEffect(() => { getMotivationalQuote(user.apiKey).then(setQuote); getComplaints().then(setComplaints); }, [user.apiKey]);"
);

const targetStats = "  return (";
const statsCode = `  const todayStr = new Date().toISOString().split('T')[0];
  const { todayItemsSold, todayRevenue, todayCrmAdded } = useMemo(() => {
      const todaySales = sales.filter(s => s.date === todayStr);
      const revenue = todaySales.reduce((sum, s) => sum + s.totalValue, 0);
      const items = todaySales.reduce((sum, s) => sum + s.totalQty, 0);
      const crmAdded = complaints.filter(c => c.date.startsWith(todayStr)).length;
      return { todayItemsSold: items, todayRevenue: revenue, todayCrmAdded: crmAdded };
  }, [sales, complaints, todayStr]);

  return (`;

content = content.replace(targetStats, statsCode);

const targetLayout = `<div className="grid grid-cols-3 gap-2">
          <GlassCard`;
const replacementLayout = `<div className="grid grid-cols-3 gap-2 mb-4">
          <GlassCard className="p-3 flex flex-col items-center justify-center text-center bg-indigo-50/50 dark:bg-indigo-900/10 animate-in zoom-in duration-500 delay-100 border-indigo-100/50 dark:border-indigo-500/20 rounded-3xl">
            <Package size={20} className="text-indigo-500 mb-1" />
            <p className="text-[10px] uppercase text-zinc-500 font-bold">Items Sold Today</p>
            <p className="text-sm font-bold truncate w-full">{todayItemsSold}</p>
          </GlassCard>
          <GlassCard className="p-3 flex flex-col items-center justify-center text-center bg-emerald-50/50 dark:bg-emerald-900/10 animate-in zoom-in duration-500 delay-200 border-emerald-100/50 dark:border-emerald-500/20 rounded-3xl">
            <Wallet size={20} className="text-emerald-500 mb-1" />
            <p className="text-[10px] uppercase text-zinc-500 font-bold">Revenue Today</p>
            <p className="text-sm font-bold truncate w-full">₹{todayRevenue.toLocaleString()}</p>
          </GlassCard>
          <GlassCard className="p-3 flex flex-col items-center justify-center text-center bg-violet-50/50 dark:bg-violet-900/10 animate-in zoom-in duration-500 delay-300 border-violet-100/50 dark:border-violet-500/20 rounded-3xl">
            <ClipboardList size={20} className="text-violet-500 mb-1" />
            <p className="text-[10px] uppercase text-zinc-500 font-bold">CRM Added Today</p>
            <p className="text-sm font-bold truncate w-full">{todayCrmAdded}</p>
          </GlassCard>
      </div>

      <div className="grid grid-cols-3 gap-2">
          <GlassCard`;

content = content.replace(targetLayout, replacementLayout);

// Need to import Package, ClipboardList
content = content.replace(
  "import { List, Trash2, Maximize2, X, Download, Copy, Wallet, Target, Trophy, Ban, Pencil, Check, Filter, Search as SearchIcon, Quote, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Store, Send } from 'lucide-react';",
  "import { List, Trash2, Maximize2, X, Download, Copy, Wallet, Target, Trophy, Ban, Pencil, Check, Filter, Search as SearchIcon, Quote, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Store, Send, Package, ClipboardList } from 'lucide-react';"
);

fs.writeFileSync('components/Dashboard.tsx', content);
