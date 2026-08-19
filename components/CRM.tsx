import { useState, useEffect } from 'react';
import { Phone, CheckCircle, Globe, Plus, ClipboardList, Package, Bell, History, Clock, ChevronRight, Calendar } from 'lucide-react';
import { GlassCard, GlassInput, GlassButton, Modal } from './ui/GlassComponents';
import { Complaint, UserProfile, FollowUp, ComplaintStatus, ComplaintTimelineEvent } from '../types';
import { getComplaints, saveComplaint, updateComplaint, getFollowUps, saveFollowUp, updateFollowUp, deleteFollowUp } from '../services/storageService';
import { formatToDisplayDate } from '../services/reportService';

interface CRMProps {
  user: UserProfile;
}

const CRM: React.FC<CRMProps> = ({ user }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [formData, setFormData] = useState({ 
      customerName: '', 
      phoneNumber: '', 
      productModel: '', 
      customProductName: '',
      issueType: 'Installation' as const
  });
  const [followUpForm, setFollowUpForm] = useState({
      customerName: '',
      phoneNumber: '',
      reminderDate: new Date().toISOString().split('T')[0],
      note: ''
  });
  const [view, setView] = useState<'new' | 'history' | 'followups'>('history');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [newTimelineNote, setNewTimelineNote] = useState('');
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('Raised');
  const [repairsDone, setRepairsDone] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');

  const refreshData = async () => {
    const [cList, fList] = await Promise.all([getComplaints(), getFollowUps()]);
    setComplaints(cList);
    setFollowUps(fList);
  };

  useEffect(() => { refreshData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phoneNumber.length !== 10) {
        console.log("Phone number must be exactly 10 digits.");
        return;
    }
    const newId = Date.now().toString();
    const now = new Date().toISOString();
    const newComplaint: Complaint = { 
        id: newId, 
        ...formData, 
        status: 'Raised',
        timeline: [{ status: 'Raised', date: now, note: 'Ticket created' }],
        date: now 
    };
    await saveComplaint(newComplaint);
    await refreshData();
    setShowSuccessModal(true);
    setFormData({ customerName: '', phoneNumber: '', productModel: '', customProductName: '', issueType: 'Installation' });
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Date.now().toString();
    const newFollowUp: FollowUp = {
        id: newId,
        ...followUpForm,
        isCompleted: false,
        createdAt: new Date().toISOString()
    };
    await saveFollowUp(newFollowUp);
    await refreshData();
    setShowFollowUpModal(false);
    setFollowUpForm({ customerName: '', phoneNumber: '', reminderDate: new Date().toISOString().split('T')[0], note: '' });
  };

  const handleUpdateStatus = async () => {
    if (!selectedComplaint) return;
    const now = new Date().toISOString();
    const updatedTimeline: ComplaintTimelineEvent[] = [
        ...(selectedComplaint.timeline || []),
        { status: newStatus, date: now, note: newTimelineNote }
    ];
    const updated: Complaint = {
        ...selectedComplaint,
        status: newStatus,
        timeline: updatedTimeline,
        repairsDone: newStatus === 'Resolved' ? repairsDone : selectedComplaint.repairsDone,
        partsReplaced: newStatus === 'Resolved' ? partsReplaced : selectedComplaint.partsReplaced
    };
    await updateComplaint(updated);
    await refreshData();
    setSelectedComplaint(updated);
    setNewTimelineNote('');
    setRepairsDone('');
    setPartsReplaced('');
    setShowTimelineModal(false);
  };

  const toggleFollowUp = async (f: FollowUp) => {
    const updated = { ...f, isCompleted: !f.isCompleted };
    await updateFollowUp(updated);
    await refreshData();
  };

  const removeFollowUp = async (id: string) => {
    await deleteFollowUp(id);
    await refreshData();
  };

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
        case 'Raised': return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
        case 'In progress': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
        case 'Technician assigned': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
        case 'Resolved': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
        default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  const handleRedirect = (type: 'site' | 'call') => {
      if (type === 'site' && user.brandSiteUrl) {
          window.open(user.brandSiteUrl, '_blank');
      } else if (type === 'call' && user.tollFreeNumber) {
          window.location.href = `tel:${user.tollFreeNumber}`;
      }
      setShowSuccessModal(false);
      setView('history');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
       <div className="flex flex-col gap-4 mb-6">
           <div className="flex justify-between items-center">
               <div className="flex items-center gap-3">
                   <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-zinc-100 dark:to-zinc-400">CRM</h2>
                   {(user.tollFreeNumber || user.brandSiteUrl) && (
                       <div className="flex items-center gap-2 ml-2">
                           {user.tollFreeNumber && (
                               <button onClick={() => window.location.href = `tel:${user.tollFreeNumber}`} className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full hover:scale-110 transition-transform shadow-sm" title="Call Service Center">
                                   <Phone size={16} />
                               </button>
                           )}
                           {user.brandSiteUrl && (
                               <button onClick={() => window.open(user.brandSiteUrl, '_blank')} className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:scale-110 transition-transform shadow-sm" title="Open Brand Site">
                                   <Globe size={16} />
                               </button>
                           )}
                       </div>
                   )}
               </div>
               <div className="flex p-1 bg-white/40 dark:bg-white/10 rounded-3xl border border-white/50 dark:border-white/20 backdrop-blur-md">
                   <button onClick={() => setView('history')} className={`px-3 py-1.5 rounded-3xl text-[10px] font-bold transition-all ${view === 'history' ? 'bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white' : 'text-zinc-500'}`}>History</button>
                   <button onClick={() => setView('followups')} className={`px-3 py-1.5 rounded-3xl text-[10px] font-bold transition-all ${view === 'followups' ? 'bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white' : 'text-zinc-500'} relative`}>
                       Follow-ups
                       {followUps.filter(f => !f.isCompleted).length > 0 && (
                           <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900" />
                       )}
                   </button>
                   <button onClick={() => setView('new')} className={`px-3 py-1.5 rounded-3xl text-[10px] font-bold transition-all ${view === 'new' ? 'bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white' : 'text-zinc-500'}`}>New Ticket</button>
               </div>
           </div>
       </div>

       {view === 'new' ? (
           <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-right-4">
               <GlassCard className="p-6 space-y-5 rounded-3xl">
                   <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-3 mb-2">
                       <Plus className="text-blue-500" size={20} />
                       <h3 className="font-bold text-lg">Create New Ticket</h3>
                   </div>
                   
                   <div className="space-y-1">
                       <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Customer Name</label>
                       <GlassInput required placeholder="Enter customer name" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="rounded-3xl" />
                   </div>
                   
                   <div className="space-y-1">
                       <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Phone Number</label>
                       <GlassInput required type="tel" maxLength={10} placeholder="9876543210" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10)})} className="rounded-3xl" />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Product Model</label>
                           <GlassInput required placeholder="GX1 Mixer" value={formData.productModel} onChange={e => setFormData({...formData, productModel: e.target.value})} className="rounded-3xl" />
                       </div>
                       <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Custom Product</label>
                           <GlassInput placeholder="Optional" value={formData.customProductName || ''} onChange={e => setFormData({...formData, customProductName: e.target.value})} className="rounded-3xl" />
                       </div>
                   </div>

                   <div className="space-y-1">
                       <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Issue Type</label>
                       <select className="w-full bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md border border-white/50 dark:border-white/20 rounded-3xl px-4 py-3 outline-none text-zinc-800 dark:text-white shadow-sm text-sm font-bold" value={formData.issueType} onChange={e => setFormData({...formData, issueType: e.target.value as any})}>
                           <option value="Installation" className="text-black">Installation</option>
                           <option value="Complaint" className="text-black">Complaint</option>
                           <option value="Store Stock" className="text-black">Store Stock</option>
                           <option value="Store Stack" className="text-black">Store Stack</option>
                       </select>
                   </div>

                   <GlassButton type="submit" className="w-full mt-4 rounded-3xl py-4 text-lg shadow-lg shadow-blue-500/10">
                       Save & Proceed
                   </GlassButton>
               </GlassCard>
           </form>
       ) : view === 'followups' ? (
           <div className="space-y-4 animate-in slide-in-from-bottom-4">
               <div className="flex justify-between items-center">
                   <h3 className="font-bold text-zinc-500 flex items-center gap-2">
                       <Bell size={18} className="text-red-500" />
                       Active Reminders
                   </h3>
                   <button onClick={() => setShowFollowUpModal(true)} className="p-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-full shadow-lg active:scale-95 transition-transform">
                       <Plus size={20} />
                   </button>
               </div>

               {followUps.length === 0 && (
                   <div className="text-center py-20 bg-white/20 dark:bg-white/5 rounded-3xl border border-dashed border-white/30">
                       <Bell className="mx-auto text-zinc-400 mb-2" size={40} />
                       <p className="text-zinc-500 font-medium">No follow-ups scheduled.</p>
                   </div>
               )}

               {followUps.sort((a,b) => a.reminderDate.localeCompare(b.reminderDate)).map(f => (
                   <GlassCard key={f.id} className={`p-4 rounded-3xl border border-white/40 dark:border-white/10 transition-opacity ${f.isCompleted ? 'opacity-50' : ''}`}>
                       <div className="flex justify-between items-start">
                           <div className="space-y-1">
                               <div className="flex items-center gap-2 mb-1">
                                   <span className={`text-[9px] px-2 py-0.5 rounded-3xl border font-black uppercase tracking-widest ${new Date(f.reminderDate) < new Date() && !f.isCompleted ? 'bg-red-100 border-red-200 text-red-700' : 'bg-zinc-100 border-zinc-200 text-zinc-700'}`}>
                                       {new Date(f.reminderDate) < new Date() && !f.isCompleted ? 'Overdue' : 'Scheduled'}
                                   </span>
                                   <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                       <Calendar size={10} /> {f.reminderDate}
                                   </span>
                               </div>
                               <h4 className="font-bold text-lg text-zinc-800 dark:text-white">{f.customerName}</h4>
                               <p className="text-sm text-zinc-500 italic">"{f.note}"</p>
                               <div className="flex items-center gap-3 mt-2">
                                   <a href={`tel:${f.phoneNumber}`} className="text-xs text-blue-500 font-bold flex items-center gap-1.5">
                                       <Phone size={12} /> {f.phoneNumber}
                                   </a>
                                   <button onClick={() => removeFollowUp(f.id)} className="text-xs text-red-500 font-bold">Delete</button>
                               </div>
                           </div>
                           <button onClick={() => toggleFollowUp(f)} className={`p-3 rounded-3xl transition-all ${f.isCompleted ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-zinc-300 bg-zinc-100 dark:bg-zinc-800'}`}>
                               <CheckCircle size={24} />
                           </button>
                       </div>
                   </GlassCard>
               ))}
           </div>
       ) : (
           <div className="space-y-4 animate-in slide-in-from-left-4">
               {complaints.length === 0 && (
                   <div className="text-center py-20 bg-white/20 dark:bg-white/5 rounded-3xl border border-dashed border-white/30">
                       <ClipboardList className="mx-auto text-zinc-400 mb-2" size={40} />
                       <p className="text-zinc-500 font-medium">No tickets raised yet.</p>
                   </div>
               )}
               {complaints.sort((a,b) => b.date.localeCompare(a.date)).map(c => (
                   <GlassCard key={c.id} onClick={() => setSelectedComplaint(c)} className="p-4 relative overflow-hidden group rounded-3xl border border-white/40 dark:border-white/10 cursor-pointer active:scale-[0.98] transition-all">
                       <div className={`absolute top-0 left-0 w-1.5 h-full ${c.status === 'Resolved' || c.isResolved ? 'bg-green-500' : 'bg-red-500'}`} />
                       <div className="pl-3 flex justify-between items-start">
                           <div className="space-y-1">
                               <div className="flex items-center gap-2 mb-1">
                                   <span className={`text-[9px] px-2 py-0.5 rounded-3xl border font-black uppercase tracking-widest ${c.issueType === 'Installation' ? 'bg-blue-100/50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : (c.issueType === 'Store Stock' || c.issueType === 'Store Stack') ? 'bg-emerald-100/50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300' : 'bg-orange-100/50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300'}`}>{c.issueType}</span>
                                   <span className={`text-[9px] px-2 py-0.5 rounded-3xl font-bold uppercase tracking-widest ${getStatusColor(c.status || (c.isResolved ? 'Resolved' : 'Raised'))}`}>
                                       {c.status || (c.isResolved ? 'Resolved' : 'Raised')}
                                   </span>
                                   <span className="text-[10px] font-bold text-zinc-400 ml-1">{formatToDisplayDate(c.date)}</span>
                               </div>
                               <h4 className="font-bold text-lg text-zinc-800 dark:text-white">{c.customerName}</h4>
                               <div className="flex items-center gap-2 text-zinc-500">
                                   <Package size={14} />
                                   <p className="text-sm font-medium">{c.productModel} {c.customProductName ? `(${c.customProductName})` : ''}</p>
                               </div>
                               <div className="flex items-center gap-3 mt-1">
                                   <div className="text-sm text-blue-500 font-bold flex items-center gap-1.5">
                                       <Phone size={14} /> {c.phoneNumber}
                                   </div>
                                   <div className="flex items-center gap-1 text-zinc-400 text-xs">
                                       <Clock size={12} />
                                       {c.timeline?.length || 1} steps
                                   </div>
                               </div>
                           </div>
                           <div className="flex flex-col items-end gap-2">
                               <ChevronRight className="text-zinc-300" />
                           </div>
                       </div>
                   </GlassCard>
               ))}
           </div>
       )}

       {/* Complaint Detail Modal */}
       <Modal isOpen={!!selectedComplaint} onClose={() => setSelectedComplaint(null)} title="Ticket Lifecycle">
           {selectedComplaint && (
               <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
                   <div className="flex justify-between items-start bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                       <div className="space-y-1">
                           <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Customer</p>
                           <h4 className="font-bold text-xl">{selectedComplaint.customerName}</h4>
                           <p className="text-sm text-zinc-500">{selectedComplaint.phoneNumber}</p>
                       </div>
                       <div className={`px-3 py-1 rounded-3xl text-[10px] font-bold uppercase tracking-widest ${getStatusColor(selectedComplaint.status)}`}>
                           {selectedComplaint.status}
                       </div>
                   </div>

                   <div className="space-y-4">
                       <h5 className="text-xs font-bold uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                           <History size={14} /> Timeline
                       </h5>
                       <div className="space-y-6 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800 ml-2">
                           {(selectedComplaint.timeline || []).map((event, i) => (
                               <div key={i} className="relative">
                                   <div className={`absolute -left-[25px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 ${i === (selectedComplaint.timeline?.length || 0) - 1 ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                                   <div className="space-y-1">
                                       <div className="flex justify-between items-center">
                                           <p className="text-sm font-bold">{event.status}</p>
                                           <p className="text-[10px] text-zinc-400">{new Date(event.date).toLocaleString()}</p>
                                       </div>
                                       {event.note && <p className="text-xs text-zinc-500 italic">"{event.note}"</p>}
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>

                   {selectedComplaint.status !== 'Resolved' && (
                       <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                           <h5 className="text-xs font-bold uppercase text-zinc-400 tracking-widest">Update Progress</h5>
                           <div className="grid grid-cols-2 gap-2">
                               {(['In progress', 'Technician assigned', 'Resolved'] as ComplaintStatus[]).map(s => (
                                   <button key={s} onClick={() => { setNewStatus(s); setShowTimelineModal(true); }} className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-[10px] font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                                       Move to {s}
                                   </button>
                               ))}
                           </div>
                       </div>
                   )}

                   <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                       <h5 className="text-xs font-bold uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                           <History size={14} /> Service History
                       </h5>
                       <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                           <div className="flex justify-between text-xs">
                               <span className="text-zinc-400">Repairs Done:</span>
                               <span className="font-medium">{selectedComplaint.repairsDone || 'None recorded'}</span>
                           </div>
                           <div className="flex justify-between text-xs">
                               <span className="text-zinc-400">Parts Replaced:</span>
                               <span className="font-medium">{selectedComplaint.partsReplaced || 'None recorded'}</span>
                           </div>
                       </div>
                   </div>

                   <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                       <h5 className="text-xs font-bold uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                           <ClipboardList size={14} /> Past Complaints
                       </h5>
                       <div className="space-y-2">
                           {complaints
                               .filter(c => c.phoneNumber === selectedComplaint.phoneNumber && c.id !== selectedComplaint.id)
                               .sort((a,b) => b.date.localeCompare(a.date))
                               .map(pc => (
                                   <div key={pc.id} className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                                       <div className="flex justify-between items-center mb-1">
                                           <span className="text-[10px] font-bold text-zinc-400">{formatToDisplayDate(pc.date)}</span>
                                           <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${getStatusColor(pc.status)}`}>{pc.status}</span>
                                       </div>
                                       <p className="text-xs font-bold">{pc.productModel}</p>
                                       <p className="text-[10px] text-zinc-500 line-clamp-1">{pc.timeline?.[pc.timeline.length-1]?.note || 'No notes'}</p>
                                   </div>
                               ))}
                           {complaints.filter(c => c.phoneNumber === selectedComplaint.phoneNumber && c.id !== selectedComplaint.id).length === 0 && (
                               <p className="text-[10px] text-zinc-400 text-center py-2 italic">No past history for this number.</p>
                           )}
                       </div>
                   </div>

                   <div className="flex gap-2 pt-4">
                       <GlassButton onClick={() => window.location.href = `tel:${selectedComplaint.phoneNumber}`} className="flex-1 rounded-3xl py-3 text-sm">
                           <Phone size={16} className="mr-2" /> Call Customer
                       </GlassButton>
                       <GlassButton onClick={() => { setFollowUpForm({...followUpForm, customerName: selectedComplaint.customerName, phoneNumber: selectedComplaint.phoneNumber}); setShowFollowUpModal(true); }} variant="secondary" className="flex-1 rounded-3xl py-3 text-sm">
                           <Bell size={16} className="mr-2" /> Set Follow-up
                       </GlassButton>
                   </div>
               </div>
           )}
       </Modal>

       {/* Update Status Modal */}
       <Modal isOpen={showTimelineModal} onClose={() => setShowTimelineModal(false)} title={`Update to ${newStatus}`}>
           <div className="space-y-4">
               {newStatus === 'Resolved' && (
                   <>
                       <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Repairs Done</label>
                           <GlassInput placeholder="Describe repairs" value={repairsDone} onChange={e => setRepairsDone(e.target.value)} className="rounded-3xl" />
                       </div>
                       <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Parts Replaced</label>
                           <GlassInput placeholder="List parts" value={partsReplaced} onChange={e => setPartsReplaced(e.target.value)} className="rounded-3xl" />
                       </div>
                   </>
               )}
               <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Note / Remarks</label>
                   <textarea className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-3xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" rows={3} placeholder="Add any details about this update..." value={newTimelineNote} onChange={e => setNewTimelineNote(e.target.value)} />
               </div>
               <GlassButton onClick={handleUpdateStatus} className="w-full rounded-3xl py-4">
                   Confirm Update
               </GlassButton>
           </div>
       </Modal>

       {/* New Follow-up Modal */}
       <Modal isOpen={showFollowUpModal} onClose={() => setShowFollowUpModal(false)} title="Schedule Follow-up">
           <form onSubmit={handleFollowUpSubmit} className="space-y-4">
               <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Customer Name</label>
                   <GlassInput required value={followUpForm.customerName} onChange={e => setFollowUpForm({...followUpForm, customerName: e.target.value})} className="rounded-3xl" />
               </div>
               <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Phone Number</label>
                   <GlassInput required maxLength={10} value={followUpForm.phoneNumber} onChange={e => setFollowUpForm({...followUpForm, phoneNumber: e.target.value.replace(/\D/g, '')})} className="rounded-3xl" />
               </div>
               <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Reminder Date</label>
                   <GlassInput required type="date" value={followUpForm.reminderDate} onChange={e => setFollowUpForm({...followUpForm, reminderDate: e.target.value})} className="rounded-3xl" />
               </div>
               <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Note</label>
                   <GlassInput required placeholder="e.g., Call after 3 days" value={followUpForm.note} onChange={e => setFollowUpForm({...followUpForm, note: e.target.value})} className="rounded-3xl" />
               </div>
               <GlassButton type="submit" className="w-full rounded-3xl py-4">
                   Save Reminder
               </GlassButton>
           </form>
       </Modal>

         <Modal isOpen={showSuccessModal} onClose={() => { setShowSuccessModal(false); setView('history'); }} title="Ticket Created Successfully">
             <div className="space-y-6 text-center py-4">
                 <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500 mb-2 border border-green-500/20">
                     <CheckCircle size={40} />
                 </div>
                 <div className="space-y-1">
                     <p className="text-lg font-bold">Progress Saved!</p>
                     <p className="text-sm text-zinc-500">What would you like to do next for this customer?</p>
                 </div>
                 <div className="grid grid-cols-1 gap-3 pt-2">
                     <GlassButton onClick={() => { setFollowUpForm({...followUpForm, customerName: formData.customerName, phoneNumber: formData.phoneNumber}); setShowFollowUpModal(true); setShowSuccessModal(false); }} className="w-full rounded-3xl flex items-center justify-center gap-3 py-4 bg-red-600 text-white border-red-500">
                         <Bell size={20} /> Set Follow-up Reminder
                     </GlassButton>
                     {user.brandSiteUrl && (
                         <GlassButton onClick={() => handleRedirect('site')} className="w-full rounded-3xl flex items-center justify-center gap-3 py-4 bg-blue-600 text-white border-blue-500">
                             <Globe size={20} /> Open Brand Site
                         </GlassButton>
                     )}
                     <GlassButton onClick={() => { setShowSuccessModal(false); setView('history'); }} variant="secondary" className="w-full rounded-3xl py-3 text-zinc-500">
                         Dismiss
                     </GlassButton>
                 </div>
             </div>
         </Modal>
    </div>
  );
};

export default CRM;
