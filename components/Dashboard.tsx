
import React, { useState, useMemo, useEffect } from 'react';
import { List, Trash2, Maximize2, X, Download, Copy, Wallet, Target, Trophy, Ban, Pencil, Check, Filter, Search as SearchIcon, Quote, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Store, Send, Package, ClipboardList } from 'lucide-react';
import { DailyReport, SaleItem, UserProfile, Complaint } from '../types';
import { GlassCard, GlassButton, GlassInput, Modal } from './ui/GlassComponents';
import { generateTextReport, generateStoreEODReport, formatToDisplayDate } from '../services/reportService';
import { deleteDailyReport, updateDailyReport, saveUser, getComplaints } from '../services/storageService';
import { getMotivationalQuote } from '../services/aiService';

// Fix: Added missing DashboardProps interface
interface DashboardProps {
  sales: DailyReport[];
  user: UserProfile;
  onDataChange: () => void;
  onUpdateUser: (u: UserProfile) => void;
}

const CountUp = ({ end, prefix = '', suffix = '', duration = 1500 }: { end: number, prefix?: string, suffix?: string, duration?: number }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let startTime: number;
        let animationFrame: number;
        const animate = (time: number) => {
            if (!startTime) startTime = time;
            const progress = (time - startTime) / duration;
            if (progress < 1) {
                const easeValue = 1 - Math.pow(1 - progress, 3);
                setCount(Math.floor(end * easeValue));
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };
        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);
    return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

const Dashboard: React.FC<DashboardProps> = ({ sales, user, onDataChange, onUpdateUser }) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDateReport, setSelectedDateReport] = useState<DailyReport | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [quote, setQuote] = useState("Loading inspiration... ✨");
  const [showEODModal, setShowEODModal] = useState(false);
  const [eodForm, setEodForm] = useState({ dayTarget: user.customTargets?.daily || 0, weekTarget: user.customTargets?.weekly || 0, eolTarget: user.customTargets?.eol || 0, eolAchieve: 0 });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ productName: '', date: '', minQty: '', minPrice: '' });
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editItemState, setEditItemState] = useState<SaleItem | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  
  useEffect(() => { getMotivationalQuote(user.apiKey).then(setQuote); getComplaints().then(setComplaints); }, [user.apiKey]);
  useEffect(() => { setEodForm(prev => ({ ...prev, dayTarget: user.customTargets?.daily || prev.dayTarget, weekTarget: user.customTargets?.weekly || prev.weekTarget, eolTarget: user.customTargets?.eol || prev.eolTarget })); }, [user.customTargets]);

  const { mtdValue, mtdPercentage, balance, monthName, currentMonthSalesCount } = useMemo(() => {
    const now = currentMonth;
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthPrefix = `${year}-${month}`;
    const currentMonthSales = sales.filter(s => s.date && s.date.startsWith(currentMonthPrefix));
    const value = currentMonthSales.reduce((sum, s) => sum + (s.totalValue || 0), 0);
    const percentage = user.monthlyTarget > 0 ? Math.min((value / user.monthlyTarget) * 100, 100) : 0;
    const bal = Math.max(user.monthlyTarget - value, 0);
    return { 
      mtdValue: value, 
      mtdPercentage: percentage, 
      balance: bal, 
      monthName: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      currentMonthSalesCount: currentMonthSales.length
    };
  }, [sales, user.monthlyTarget, currentMonth]);

  const latestSalesDate = useMemo(() => {
    if (!sales || sales.length === 0) return null;
    const sorted = [...sales].filter(s => s.date).sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.date || null;
  }, [sales]);

  const jumpToLatestMonth = () => {
    if (!latestSalesDate) return;
    const [y, m] = latestSalesDate.split('-');
    if (y && m) {
      setCurrentMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
    }
  };

  const calendarDays = useMemo(() => {
    const now = currentMonth;
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, dateStr });
    }
    return days;
  }, [currentMonth]);

  const nextMonth = () => { setCurrentMonth(prev => { const next = new Date(prev); next.setMonth(prev.getMonth() + 1); return next; }); };
  const prevMonth = () => { setCurrentMonth(prev => { const prevDate = new Date(prev); prevDate.setMonth(prev.getMonth() - 1); return prevDate; }); };

  const filteredSales = useMemo(() => {
      if (viewMode === 'calendar') return sales;
      return (sales || []).filter(report => {
          if (!report) return false;
          if (filters.date && report.date !== filters.date) return false;
          if (filters.productName || filters.minQty || filters.minPrice) {
             const items = Array.isArray(report.items) ? report.items : [];
             const hasMatchingItem = items.some(item => {
                 if (!item) return false;
                 const nameMatch = !filters.productName || (item.productName || '').toLowerCase().includes(filters.productName.toLowerCase());
                 const qtyMatch = !filters.minQty || (item.quantity || 0) >= parseInt(filters.minQty);
                 const priceMatch = !filters.minPrice || (item.price || 0) >= parseFloat(filters.minPrice);
                 return nameMatch && qtyMatch && priceMatch;
             });
             if (!hasMatchingItem) return false;
          }
          return true;
      }).sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
  }, [sales, viewMode, filters]);

  const getEODStats = () => {
      const dateStr = selectedDateReport ? selectedDateReport.date : new Date().toISOString().split('T')[0];
      const dayAch = sales.find(s => s.date === dateStr)?.totalValue || 0;
      const d = new Date(dateStr);
      const day = d.getDay();
      const diff = (day + 6) % 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - diff);
      monday.setHours(0,0,0,0);
      const targetDate = new Date(dateStr);
      targetDate.setHours(23,59,59,999);
      const weekAch = sales.reduce((acc, s) => {
          const sDate = new Date(s.date);
          if (sDate >= monday && sDate <= targetDate) return acc + s.totalValue;
          return acc;
      }, 0);
      return { dateStr, dayAch, weekAch };
  };

  const handleEODShare = () => {
      const { dateStr, dayAch, weekAch } = getEODStats();
      const updatedUser = { ...user, customTargets: { daily: eodForm.dayTarget, weekly: eodForm.weekTarget, eol: eodForm.eolTarget } };
      saveUser(updatedUser);
      onUpdateUser(updatedUser);
      const reportText = generateStoreEODReport(user, dateStr, eodForm.dayTarget, dayAch, eodForm.weekTarget, weekAch, eodForm.eolTarget, eodForm.eolAchieve);
      window.open(`https://wa.me/?text=${encodeURIComponent(reportText)}`, '_blank');
      setShowEODModal(false);
  };

  const handleDeleteEntry = async (date: string) => {
      await deleteDailyReport(date);
      setSelectedDateReport(null);
      onDataChange();
  };

  const handleRemoveItem = async (report: DailyReport, index: number) => {
      const updatedItems = [...(report.items || [])];
      updatedItems.splice(index, 1);
      if (updatedItems.length === 0) {
          await handleDeleteEntry(report.date);
          return;
      }
      const totalQty = updatedItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
      const totalValue = updatedItems.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 0)), 0);
      const updatedReport = { ...report, items: updatedItems, totalQty, totalValue };
      await updateDailyReport(report.date, updatedReport);
      setSelectedDateReport(updatedReport);
      onDataChange();
  };

  const startEditItem = (item: SaleItem, index: number) => { setEditingItemIndex(index); setEditItemState({ ...item }); };
  const saveEditItem = async (report: DailyReport, index: number) => {
      if (!editItemState) return;
      const updatedItems = [...(report.items || [])];
      updatedItems[index] = editItemState;
      const totalQty = updatedItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
      const totalValue = updatedItems.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 0)), 0);
      const updatedReport = { ...report, items: updatedItems, totalQty, totalValue };
      await updateDailyReport(report.date, updatedReport);
      setSelectedDateReport(updatedReport);
      setEditingItemIndex(null); setEditItemState(null);
      onDataChange();
  };

  const cancelEdit = () => { setEditingItemIndex(null); setEditItemState(null); };
  const handleRemoveImage = async (report: DailyReport, imgIndex: number) => {
      
      const images = report.billImages || (report.billImage ? [report.billImage] : []);
      const updatedImages = images.filter((_, i) => i !== imgIndex);
      const updatedReport = { ...report, billImages: updatedImages, billImage: undefined };
      await updateDailyReport(report.date, updatedReport);
      setSelectedDateReport(updatedReport);
      onDataChange();
  };

  const copyReport = (report: DailyReport) => {
    // Fix: Pass sales as 3rd parameter
    const text = generateTextReport(user, report, sales);
    navigator.clipboard.writeText(text);
    console.log('Report copied!');
  };

  const handleCopyToday = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayReport = sales.find(s => s.date === todayStr);
      if(todayReport) copyReport(todayReport); else console.log('No entry found for today.');
  };

  const downloadImage = (base64: string, date: string, index: number) => {
      const a = document.createElement("a"); a.href = base64; a.download = `Bill_${date}_${index + 1}.jpg`; a.click();
  };

  const getReportImages = (report: DailyReport) => { return report.billImages || (report.billImage ? [report.billImage] : []); };

  const handleDateSelect = async (report: DailyReport) => {
      const { getFromStore, getImagesForDate } = await import('../services/storageService');
      const fullReport = await getFromStore<DailyReport>('sales', report.date);
      const images = await getImagesForDate(report.date);
      const reportWithImages = fullReport || report;
      setSelectedDateReport({ ...reportWithImages, billImages: images });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const { todayItemsSold, todayRevenue, todayCrmAdded } = useMemo(() => {
      const todaySales = sales.filter(s => s.date === todayStr);
      const revenue = todaySales.reduce((sum, s) => sum + s.totalValue, 0);
      const items = todaySales.reduce((sum, s) => sum + s.totalQty, 0);
      const crmAdded = complaints.filter(c => c.date.startsWith(todayStr)).length;
      return { todayItemsSold: items, todayRevenue: revenue, todayCrmAdded: crmAdded };
  }, [sales, complaints, todayStr]);

  return (
    <div className="space-y-6">
      <GlassCard className="p-4 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 animate-in slide-in-from-top-4 duration-500 border-l-4 border-l-yellow-400 shadow-lg rounded-3xl">
         <div className="flex gap-3">
             <div className="bg-yellow-400/20 p-2 rounded-3xl h-fit"><Quote className="text-yellow-600 dark:text-yellow-400" size={18} fill="currentColor" fillOpacity={0.5} /></div>
             <div><p className="text-sm font-semibold italic text-zinc-700 dark:text-zinc-200">"{quote}"</p><p className="text-[10px] text-zinc-400 mt-1 font-bold uppercase tracking-wider">AI Daily Inspiration</p></div>
         </div>
      </GlassCard>

      <div className="grid grid-cols-3 gap-2 mb-4">
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
          <GlassCard className="p-3 flex flex-col items-center justify-center text-center bg-blue-50/50 dark:bg-blue-900/10 animate-in zoom-in duration-500 delay-100 border-blue-100/50 dark:border-blue-500/20 rounded-3xl"><Target size={20} className="text-blue-500 mb-1" /><p className="text-[10px] uppercase text-zinc-500 font-bold">Target</p><p className="text-sm font-bold truncate w-full"><CountUp end={user.monthlyTarget / 1000} prefix="₹" suffix="k" /></p></GlassCard>
          <GlassCard className="p-3 flex flex-col items-center justify-center text-center bg-green-50/50 dark:bg-green-900/10 animate-in zoom-in duration-500 delay-200 border-green-100/50 dark:border-green-500/20 rounded-3xl"><Trophy size={20} className="text-green-500 mb-1" /><p className="text-[10px] uppercase text-zinc-500 font-bold">Achieved</p><p className="text-sm font-bold truncate w-full"><CountUp end={mtdValue} prefix="₹" /></p></GlassCard>
          <GlassCard className="p-3 flex flex-col items-center justify-center text-center bg-orange-50/50 dark:bg-orange-900/10 animate-in zoom-in duration-500 delay-300 border-orange-100/50 dark:border-orange-500/20 rounded-3xl"><Wallet size={20} className="text-orange-500 mb-1" /><p className="text-[10px] uppercase text-zinc-500 font-bold">Balance</p><p className="text-sm font-bold truncate w-full"><CountUp end={balance} prefix="₹" /></p></GlassCard>
      </div>

      <GlassCard className="p-5 animate-in slide-in-from-bottom-4 duration-500 rounded-3xl">
          <div className="flex justify-between items-end mb-2"><div><h2 className="font-bold text-lg flex items-center gap-2">{monthName}</h2><p className="text-xs text-zinc-500">Monthly Progress</p></div><p className="text-2xl font-bold text-zinc-800 dark:text-white"><CountUp end={mtdValue} prefix="₹" /></p></div>
          <div className="h-4 w-full bg-zinc-200/50 dark:bg-zinc-700/50 rounded-3xl overflow-hidden shadow-inner border border-white/30 dark:border-white/10"><div className="h-full bg-zinc-800 dark:bg-zinc-200 transition-all duration-1000 ease-out relative" style={{ width: `${mtdPercentage}%` }}><div className="absolute inset-0 bg-white/20 animate-[shine_2s_infinite]" /></div></div>
          <div className="flex justify-between mt-2 text-xs text-zinc-500"><span>0%</span><span><CountUp end={mtdPercentage} suffix="%" /></span><span>100%</span></div>
      </GlassCard>

      <div className="flex gap-2"><GlassButton onClick={handleCopyToday} className="flex-1 !py-3 bg-white/50 dark:bg-zinc-800/60 backdrop-blur-md hover:bg-white/70 dark:hover:bg-zinc-700/80 !text-sm border border-white/40 dark:border-white/20 rounded-3xl"><Copy size={16} /> Copy Report</GlassButton><GlassButton onClick={() => setShowEODModal(true)} className="flex-1 !py-3 bg-blue-600/80 hover:bg-blue-600/90 backdrop-blur-md !text-sm !border-blue-400/30 shadow-sm rounded-3xl"><Store size={16} /> Store EOD</GlassButton></div>
      <div className="flex p-1 bg-white/40 dark:bg-white/10 rounded-3xl border border-white/40 dark:border-white/20 backdrop-blur-md w-fit mx-auto"><button onClick={() => setViewMode('calendar')} className={`px-6 py-2 rounded-3xl text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white/80 dark:bg-zinc-800/80 shadow-sm text-black dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>Calendar</button><button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-3xl text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white/80 dark:bg-zinc-800/80 shadow-sm text-black dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>List View</button></div>

      {viewMode === 'calendar' ? (
        <GlassCard className="p-4 rounded-3xl">
          {sales.length > 0 && currentMonthSalesCount === 0 && latestSalesDate && (
            <div className="mb-3 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between text-xs text-blue-800 dark:text-blue-200">
              <span>{sales.length} total reports available in other months.</span>
              <button 
                onClick={jumpToLatestMonth}
                className="font-bold underline hover:text-blue-600 dark:hover:text-blue-300 ml-2 shrink-0"
              >
                Go to Latest Data →
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mb-4 px-2"><button onClick={prevMonth} className="p-2 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"><ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-300" /></button><h3 className="text-lg font-bold text-zinc-800 dark:text-white flex items-center gap-2"><CalendarIcon size={18} className="text-blue-500" />{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3><button onClick={nextMonth} className="p-2 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"><ChevronRight size={20} className="text-zinc-600 dark:text-zinc-300" /></button></div>
          <div className="grid grid-cols-7 gap-2 mb-2">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => ( <div key={i} className="text-center text-xs font-bold text-zinc-400">{d}</div> ))}</div>
          <div className="grid grid-cols-7 gap-3">
            {calendarDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const report = sales.find(s => s.date === d.dateStr);
              const isToday = d.dateStr === new Date().toISOString().split('T')[0];
              const isWeekOff = report?.isWeekOff;
              return (
                <div key={d.dateStr} onClick={() => report ? handleDateSelect(report) : null} style={{ animationDelay: `${i * 0.04}s` }} className={`aspect-square rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all border shadow-sm relative overflow-hidden animate-in zoom-in fade-in duration-300 fill-mode-backwards ${isToday ? 'border-zinc-900 dark:border-white ring-1 ring-zinc-200 dark:ring-zinc-700' : 'border-white/40 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/10'} ${report ? (isWeekOff ? 'bg-gray-200/80 dark:bg-gray-800/80' : 'bg-white/60 dark:bg-zinc-800/80') : 'bg-white/20 dark:bg-zinc-900/20'}`}>
                  <span className={`text-xs ${isToday ? 'font-bold text-black dark:text-white' : ''}`}>{d.day}</span>
                  {report && <span className={`text-[9px] font-bold mt-0.5 ${isWeekOff ? 'text-gray-500' : 'text-green-600 dark:text-green-400'}`}>{isWeekOff ? 'OFF' : `${report.totalQty}u`}</span>}
                </div>
              );
            })}
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          <div className="px-2">
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 text-sm font-semibold transition-colors ${showFilters ? 'text-black dark:text-white' : 'text-zinc-500'}`}><Filter size={16} /> Filters</button>
            {showFilters && (
                <GlassCard className="mt-2 p-4 animate-in slide-in-from-top-2 rounded-3xl">
                    <div className="space-y-3"><div className="relative"><SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><input className="w-full bg-white/50 dark:bg-black/40 border border-white/50 dark:border-white/20 rounded-3xl pl-9 pr-3 py-2 text-sm outline-none backdrop-blur-md text-zinc-800 dark:text-white placeholder-zinc-500" placeholder="Filter by product name..." value={filters.productName} onChange={e => setFilters({...filters, productName: e.target.value})} /></div><div className="grid grid-cols-3 gap-3"><input type="date" className="bg-white/50 dark:bg-black/40 border border-white/50 dark:border-white/20 rounded-3xl px-3 py-2 text-sm outline-none backdrop-blur-md text-zinc-800 dark:text-white" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} /><input type="number" placeholder="Min Qty" className="bg-white/50 dark:bg-black/40 border border-white/50 dark:border-white/20 rounded-3xl px-3 py-2 text-sm outline-none backdrop-blur-md text-zinc-800 dark:text-white placeholder-zinc-500" value={filters.minQty} onChange={e => setFilters({...filters, minQty: e.target.value})} /><input type="number" placeholder="Min Price" className="bg-white/50 dark:bg-black/40 border border-white/50 dark:border-white/20 rounded-3xl px-3 py-2 text-sm outline-none backdrop-blur-md text-zinc-800 dark:text-white placeholder-zinc-500" value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: e.target.value})} /></div><div className="flex justify-end pt-2"><button onClick={() => setFilters({ productName: '', date: '', minQty: '', minPrice: '' })} className="text-xs text-red-500 font-bold hover:underline">Clear All</button></div></div>
                </GlassCard>
            )}
          </div>
          {[...filteredSales].map((report, i) => (
              <GlassCard key={report.date} className="p-4 animate-in slide-in-from-bottom-4 duration-500 rounded-3xl" onClick={() => handleDateSelect(report)} style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex justify-between items-center"><div><p className="font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">{formatToDisplayDate(report.date)}{report.isWeekOff && <span className="text-[10px] bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-3xl border border-zinc-300 dark:border-zinc-600">OFF</span>}</p><p className="text-sm text-zinc-500">{report.isWeekOff ? 'Week Off' : `${report.totalQty} items • ₹${report.totalValue.toLocaleString()}`}</p></div><div className="h-8 w-8 bg-white/50 dark:bg-zinc-800/50 border border-white/40 dark:border-white/20 rounded-3xl flex items-center justify-center text-black dark:text-white"><List size={16} /></div></div>
             </GlassCard>
          ))}
          {filteredSales.length === 0 && <div className="text-center py-10 opacity-60"><Filter size={32} className="mx-auto mb-2 text-zinc-400" /><p className="text-zinc-500 text-sm">No matching records found.</p></div>}
        </div>
      )}

      <Modal isOpen={!!selectedDateReport} onClose={() => { setSelectedDateReport(null); cancelEdit(); }} title={selectedDateReport ? formatToDisplayDate(selectedDateReport.date) : ''}>
        {selectedDateReport && (
          <div className="space-y-6 pb-4">
            {selectedDateReport.isWeekOff ? ( <div className="text-center py-8 bg-white/40 dark:bg-white/5 rounded-3xl border border-dashed border-white/50 dark:border-white/20 backdrop-blur-sm"><Ban size={40} className="mx-auto text-zinc-400 mb-2" /><p className="text-zinc-500 font-medium">Marked as Week Off</p></div> ) : (
                <>
                <div className="grid grid-cols-2 gap-4"><div className="bg-blue-50/50 dark:bg-blue-900/30 border border-blue-100/50 dark:border-blue-500/20 backdrop-blur-sm p-3 rounded-3xl text-center"><p className="text-xs text-zinc-500">Value</p><p className="font-bold text-blue-600">₹{selectedDateReport.totalValue.toLocaleString()}</p></div><div className="bg-purple-50/50 dark:bg-purple-900/30 border border-purple-100/50 dark:border-purple-500/20 backdrop-blur-sm p-3 rounded-3xl text-center"><p className="text-xs text-zinc-500">Quantity</p><p className="font-bold text-purple-600">{selectedDateReport.totalQty}</p></div></div>
                <div className="space-y-3"><h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl py-2 z-10">Items Sold</h4>
                    {(selectedDateReport.items || []).map((item, idx) => {
                        const isEditing = editingItemIndex === idx;
                        return (
                        <div key={idx} className={`flex justify-between items-center p-3 rounded-3xl border transition-all ${isEditing ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-500/20' : 'bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/10 backdrop-blur-sm'}`}>
                            {isEditing && editItemState ? (
                                <div className="w-full space-y-2"><input className="w-full bg-transparent border-b border-blue-300 dark:border-blue-500/50 text-sm font-medium focus:outline-none text-zinc-800 dark:text-white" value={editItemState.productName} onChange={(e) => setEditItemState({...editItemState, productName: e.target.value})} placeholder="Product Name" /><div className="flex gap-2"><div className="flex-1"><label className="text-[9px] uppercase text-zinc-500 font-bold">Qty</label><input type="number" className="w-full bg-transparent border-b border-blue-300 dark:border-blue-500/50 text-sm focus:outline-none text-zinc-800 dark:text-white" value={editItemState.quantity} onChange={(e) => setEditItemState({...editItemState, quantity: parseInt(e.target.value) || 0})} /></div><div className="flex-1"><label className="text-[9px] uppercase text-zinc-500 font-bold">Unit Price</label><input type="number" className="w-full bg-transparent border-b border-blue-300 dark:border-blue-500/50 text-sm focus:outline-none text-zinc-800 dark:text-white" value={editItemState.price} onChange={(e) => setEditItemState({...editItemState, price: parseFloat(e.target.value) || 0})} /></div></div><div className="grid grid-cols-3 gap-2"><div><label className="text-[9px] uppercase text-zinc-500 font-bold">Phone</label><input type="text" className="w-full bg-transparent border-b border-blue-300 dark:border-blue-500/50 text-xs focus:outline-none text-zinc-800 dark:text-white" value={editItemState.customerPhone || ''} onChange={(e) => setEditItemState({...editItemState, customerPhone: e.target.value})} /></div><div><label className="text-[9px] uppercase text-zinc-500 font-bold">Bill ID</label><input type="text" className="w-full bg-transparent border-b border-blue-300 dark:border-blue-500/50 text-xs focus:outline-none text-zinc-800 dark:text-white" value={editItemState.billId || ''} onChange={(e) => setEditItemState({...editItemState, billId: e.target.value})} /></div><div><label className="text-[9px] uppercase text-zinc-500 font-bold">Txn No</label><input type="text" className="w-full bg-transparent border-b border-blue-300 dark:border-blue-500/50 text-xs focus:outline-none text-zinc-800 dark:text-white" value={editItemState.txnNumber || ''} onChange={(e) => setEditItemState({...editItemState, txnNumber: e.target.value})} /></div></div><div className="flex justify-end gap-2 mt-2"><button onClick={cancelEdit} className="p-1 rounded-3xl bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300"><X size={14} /></button><button onClick={() => saveEditItem(selectedDateReport, idx)} className="p-1 rounded-3xl bg-green-500/80 text-white"><Check size={14} /></button></div></div>
                            ) : (
                                <><div className="flex-1"><p className="font-medium text-sm text-zinc-800 dark:text-white">{item.productName}</p><p className="text-xs text-zinc-500">₹{item.price} x {item.quantity}</p>{(item.customerPhone || item.billId || item.txnNumber) && (<div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-400">{item.customerPhone && <span>📞 {item.customerPhone}</span>}{item.billId && <span>🧾 {item.billId}</span>}{item.txnNumber && <span>💳 {item.txnNumber}</span>}</div>)}</div><div className="flex items-center gap-2"><p className="font-bold text-sm mr-2 text-zinc-800 dark:text-white">₹{item.price * item.quantity}</p><button onClick={() => startEditItem(item, idx)} className="text-blue-500 hover:text-blue-600 p-1"><Pencil size={14} /></button><button onClick={() => handleRemoveItem(selectedDateReport, idx)} className="text-red-500 hover:text-red-600 p-1"><Trash2 size={14} /></button></div></>
                            )}
                        </div>
                    )})}
                </div>
                {selectedDateReport.notes && (
                    <div className="mt-4 p-3 bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200/50 dark:border-zinc-700/50 rounded-3xl">
                        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-2"><Quote size={14} className="text-zinc-500" /> Notes</h4>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{selectedDateReport.notes}</p>
                    </div>
                )}
                {getReportImages(selectedDateReport).length > 0 && (
                    <div className="mt-4"><h4 className="text-sm font-semibold text-zinc-500 mb-2 sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl py-2 z-10">Bill Copies ({getReportImages(selectedDateReport).length})</h4><div className="grid grid-cols-2 gap-3">
                            {getReportImages(selectedDateReport).map((img, idx) => (
                                <div key={idx} className="report-img-inner-shadow relative group rounded-3xl overflow-hidden border border-white/40 dark:border-white/20 aspect-square shadow-sm"><img src={img} alt="Bill" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2 z-10"><div className="flex gap-2"><button onClick={() => setZoomedImage(img)} className="p-2 bg-white/80 backdrop-blur-md rounded-3xl text-black hover:bg-white"><Maximize2 size={16} /></button><button onClick={() => downloadImage(img, selectedDateReport.date, idx)} className="p-2 bg-white/80 backdrop-blur-md rounded-3xl text-black hover:bg-white"><Download size={16} /></button></div><button onClick={() => handleRemoveImage(selectedDateReport, idx)} className="px-3 py-1 bg-red-500/80 backdrop-blur-md text-white text-xs rounded-3xl hover:bg-red-600 mt-2">Delete</button></div></div>
                            ))}
                        </div></div>
                )}
                </>
            )}
             <div className="grid grid-cols-2 gap-3 mt-6 sticky bottom-0 bg-white/0 pt-2"><GlassButton onClick={() => copyReport(selectedDateReport)} variant="primary">Copy Report</GlassButton><GlassButton variant="danger" onClick={() => handleDeleteEntry(selectedDateReport.date)}>Delete All</GlassButton></div>
          </div>
        )}
      </Modal>
      
      <Modal isOpen={showEODModal} onClose={() => setShowEODModal(false)} title="Store EOD Report">
        <div className="space-y-4">
            <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100/50 dark:border-blue-500/20 backdrop-blur-sm p-3 rounded-3xl mb-4"><p className="text-xs text-blue-600 dark:text-blue-300 font-semibold mb-1">Date: {formatToDisplayDate(getEODStats().dateStr)}</p><p className="text-xs text-zinc-500">Calculated stats are based on today's entries.</p></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold uppercase text-zinc-500">Day Target</label><GlassInput type="number" value={eodForm.dayTarget} onChange={e => setEodForm({...eodForm, dayTarget: parseInt(e.target.value) || 0})} /></div><div className="space-y-1"><label className="text-[10px] font-bold uppercase text-zinc-500">Day Achieved</label><div className="px-3 py-3 rounded-3xl bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 backdrop-blur-md font-bold text-zinc-700 dark:text-zinc-300">₹{getEODStats().dayAch.toLocaleString()}</div></div><div className="space-y-1"><label className="text-[10px] font-bold uppercase text-zinc-500">Week Target</label><GlassInput type="number" value={eodForm.weekTarget} onChange={e => setEodForm({...eodForm, weekTarget: parseInt(e.target.value) || 0})} /></div><div className="space-y-1"><label className="text-[10px] font-bold uppercase text-zinc-500">Week Achieved</label><div className="px-3 py-3 rounded-3xl bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 backdrop-blur-md font-bold text-zinc-700 dark:text-zinc-300">₹{getEODStats().weekAch.toLocaleString()}</div></div><div className="space-y-1"><label className="text-[10px] font-bold uppercase text-zinc-500">EOL Target</label><GlassInput type="number" value={eodForm.eolTarget} onChange={e => setEodForm({...eodForm, eolTarget: parseInt(e.target.value) || 0})} /></div><div className="space-y-1"><label className="text-[10px] font-bold uppercase text-zinc-500">EOL Achieved</label><GlassInput type="number" value={eodForm.eolAchieve} onChange={e => setEodForm({...eodForm, eolAchieve: parseInt(e.target.value) || 0})} /></div></div>
            <GlassButton onClick={handleEODShare} className="w-full mt-4 flex items-center justify-center gap-2 rounded-3xl"><Send size={18} /> Share to WhatsApp</GlassButton>
        </div>
      </Modal>

      {zoomedImage && (
          <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-2"><button onClick={() => setZoomedImage(null)} className="absolute top-4 right-4 p-3 bg-white/10 rounded-3xl text-white hover:bg-white/20 z-50"><X size={24} /></button><img src={zoomedImage} className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-3xl" alt="Zoomed Bill" /></div>
      )}
    </div>
  );
};

export default Dashboard;
