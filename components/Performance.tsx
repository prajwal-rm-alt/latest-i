import React, { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { Calendar, TrendingUp, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { DailyReport } from '../types';
import { GlassCard } from './ui/GlassComponents';

interface PerformanceProps {
  sales: DailyReport[];
}

const Performance: React.FC<PerformanceProps> = ({ sales }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [weekOffset, setWeekOffset] = useState(0);

  // Helper to categorize products
  const getCategory = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('mixer') || n.includes('grinder') || n.includes('juicer') || n.includes('induction') || n.includes('toaster') || n.includes('sandwich') || n.includes('kettle')) return 'Kitchen Care';
    if (n.includes('iron') || n.includes('purifier') || n.includes('vacuum') || n.includes('fan') || n.includes('cooler') || n.includes('geyser') || n.includes('heater')) return 'Home Care';
    if (n.includes('hob') || n.includes('chimney') || n.includes('oven') || n.includes('microwave') || n.includes('dishwasher')) return 'Integrated Kitchen';
    return 'Others';
  };

  // Get current week dates (Monday to Sunday)
  const weekData = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = (day === 0 ? 6 : day - 1); // Adjust to Monday
    startOfWeek.setDate(now.getDate() - diff + (weekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }

    const filteredSales = sales.filter(s => s.date >= days[0] && s.date <= days[6]);
    
    return { days, filteredSales, startOfWeek, endOfWeek };
  }, [sales, weekOffset]);

  // Extract categories
  const categories = useMemo(() => {
    return ['All', 'Kitchen Care', 'Home Care', 'Integrated Kitchen', 'Others'];
  }, []);

  // Chart Data: Daily Sales Value
  const chartData = useMemo(() => {
    return weekData.days.map(day => {
      const daySales = weekData.filteredSales.find(s => s.date === day);
      let value = 0;
      if (daySales && Array.isArray(daySales.items)) {
        daySales.items.forEach(item => {
          if (selectedCategory === 'All' || getCategory(item.productName || '') === selectedCategory) {
            value += (item.price || 0) * (item.quantity || 1);
          }
        });
      }
      return {
        name: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
        value: value
      };
    });
  }, [weekData, selectedCategory]);

  // Category Breakdown Data
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {
      'Kitchen Care': 0,
      'Home Care': 0,
      'Integrated Kitchen': 0,
      'Others': 0
    };
    weekData.filteredSales.forEach(s => {
      if (Array.isArray(s.items)) {
        s.items.forEach(item => {
          const cat = getCategory(item.productName || '');
          counts[cat] = (counts[cat] || 0) + (item.quantity || 1);
        });
      }
    });
    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [weekData]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Week Selector */}
      <div className="flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-4 rounded-3xl border border-white/20 shadow-sm">
        <button 
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-blue-500" />
          <span className="text-sm font-bold">
            {weekData.startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekData.endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <button 
          onClick={() => setWeekOffset(prev => prev + 1)}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat 
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-lg' 
                : 'bg-white/50 dark:bg-zinc-900/50 text-zinc-500 border border-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Chart */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={20} className="text-blue-500" />
          <h3 className="text-lg font-bold tracking-tight">Weekly Sales Trend</h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#94a3b8' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.9)'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <GlassCard className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Category Mix</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {categoryData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-[10px] font-bold text-zinc-500">{entry.name}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Product List */}
        <GlassCard className="p-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Package size={18} className="text-purple-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Sold Items</h3>
          </div>
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {weekData.filteredSales.flatMap(s => s.items || [])
              .filter(item => Boolean(item) && (selectedCategory === 'All' || getCategory(item.productName || '') === selectedCategory))
              .map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                  <div>
                    <p className="text-xs font-bold">{item.productName}</p>
                    <p className="text-[10px] text-zinc-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-xs font-bold text-blue-600">₹{item.price * item.quantity}</p>
                </div>
              ))}
            {weekData.filteredSales.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-zinc-400 italic">No sales this week</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Performance;
