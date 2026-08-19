
import React, { useState, useMemo, useEffect } from 'react';
import { Send, Target, TrendingUp, Calendar as CalendarIcon, Trash2, Check, ChevronLeft, ChevronRight, Trophy, Wallet } from 'lucide-react';
import { GlassCard, GlassInput, GlassButton, Modal } from './ui/GlassComponents';
import { UserProfile, StoreEODEntry } from '../types';
import { saveUser, getEODEntries, saveEODEntry, deleteEODEntry } from '../services/storageService';
import { generateStoreEODReport, formatToDisplayDate } from '../services/reportService';

// Fix: Added missing EODProps interface
interface EODProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
}

const CountUp = ({ end, prefix = '', suffix = '', duration = 1000 }: { end: number, prefix?: string, suffix?: string, duration?: number }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let startTime: number;
        let animationFrame: number;
        const animate = (time: number) => {
            if (!startTime) startTime = time;
            const progress = Math.min((time - startTime) / duration, 1);
            const easeValue = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(end * easeValue));
            if (progress < 1) animationFrame = requestAnimationFrame(animate);
        };
        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);
    return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

const EOD: React.FC<EODProps> = ({ user, onUpdateUser }) => {
    const [viewMode, setViewMode] = useState<'entry' | 'calendar'>('entry');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [achievement, setAchievement] = useState<number>(0);
    const [eolAchieve, setEolAchieve] = useState<number>(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [eodHistory, setEodHistory] = useState<StoreEODEntry[]>([]);

    const [weeklyTarget, setWeeklyTarget] = useState(user.customTargets?.weekly || 0);
    const [eolTarget, setEolTarget] = useState(user.customTargets?.eol || 0);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const refreshHistory = async () => {
      const entries = await getEODEntries();
      setEodHistory(entries);
    };

    useEffect(() => { refreshHistory(); }, []);

    useEffect(() => {
        const entry = eodHistory.find(e => e.date === date);
        if (entry) {
            setAchievement(entry.achievement);
            setEolAchieve(entry.eolAchieve);
            setWeeklyTarget(entry.weekTarget);
            setEolTarget(entry.eolTarget);
        } else {
            setAchievement(0);
            setEolAchieve(0);
        }
    }, [date, eodHistory]);

    const dailyTarget = Math.round(weeklyTarget / 7);

    const calculateWeeklyAch = (targetDate: string) => {
        const d = new Date(targetDate);
        const day = d.getDay();
        const diff = (day + 6) % 7; 
        const monday = new Date(d);
        monday.setDate(d.getDate() - diff);
        monday.setHours(0,0,0,0);
        const mondayStr = monday.toISOString().split('T')[0];
        let total = eodHistory.reduce((acc, entry) => {
            if (entry.date >= mondayStr && entry.date <= targetDate) {
                if (entry.date === date) return acc;
                return acc + entry.achievement;
            }
            return acc;
        }, 0);
        total += achievement;
        return total;
    };

    const handleShare = async () => {
        const entry: StoreEODEntry = { date, achievement, eolAchieve, dayTarget: dailyTarget, weekTarget: weeklyTarget, eolTarget: eolTarget };
        await saveEODEntry(entry);
        const updatedUser = { ...user, customTargets: { weekly: weeklyTarget, daily: dailyTarget, eol: eolTarget } };
        saveUser(updatedUser);
        onUpdateUser(updatedUser);
        await refreshHistory();
        const weekAch = calculateWeeklyAch(date);
        const reportText = generateStoreEODReport(user, date, dailyTarget, achievement, weeklyTarget, weekAch, eolTarget, eolAchieve);
        window.open(`https://wa.me/?text=${encodeURIComponent(reportText)}`, '_blank');
        setShowSuccess(true);
    };

    const handleDelete = async (d: string) => {
        await deleteEODEntry(d);
        await refreshHistory();
    };

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
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

    const weekAchTotal = useMemo(() => calculateWeeklyAch(date), [date, achievement, eodHistory]);
    const weeklyRemaining = Math.max(0, weeklyTarget - weekAchTotal);
    const weeklyProgress = weeklyTarget > 0 ? Math.min((weekAchTotal / weeklyTarget) * 100, 100) : 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center animate-reveal"><h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-zinc-100 dark:to-zinc-400">Store Performance</h2><p className="text-zinc-500 text-sm">Weekly Target Tracking</p></div>
            <div className="grid grid-cols-3 gap-2 animate-reveal" style={{ animationDelay: '100ms' }}>
                <GlassCard className="p-3 flex flex-col items-center justify-center text-center bg-blue-50/50 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-500/20 rounded-3xl"><Target size={20} className="text-blue-500 mb-1" /><p className="text-[10px] uppercase text-zinc-500 font-bold">Week Target</p><p className="text-sm font-bold truncate w-full"><CountUp end={weeklyTarget} prefix="₹" /></p></GlassCard>
                <GlassCard className="p-3 flex flex-col items-center justify-center text-center bg-green-50/50 dark:bg-green-900/10 border-green-100/50 dark:border-green-500/20 rounded-3xl"><Trophy size={20} className="text-green-500 mb-1" /><p className="text-[10px] uppercase text-zinc-500 font-bold">Achieved</p><p className="text-sm font-bold truncate w-full"><CountUp end={weekAchTotal} prefix="₹" /></p></GlassCard>
                <GlassCard className="p-3 flex flex-col items-center justify-center text-center bg-orange-50/50 dark:bg-orange-900/10 border-orange-100/50 dark:border-orange-500/20 rounded-3xl"><Wallet size={20} className="text-orange-500 mb-1" /><p className="text-[10px] uppercase text-zinc-500 font-bold">Remaining</p><p className="text-sm font-bold truncate w-full"><CountUp end={weeklyRemaining} prefix="₹" /></p></GlassCard>
            </div>
            <GlassCard className="p-4 animate-reveal rounded-3xl" style={{ animationDelay: '150ms' }}><div className="flex justify-between text-[11px] font-bold uppercase text-zinc-400 mb-2"><span>Weekly Goal Progress</span><span className={weeklyProgress >= 100 ? 'text-green-500' : ''}><CountUp end={weeklyProgress} suffix="%" /></span></div><div className="h-3 w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded-3xl overflow-hidden p-0.5 shadow-inner border border-white/30 dark:border-white/10"><div className={`h-full rounded-3xl transition-all duration-1000 ease-out relative ${weeklyProgress >= 100 ? 'bg-gradient-to-r from-green-400 to-emerald-600' : 'bg-gradient-to-r from-zinc-500 to-zinc-800 dark:from-zinc-300 dark:to-zinc-600'}`} style={{ width: `${weeklyProgress}%` }}><div className="absolute inset-0 bg-white/20 animate-shine" /></div></div></GlassCard>
            <div className="flex p-1 bg-white/40 dark:bg-white/10 rounded-3xl border border-white/50 dark:border-white/20 animate-reveal" style={{ animationDelay: '200ms' }}><button onClick={() => setViewMode('entry')} className={`px-6 py-2 rounded-3xl text-sm font-bold transition-all duration-300 ${viewMode === 'entry' ? 'bg-white/80 dark:bg-zinc-800/80 text-black dark:text-white shadow-sm scale-105' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 hover:bg-white/40 dark:hover:bg-white/10'}`}>Manual Entry</button><button onClick={() => setViewMode('calendar')} className={`px-6 py-2 rounded-3xl text-sm font-bold transition-all duration-300 ${viewMode === 'calendar' ? 'bg-white/80 dark:bg-zinc-800/80 text-black dark:text-white shadow-sm scale-105' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 hover:bg-white/40 dark:hover:bg-white/10'}`}>History View</button></div>
            {viewMode === 'entry' ? (
                <div className="space-y-6">
                    <GlassCard className="p-5 space-y-5 shadow-sm rounded-3xl animate-reveal" style={{ animationDelay: '300ms' }}><div className="flex items-center gap-3 border-b border-gray-200/50 dark:border-white/10 pb-3 relative"><div className="p-2 bg-blue-500/10 rounded-3xl text-blue-500"><CalendarIcon size={20} /></div><div className="flex-1 relative"><span className="absolute inset-0 flex items-center font-bold text-lg pointer-events-none text-zinc-800 dark:text-white">{formatToDisplayDate(date)}</span><input type="date" value={date} onChange={e => setDate(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" /></div><ChevronRight size={16} className="text-zinc-400 transform rotate-90" /></div><div className="grid grid-cols-1 gap-6"><div className="space-y-2 group"><label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Target size={14} className="text-blue-500" /> Weekly Store Target (₹)</label><GlassInput type="number" placeholder="Set this week's goal" value={weeklyTarget || ''} onChange={e => setWeeklyTarget(parseInt(e.target.value) || 0)} className="font-mono text-lg rounded-3xl" /><p className="text-[10px] text-zinc-400 italic">Target applies to Mon - Sun cycle</p></div><div className="space-y-2 group"><label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14} className="text-green-500" /> Today Achievement (₹)</label><GlassInput type="number" placeholder="Enter today's total" value={achievement || ''} onChange={e => setAchievement(parseInt(e.target.value) || 0)} className="border-green-300/50 dark:border-green-500/30 font-bold text-2xl font-mono text-green-700 dark:text-green-400 h-14 rounded-3xl" /></div></div></GlassCard>
                    <GlassCard className="p-5 space-y-4 rounded-3xl animate-reveal" style={{ animationDelay: '400ms' }}><div className="flex items-center justify-between mb-2"><h3 className="font-bold text-sm text-zinc-500 uppercase tracking-widest">EOL REPORT</h3><span className="text-[10px] bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md px-2 py-0.5 rounded-3xl border border-white/40 dark:border-white/10 text-zinc-500 dark:text-zinc-400">Optional</span></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Target</label><GlassInput type="number" value={eolTarget || ''} onChange={e => setEolTarget(parseInt(e.target.value) || 0)} placeholder="0" className="h-10 text-sm rounded-3xl" /></div><div className="space-y-1"><label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Achieved</label><GlassInput type="number" value={eolAchieve || ''} onChange={e => setEolAchieve(parseInt(e.target.value) || 0)} placeholder="0" className="h-10 text-sm rounded-3xl" /></div></div></GlassCard>
                    <GlassButton onClick={handleShare} className="w-full py-4 text-lg rounded-3xl animate-reveal" style={{ animationDelay: '500ms' }}><Send size={20} /> Generate & Share Report</GlassButton>
                </div>
            ) : (
                <GlassCard className="p-4 space-y-6 rounded-3xl animate-reveal overflow-hidden" style={{ animationDelay: '300ms' }}><div className="flex items-center justify-between px-2"><button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} className="p-2 rounded-3xl hover:bg-white/40 dark:hover:bg-white/10 transition-colors"><ChevronLeft size={20} /></button><h3 className="font-bold text-lg">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3><button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} className="p-2 rounded-3xl hover:bg-white/40 dark:hover:bg-white/10 transition-colors"><ChevronRight size={20} /></button></div><div className="grid grid-cols-7 gap-2">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => ( <div key={i} className="text-center text-[10px] font-bold text-zinc-400 uppercase opacity-50">{d}</div> ))}{calendarDays.map((d, i) => { if (!d) return <div key={i} />; const entry = eodHistory.find(e => e.date === d.dateStr); const isToday = d.dateStr === new Date().toISOString().split('T')[0]; const isAchieved = entry && entry.achievement >= entry.dayTarget; return ( <div key={d.dateStr} onClick={() => { setDate(d.dateStr); setViewMode('entry'); }} style={{ animationDelay: `${i * 15}ms` }} className={`aspect-square rounded-3xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative animate-in zoom-in-90 fade-in fill-mode-backwards ${isToday ? 'border-blue-500 ring-1 ring-blue-200 dark:ring-blue-900/50 scale-105 z-10' : 'border-white/40 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/10 hover:scale-110'} ${entry ? 'bg-white/60 dark:bg-zinc-800/80 backdrop-blur-md shadow-sm border-white/50 dark:border-white/20' : 'bg-transparent'}`}> <span className={`text-xs ${isToday ? 'font-black text-blue-600' : 'text-zinc-500'}`}>{d.day}</span> {entry && ( <div className={`w-1.5 h-1.5 rounded-3xl mt-1 ${isAchieved ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-blue-400'}`} /> )} </div> ); })}</div><div className="space-y-3 pt-4 border-t border-gray-200/50 dark:border-white/10"><h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Weekly History</h4><div className="space-y-3">{eodHistory.filter(e => e.date.startsWith(currentMonth.toISOString().slice(0, 7))).sort((a,b) => b.date.localeCompare(a.date)).map((entry, idx) => ( <div key={entry.date} style={{ animationDelay: `${idx * 100}ms` }} className="flex justify-between items-center p-3 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-white/40 dark:border-white/20 hover:border-blue-400/50 transition-all group animate-in slide-in-from-right-4 fade-in fill-mode-backwards"> <div><p className="text-sm font-bold">{formatToDisplayDate(entry.date)}</p><p className="text-[10px] text-zinc-500">Achieved: ₹<CountUp end={entry.achievement} /></p></div><div className="flex items-center gap-4"><div className={`px-2 py-0.5 rounded-3xl border text-[10px] font-bold ${entry.achievement >= entry.dayTarget ? 'bg-green-100/50 border-green-200 text-green-700 dark:text-green-400' : 'bg-blue-100/50 border-blue-200 text-blue-700 dark:text-blue-400'}`}>{Math.round((entry.achievement / entry.dayTarget) * 100)}%</div><button onClick={(e) => { e.stopPropagation(); handleDelete(entry.date); }} className="text-red-500 hover:text-red-600 p-1 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded-3xl transition-colors"><Trash2 size={16} /></button></div></div> ))}</div></div></GlassCard>
            )}
            <Modal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Report Generated">
                <div className="text-center space-y-6 pt-4 animate-reveal"><div className="relative w-20 h-20 mx-auto"><div className="absolute inset-0 bg-green-500/20 rounded-3xl animate-pulse-slow scale-150" /><div className="relative w-20 h-20 bg-green-100/80 dark:bg-green-900/40 backdrop-blur-md rounded-3xl flex items-center justify-center text-green-600 shadow-sm border border-green-200 dark:border-green-800"><Check size={40} className="animate-in zoom-in duration-500" strokeWidth={3} /></div></div><div><p className="text-lg font-bold">Entry Saved!</p><p className="text-sm text-zinc-500 mt-1">EOD totals for {formatToDisplayDate(date)} have been recorded.</p></div><GlassButton onClick={() => setShowSuccess(false)} variant="secondary" className="w-full border-green-200/50 dark:border-green-800/50 rounded-3xl">Continue</GlassButton></div>
            </Modal>
        </div>
    );
};

export default EOD;
