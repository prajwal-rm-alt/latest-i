
import React, { useState } from 'react';
import { Camera, Plus, Trash2, Send, Copy, X, Search, ChevronDown, Check, Image as ImageIcon, RefreshCcw } from 'lucide-react';
import { GlassCard, GlassButton, Modal } from './ui/GlassComponents';
import { SaleItem, UserProfile } from '../types';
import { saveSaleEntry, compressImage } from '../services/storageService';
import { generateTextReport, formatToDisplayDate } from '../services/reportService';

import { BAJAJ_PRODUCTS, MR_PRODUCTS } from "../services/excelExportService";
const PRODUCT_LIST = [...BAJAJ_PRODUCTS, ...MR_PRODUCTS].map(p => p.description);

interface NewEntryProps {
  user: UserProfile;
  onEntryComplete: () => void;
}

const NewEntry: React.FC<NewEntryProps> = ({ user, onEntryComplete }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<SaleItem[]>([
    { id: '1', productName: '', quantity: 1, price: 0 }
  ]);
  const [inputModes, setInputModes] = useState<('unit'|'total')[]>(['unit']);
  const [billImages, setBillImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isWeekOff, setIsWeekOff] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Optional Entry Details
  const [customerPhone, setCustomerPhone] = useState('');
  const [billId, setBillId] = useState('');
  const [txnNumber, setTxnNumber] = useState('');
  const [notes, setNotes] = useState('');

  const filteredProducts = searchTerm 
      ? PRODUCT_LIST.filter(p => {
          const searchWords = searchTerm.toLowerCase().split(' ').filter(Boolean);
          const productLower = p.toLowerCase();
          return searchWords.every(word => productLower.includes(word));
        })
      : PRODUCT_LIST;

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), productName: '', quantity: 1, price: 0 }]);
    setInputModes([...inputModes, 'unit']);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    const newModes = [...inputModes];
    newModes.splice(index, 1);
    setInputModes(newModes);
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const updatePrice = (index: number, value: number) => {
      const mode = inputModes[index];
      const qty = items[index].quantity || 1;
      if (mode === 'total') {
          updateItem(index, 'price', value / qty);
      } else {
          updateItem(index, 'price', value);
      }
  };

  const togglePriceMode = (index: number) => {
      const newModes = [...inputModes];
      newModes[index] = newModes[index] === 'unit' ? 'total' : 'unit';
      setInputModes(newModes);
      updateItem(index, 'price', 0);
  };

  const handleProductSelect = (index: number, name: string) => {
      updateItem(index, 'productName', name);
      setActiveSearchIndex(null);
      setSearchTerm('');
  };

  const [isScanning, setIsScanning] = useState(false);

  const handleScanBill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setIsScanning(true);
        const file = e.target.files[0];
        const base64 = await compressImage(file);
        
        // Add to images list
        setBillImages(prev => [...prev, base64]);

        const { extractDataFromBill } = await import('../services/aiService');
        const extracted = await extractDataFromBill(base64, user);

        if (extracted) {
            if (extracted.date) setDate(extracted.date);
            if (extracted.customerPhone) setCustomerPhone(extracted.customerPhone);
            if (extracted.billId) setBillId(extracted.billId);
            if (extracted.txnNumber) setTxnNumber(extracted.txnNumber);
            if (extracted.rawText) setNotes(extracted.rawText);

            if (extracted.items && extracted.items.length > 0) {
                const newItems = extracted.items.map((item, idx) => ({
                    id: (Date.now() + idx).toString(),
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.price
                }));
                setItems(newItems);
                setInputModes(newItems.map(() => 'unit'));
            }

            if (extracted.isGeyserFound) {
                const { saveComplaint } = await import('../services/storageService');
                const geyserItem = extracted.items.find(i => i.productName.toLowerCase().includes('geyser') || i.productName.toLowerCase().includes('water heater'));
                
                const complaint: any = {
                    id: Date.now().toString(),
                    customerName: extracted.customerName || 'Extracted Customer',
                    phoneNumber: extracted.customerPhone || '',
                    productModel: geyserItem?.productName || 'Geyser',
                    issueType: 'Installation',
                    isResolved: false,
                    date: extracted.date || new Date().toISOString().split('T')[0]
                };
                await saveComplaint(complaint);
                console.log("Geyser detected! 🚿 Installation ticket has been automatically raised in CRM.");
            } else {
                console.log("Bill scanned successfully! ✅ Data populated.");
            }
        }
      } catch (err: any) {
        console.log(err.message || 'Error scanning bill');
      } finally {
        setIsScanning(false);
        e.target.value = ''; // Reset file input
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const files = Array.from(e.target.files);
        const newImages = await Promise.all(files.map(f => compressImage(f as File)));
        setBillImages(prev => [...prev, ...newImages]);
      } catch (err) {
        console.log('Error uploading images');
      }
    }
  };

  const removeImage = (index: number) => {
      setBillImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!isWeekOff) {
        const invalidItems = items.some(i => !i.productName.trim() || i.quantity <= 0 || i.price < 0);
        if (invalidItems) {
            setErrorMsg('Please complete all product entries correctly. Product name cannot be empty, quantity must be > 0, and price >= 0.');
            return;
        }
    }
    
    if (isWeekOff) {
        setIsSubmitting(true);
        const { getFromStore, updateDailyReport } = await import('../services/storageService');
        const existing = await getFromStore<any>('sales', date);
        const updatedReport = {
          date,
          items: [],
          totalQty: 0,
          totalValue: 0,
          isWeekOff: true,
          billImages: existing?.billImages || []
        };
        await saveSaleEntry(date, [], []); // Basic save for weekoff
        // We use the direct storage call to force weekoff status
        await updateDailyReport(date, updatedReport);

        setIsSubmitting(false);
        setShowSuccessModal(true);
        return;
    }

    // Auto-proceed without confirm
    
    setIsSubmitting(true);
    
    const itemsToSave = items.map(item => ({
        ...item,
        customerPhone: customerPhone || undefined,
        billId: billId || undefined,
        txnNumber: txnNumber || undefined
    }));

    const { updateDailyReport, getFromStore } = await import('../services/storageService');
    await saveSaleEntry(date, itemsToSave, billImages);
    
    // Update notes if present
    if (notes) {
        const existing = await getFromStore<any>('sales', date);
        if (existing) {
            await updateDailyReport(date, { ...existing, notes });
        }
    }

    setIsSubmitting(false);
    setShowSuccessModal(true);
  };

  const handleShareWhatsApp = async () => {
      const { getSalesWithoutImages } = await import('../services/storageService');
      const allSales = await getSalesWithoutImages();
      const report = allSales.find(s => s.date === date);
      if (report) {
          const text = generateTextReport(user, report, allSales);
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }
  };

  const handleCopyText = async () => {
      if(isWeekOff) {
          navigator.clipboard.writeText(`Name: ${user.name}\nDate: ${formatToDisplayDate(date)}\nStatus: Week Off`);
          console.log('Week Off report copied');
          return;
      }
      const { getSalesWithoutImages } = await import('../services/storageService');
      const allSales = await getSalesWithoutImages();
      const report = allSales.find(s => s.date === date);
      if (report) {
          const text = generateTextReport(user, report, allSales);
          navigator.clipboard.writeText(text);
          console.log('Report copied!');
      }
  };

  const resetForm = () => {
      setItems([{ id: Date.now().toString(), productName: '', quantity: 1, price: 0 }]);
      setInputModes(['unit']);
      setBillImages([]);
      setDate(new Date().toISOString().split('T')[0]);
      setIsWeekOff(false);
      setCustomerPhone('');
      setBillId('');
      setTxnNumber('');
      setNotes('');
      setShowSuccessModal(false);
      onEntryComplete();
  };

  const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const formattedDate = formatToDisplayDate(date);

  return (
    <>
    <div className="space-y-6 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-zinc-100 dark:to-zinc-400">New Entry</h2>
        <p className="text-zinc-500 text-sm">Log your daily performance</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <GlassCard className="p-4 rounded-3xl">
          <div className="flex justify-between items-center gap-4">
             <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Date</label>
                <div className="relative w-full h-10 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md rounded-3xl px-3 flex items-center shadow-sm border border-white/40 dark:border-white/20">
                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 pointer-events-none">
                        {formatToDisplayDate(date)}
                    </span>
                    <input 
                        type="date" 
                        value={date} 
                        onChange={e => setDate(e.target.value)}
                        required
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
             </div>
             <div className="flex flex-col items-end space-y-2">
                 <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Status</span>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isWeekOff} onChange={e => setIsWeekOff(e.target.checked)} />
                    <div className="w-12 h-7 bg-zinc-200 peer-focus:outline-none rounded-3xl peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-3xl after:h-6 after:w-6 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600 shadow-inner"></div>
                    <span className="ml-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 w-12">{isWeekOff ? 'OFF' : 'Work'}</span>
                </label>
             </div>
          </div>
        </GlassCard>

        {!isWeekOff && (
        <div className="space-y-4">
            <div className="flex justify-between items-end px-1">
                <label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Products</label>
                <button type="button" onClick={addItem} className="text-blue-600 dark:text-blue-400 text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity">
                    <Plus size={16} /> Add Item
                </button>
            </div>
            
            {items.map((item, index) => {
              const mode = inputModes[index];
              const displayPrice = mode === 'total' ? (item.price * item.quantity) : item.price;
              const calculatedTotal = item.price * item.quantity;

              return (
              <div key={item.id} className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/20 shadow-sm animate-in zoom-in-95 duration-200 overflow-hidden">
                {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-red-500/80 backdrop-blur-md text-white rounded-3xl shadow-sm hover:bg-red-500/90 transition-colors z-10">
                        <Trash2 size={14} />
                    </button>
                )}
                
                <div className="p-5 space-y-4">
                    <div className="space-y-1.5 relative z-20">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Product Model</label>
                        <div className="relative">
                            <div className="flex items-center justify-between w-full bg-white/60 dark:bg-black/40 border border-white/50 dark:border-white/20 rounded-3xl px-4 py-3 cursor-pointer hover:bg-white/80 transition-colors backdrop-blur-md"
                                onClick={() => { setActiveSearchIndex(index); setSearchTerm(item.productName); }}>
                                <span className={`text-sm font-medium ${!item.productName && 'text-zinc-400 italic'}`}>
                                    {item.productName || 'Select Product...'}
                                </span>
                                <ChevronDown size={16} className="text-zinc-400" />
                            </div>

                            {activeSearchIndex === index && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-3xl shadow-sm border border-white/50 dark:border-white/20 max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 z-50">
                                    <div className="p-2 border-b border-gray-200/50 dark:border-white/10 sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
                                        <div className="flex items-center gap-2 bg-white/50 dark:bg-black/40 rounded-3xl border border-white/40 dark:border-white/10 px-3 py-1.5">
                                            <Search size={14} className="text-zinc-400" />
                                            <input autoFocus className="w-full py-1 text-sm outline-none bg-transparent" placeholder="Search model..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                            {searchTerm && <X size={14} className="text-zinc-400 cursor-pointer" onClick={() => setSearchTerm('')} />}
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto custom-scrollbar">
                                        {filteredProducts.map(p => (
                                            <div key={p} className="px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-white/10 cursor-pointer border-b border-gray-50 dark:border-white/5 last:border-0" onClick={() => handleProductSelect(index, p)}>
                                                {p}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {activeSearchIndex === index && <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setActiveSearchIndex(null)} />}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Quantity</label>
                            <input type="number" min="1" className="w-full bg-white/60 dark:bg-black/40 border-b-2 border-zinc-300 dark:border-zinc-600 focus:border-blue-500 rounded-3xl px-3 py-2.5 text-center font-mono text-lg font-semibold outline-none transition-all h-12 backdrop-blur-md" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} required />
                        </div>

                        <div className="space-y-1.5 relative">
                             <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">{mode === 'total' ? 'Total Amt' : 'Unit Price'}</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium z-10">₹</span>
                                <input type="number" min="0" step="any" className={`w-full bg-white/60 dark:bg-black/40 border-b-2 rounded-3xl pl-8 pr-3 py-2.5 font-mono text-lg font-semibold outline-none transition-all h-12 backdrop-blur-md ${mode === 'total' ? 'border-purple-400 focus:border-purple-600 text-purple-700 dark:text-purple-300' : 'border-zinc-300 dark:border-zinc-600 focus:border-blue-500'}`} value={displayPrice || ''} onChange={e => updatePrice(index, parseFloat(e.target.value) || 0)} required />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/40 dark:bg-black/40 border-t border-white/50 dark:border-white/20 p-3 flex justify-between items-center backdrop-blur-md">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium px-2">Total: <span className="text-zinc-800 dark:text-white font-bold ml-1">₹{calculatedTotal.toLocaleString()}</span></div>
                    <button type="button" onClick={() => togglePriceMode(index)} className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 px-3 py-1.5 rounded-3xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-white/50 dark:border-white/20 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors shadow-sm">
                        <RefreshCcw size={10} className={mode === 'total' ? 'text-purple-500' : ''} /> {mode === 'total' ? 'Unit Price' : 'Total Amount'}
                    </button>
                </div>
              </div>
            )})}
          </div>
          )}

        {!isWeekOff && (
        <GlassCard className="p-5 rounded-3xl space-y-4">
            <div className="space-y-3">
                <p className="font-bold text-zinc-700 dark:text-zinc-200">Optional Details</p>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Customer Phone</label>
                    <input type="tel" maxLength={10} className="w-full bg-white/60 dark:bg-black/40 border border-white/50 dark:border-white/20 rounded-3xl px-4 py-3 text-sm outline-none backdrop-blur-md" placeholder="10-digit number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Bill ID</label>
                        <input type="text" className="w-full bg-white/60 dark:bg-black/40 border border-white/50 dark:border-white/20 rounded-3xl px-4 py-3 text-sm outline-none backdrop-blur-md" placeholder="e.g. INV-001" value={billId} onChange={e => setBillId(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Txn Number</label>
                        <input type="text" className="w-full bg-white/60 dark:bg-black/40 border border-white/50 dark:border-white/20 rounded-3xl px-4 py-3 text-sm outline-none backdrop-blur-md" placeholder="e.g. TXN123" value={txnNumber} onChange={e => setTxnNumber(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Extracted Text / Notes</label>
                    <textarea className="w-full bg-white/60 dark:bg-black/40 border border-white/50 dark:border-white/20 rounded-3xl px-4 py-3 text-sm outline-none backdrop-blur-md min-h-[100px] resize-none" placeholder="Extracted text from bill will appear here..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
            </div>
        </GlassCard>
        )}

        {!isWeekOff && (
        <GlassCard className="p-5 rounded-3xl">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="font-bold text-zinc-700 dark:text-zinc-200">Bill Copies</p>
                    <p className="text-xs text-zinc-500">{billImages.length} selected</p>
                </div>
                <div className="flex gap-2">
                    <label className={`cursor-pointer bg-blue-600 dark:bg-blue-500 text-white px-3 py-1.5 rounded-3xl text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 hover:bg-blue-700 transition-colors shadow-sm ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isScanning ? <RefreshCcw size={14} className="animate-spin" /> : <Search size={14} />} 
                        {isScanning ? 'Scanning...' : 'Scan Bill'}
                        <input type="file" accept="image/*" onChange={handleScanBill} className="hidden" disabled={isScanning} />
                    </label>
                    <label className="cursor-pointer bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md border border-white/50 dark:border-white/20 text-zinc-600 dark:text-zinc-300 px-3 py-1.5 rounded-3xl text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 hover:bg-white/80 dark:hover:bg-zinc-700/80 transition-colors shadow-sm">
                        <Camera size={14} /> Add
                        <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                </div>
            </div>
            
            {billImages.length === 0 ? (
                <div className="border border-dashed border-zinc-400/50 dark:border-zinc-600/50 rounded-3xl p-8 flex flex-col items-center justify-center text-zinc-500 gap-2 bg-white/40 dark:bg-black/20 backdrop-blur-sm">
                    <ImageIcon size={32} strokeWidth={1.5} />
                    <p className="text-xs font-medium">No bills uploaded</p>
                </div>
            ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-hide">
                    {billImages.map((img, idx) => (
                        <div key={idx} className="relative flex-shrink-0 w-24 h-32 snap-start group">
                            <img src={img} alt={`Bill ${idx}`} className="w-full h-full object-cover rounded-3xl border border-white/50 dark:border-white/20 shadow-sm" />
                            <button type="button" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500/80 backdrop-blur-md text-white rounded-3xl p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </GlassCard>
        )}

        {!isWeekOff && (
        <div className="bg-white/60 dark:bg-blue-900/40 backdrop-blur-xl border border-white/50 dark:border-blue-500/30 rounded-3xl p-4 flex justify-between items-center shadow-sm">
            <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">Total Value</span>
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">₹{totalValue.toLocaleString()}</span>
        </div>
        )}

        {errorMsg && <p className="text-red-500 text-sm font-bold text-center mt-4 bg-red-100/50 p-2 rounded-xl">{errorMsg}</p>}
        <GlassButton type="submit" className="w-full py-4 text-lg shadow-xl shadow-blue-500/20 rounded-3xl" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (isWeekOff ? 'Confirm Week Off' : 'Save Entry')}
        </GlassButton>
      </form>
    </div>

    <Modal isOpen={showSuccessModal} onClose={resetForm} title={isWeekOff ? "Week Off Recorded" : "Entry Saved!"}>
        <div className="text-center space-y-6 pt-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl ${isWeekOff ? 'bg-zinc-100 text-zinc-500' : 'bg-gradient-to-tr from-green-400 to-emerald-600 text-white'}`}>
                {isWeekOff ? <Check size={40} /> : <Check size={40} strokeWidth={3} />}
            </div>
            <p className="text-zinc-600 dark:text-zinc-300 font-medium">{isWeekOff ? `Marked ${formattedDate} as Week Off.` : `Data added to cumulative report for ${formattedDate}.`}</p>
            {!isWeekOff && (
            <div className="grid grid-cols-2 gap-4">
                <button onClick={handleShareWhatsApp} className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all border border-[#25D366]/20 hover:scale-[1.02]"><Send size={24} /><span className="font-bold text-sm">WhatsApp</span></button>
                <button onClick={handleCopyText} className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all border border-blue-500/20 hover:scale-[1.02]"><Copy size={24} /><span className="font-bold text-sm">Copy</span></button>
            </div>
            )}
            <GlassButton onClick={resetForm} variant="secondary" className="w-full rounded-3xl">Close & New Entry</GlassButton>
        </div>
    </Modal>
    </>
  );
};

export default NewEntry;
