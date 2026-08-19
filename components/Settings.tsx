import { useState, useRef } from 'react';
import { User, Download, Database, AlertTriangle, Upload, CheckCircle2, Target, MapPin, Globe, Map as MapIcon, Save, Sun, Moon, FileSpreadsheet, Smartphone, RefreshCw, Key } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { GlassCard, GlassInput, GlassButton, Modal } from './ui/GlassComponents';
import { UserProfile, StoreLocation } from '../types';
import { saveUser, compressImage, exportFullBackup, importFullBackup, forceCloudSync } from '../services/storageService';
import { ReportAdjuster } from './ReportAdjuster';
import { usePWAInstall, InstallModal } from './InstallPWA';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue using CDN URLs to avoid module resolution errors
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface SettingsProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  onLogout: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  onDataChange?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser, onLogout, isDark, toggleTheme, onDataChange }) => {
  const [editForm, setEditForm] = useState(user);
  const [backupMonth, setBackupMonth] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempLocation, setTempLocation] = useState<StoreLocation | undefined>(user.storeLocation);
  
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState<{
      salesCount: number;
      crmCount: number;
      eodCount: number;
      userName: string;
      date: string;
  } | null>(null);
  const [pendingBackupData, setPendingBackupData] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const { isInstalled, isInIframe, triggerInstall } = usePWAInstall();
  const [showPwaGuideModal, setShowPwaGuideModal] = useState(false);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusNotification({ text, type });
    setTimeout(() => setStatusNotification(null), 5000);
  };

  const LocationMarker = () => {
    useMapEvents({
        click(e) {
            setTempLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return tempLocation ? <Marker position={[tempLocation.lat, tempLocation.lng]} /> : null;
  };

  const handleSaveLocation = () => {
      if (tempLocation) {
          const updated = { ...editForm, storeLocation: tempLocation };
          setEditForm(updated);
          saveUser(updated);
          onUpdateUser(updated);
          setShowLocationModal(false);
          showStatus("Store location registered successfully! 📍");
      }
  };

  const [saveMessage, setSaveMessage] = useState('');
  const handleSaveAll = () => {
    saveUser(editForm);
    onUpdateUser(editForm);
    setSaveMessage("Settings saved successfully! ✅");
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const base64 = await compressImage(e.target.files[0]);
              const updated = { ...editForm, avatar: base64 };
              setEditForm(updated);
              saveUser(updated);
              onUpdateUser(updated);
          } catch {
              showStatus('Image too large. Please select a smaller photo.', 'error');
          }
      }
  };

  const triggerFullBackup = async () => {
    try {
        setIsBackingUp(true);
        await exportFullBackup();
        showStatus("Backup JSON exported and downloaded successfully! 💾");
    } catch (e: any) {
        showStatus("Backup failed: " + (e?.message || String(e)), 'error');
    } finally {
        setIsBackingUp(false);
    }
  };

  const handleCloudSync = async () => {
    try {
      setIsRestoring(true); // Re-use the restoring state for loading UI
      const result = await forceCloudSync();
      if (result.success) {
        showStatus(result.message);
        if (onDataChange) onDataChange();
      } else {
        showStatus(result.message, 'error');
      }
    } catch (error: any) {
      showStatus("Sync failed: " + (error?.message || String(error)), 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
          const content = event.target?.result as string;
          if (!content || !content.trim()) {
            showStatus("Uploaded file is empty.", 'error');
            return;
          }
          const parsed = JSON.parse(content);
          
          // Support new BackupPackage, old direct JSON, or array exports
          const payload = parsed.data || (Array.isArray(parsed) ? { sales: parsed } : parsed);
          const salesList = payload.sales || payload.reports || payload.entries || (Array.isArray(parsed) ? parsed : []);
          const crmList = payload.crm || payload.complaints || [];
          const eodList = payload.eod || payload.eodEntries || [];
          const profile = payload.user || payload.userProfile || parsed.user || user;
          const timestamp = parsed.timestamp || parsed.date || new Date().toISOString();

          setRestoreSummary({ 
              salesCount: Array.isArray(salesList) ? salesList.length : 0, 
              crmCount: Array.isArray(crmList) ? crmList.length : 0, 
              eodCount: Array.isArray(eodList) ? eodList.length : 0, 
              userName: profile?.name || user.name || 'Sales Executive', 
              date: new Date(timestamp).toLocaleString() 
          });
          setPendingBackupData(content);
          setShowRestoreModal(true);
      } catch (err: any) { 
          showStatus("Error reading JSON backup: " + (err?.message || String(err)), 'error'); 
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const confirmRestore = async () => {
    if (!pendingBackupData) return;
    setIsRestoring(true);
    try {
        const result = await importFullBackup(pendingBackupData);
        if (result.success) { 
            showStatus(result.message);
            const { getUser } = await import('../services/storageService');
            const updated = getUser();
            if (updated) {
              setEditForm(updated);
              onUpdateUser(updated);
            }
            if (onDataChange) {
              onDataChange();
            }
            setShowRestoreModal(false);
            setTimeout(() => {
                window.location.reload();
            }, 800);
        } else { 
            showStatus("Restore failed: " + result.message, 'error'); 
            setShowRestoreModal(false); 
        }
    } catch (err: any) {
        showStatus("Restore failed: " + (err?.message || String(err)), 'error');
    } finally {
        setIsRestoring(false);
    }
  };

  const handlePrintView = async () => {
      const { getSalesWithoutImages, getSalesByMonth, getImagesForDate } = await import('../services/storageService');
      let salesToPrint = [];
      if (backupMonth) {
          salesToPrint = await getSalesByMonth(backupMonth);
      } else {
          salesToPrint = await getSalesWithoutImages();
      }

      if (salesToPrint.length === 0) {
          showStatus("No data found for the selected period", 'error');
          return;
      }

      const allImages: { date: string, images: string[] }[] = [];
      for (const s of salesToPrint) {
          const imgs = await getImagesForDate(s.date);
          if (imgs.length > 0) {
              allImages.push({ date: s.date, images: imgs });
          }
      }

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        let imagesHtml = '';
        if (allImages.length > 0) {
            imagesHtml = allImages.map(d => `
                <div style="margin-top: 20px;">
                    <div style="font-weight: bold; margin-bottom: 8px;">Date: ${d.date.split('-').reverse().join('/')}</div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        ${d.images.map(img => `<img src="${img}" style="width: 100%; height: 250px; object-fit: contain; border: 1px solid #ccc; border-radius: 8px;" />`).join('')}
                    </div>
                </div>
            `).join('');
        }

        printWindow.document.write(`<html><head><title>Report - ${user.name}</title><style>body { font-family: sans-serif; color: #333; padding: 30px; } h1 { color: #000; } .meta { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; } table { width: 100%; border-collapse: collapse; margin-bottom: 30px; } th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; } th { background: #f4f4f4; } .bills-title { font-weight: bold; margin: 40px 0 20px; border-left: 5px solid #000; padding-left: 10px; }</style></head><body><h1>Sales Report</h1><div class="meta"><div><strong>${user.name}</strong> • ${user.storeName}</div><div>Period: ${backupMonth || 'Full History'}</div></div><table><thead><tr><th>Date</th><th>Product Details</th><th>Qty</th><th>Value</th></tr></thead><tbody>${salesToPrint.map(s => `<tr><td>${(s.date || '').split('-').reverse().join('/')}</td><td>${s.isWeekOff ? 'WEEK OFF' : (s.items || []).map(i => `${i.productName} (${i.quantity})`).join('<br>')}</td><td>${s.totalQty || 0}</td><td>₹${(s.totalValue || 0).toLocaleString()}</td></tr>`).join('')}</tbody></table>${imagesHtml ? `<div class="bills-title">Attached Bills</div>${imagesHtml}` : ''}<script>window.onload = () => setTimeout(() => window.print(), 800)</script></body></html>`);
        printWindow.document.close();
      }
  };

  const [showReportAdjuster, setShowReportAdjuster] = useState(false);
  const [reportSales, setReportSales] = useState<any[]>([]);

  const handleExcelExport = async () => {
      if (!backupMonth) {
          showStatus("Please select a month first", 'error');
          return;
      }
      const { getSalesByMonth } = await import('../services/storageService');
      const sales = await getSalesByMonth(backupMonth);
      setReportSales(sales);
      setShowReportAdjuster(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        {/* Status Notification Banner */}
        {statusNotification && (
          <div className={`p-4 rounded-3xl backdrop-blur-md border text-sm font-semibold flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-2 ${
            statusNotification.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          }`}>
            {statusNotification.type === 'error' ? <AlertTriangle size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
            <span className="flex-1">{statusNotification.text}</span>
          </div>
        )}

        {/* Executive Profile Card */}
        <GlassCard className="p-6 relative rounded-3xl">
            <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 shadow-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        {editForm.avatar ? (
                            <img src={editForm.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={32} className="text-zinc-400" />
                        )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 text-white rounded-full cursor-pointer shadow-md hover:bg-blue-700 transition-colors">
                        <User size={12} />
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </label>
                </div>
                <div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-white">{editForm.name || "Executive Profile"}</h2>
                    <p className="text-xs text-zinc-500 font-medium">{editForm.storeName || "Store Location"}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Executive Name</label>
                        <GlassInput value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="rounded-3xl" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Employee ID</label>
                        <GlassInput value={editForm.employeeId} onChange={e => setEditForm({...editForm, employeeId: e.target.value})} className="rounded-3xl" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Phone Number</label>
                        <GlassInput value={editForm.phoneNumber} onChange={e => setEditForm({...editForm, phoneNumber: e.target.value})} className="rounded-3xl" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Store Name</label>
                        <GlassInput value={editForm.storeName} onChange={e => setEditForm({...editForm, storeName: e.target.value})} className="rounded-3xl" />
                    </div>
                </div>
            </div>
        </GlassCard>

        {/* Store Geo-Location */}
        <h3 className="font-bold text-lg px-2 flex items-center gap-2"><MapPin size={18} className="text-emerald-500" /> Store Geo-Location</h3>
        <GlassCard className="p-5 space-y-4 rounded-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Registered Store Coordinates</div>
                    <div className="text-[10px] text-zinc-500">
                        {editForm.storeLocation ? `${editForm.storeLocation.lat.toFixed(4)}, ${editForm.storeLocation.lng.toFixed(4)}` : "Location not registered yet."}
                    </div>
                </div>
                <GlassButton onClick={() => setShowLocationModal(true)} className="text-xs px-3 py-1.5 rounded-3xl flex items-center gap-1">
                    <MapIcon size={14} /> {editForm.storeLocation ? "Update Pin" : "Set Pin"}
                </GlassButton>
            </div>
        </GlassCard>

        {/* Quick Links & Brand URLs */}
        <h3 className="font-bold text-lg px-2 flex items-center gap-2"><Globe size={18} className="text-blue-500" /> Brand Portal & Support</h3>
        <GlassCard className="p-5 space-y-4 rounded-3xl">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Brand Website URL</label>
                <GlassInput placeholder="https://brand-portal.com" value={editForm.brandSiteUrl || ''} onChange={e => setEditForm({...editForm, brandSiteUrl: e.target.value})} className="rounded-3xl" />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Toll Free Number</label>
                <GlassInput placeholder="1800-XXX-XXXX" value={editForm.tollFreeNumber || ''} onChange={e => setEditForm({...editForm, tollFreeNumber: e.target.value})} className="rounded-3xl" />
            </div>
        </GlassCard>

        {/* AI & Integrations */}
        <h3 className="font-bold text-lg px-2 flex items-center gap-2"><Key size={18} className="text-purple-500" /> AI Integrations</h3>
        <GlassCard className="p-5 space-y-4 rounded-3xl">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Gemini API Key</label>
                <GlassInput 
                    type="password" 
                    placeholder="AIzaSy..." 
                    value={editForm.apiKey || ''} 
                    onChange={e => setEditForm({...editForm, apiKey: e.target.value})} 
                    className="rounded-3xl" 
                />
                <p className="text-[10px] text-zinc-500 px-2 mt-1">Required for AI-powered bill extraction and the sales coach feature.</p>
            </div>
        </GlassCard>

        {/* Performance Targets */}
        <h3 className="font-bold text-lg px-2 flex items-center gap-2"><Target size={18} className="text-orange-500" /> Performance Targets</h3>
        <GlassCard className="p-5 space-y-4 rounded-3xl">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Monthly Target (₹)</label>
                    <GlassInput type="number" value={editForm.monthlyTarget} onChange={e => setEditForm({...editForm, monthlyTarget: parseInt(e.target.value) || 0})} className="rounded-3xl" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Weekly Goal (₹)</label>
                    <GlassInput type="number" value={editForm.customTargets?.weekly || 0} onChange={e => setEditForm({...editForm, customTargets: { ...editForm.customTargets!, weekly: parseInt(e.target.value) || 0 }})} className="rounded-3xl" />
                </div>
            </div>
        </GlassCard>

        {/* Save Button */}
        <div className="px-2">
            <GlassButton onClick={handleSaveAll} className="w-full py-4 text-lg shadow-xl shadow-blue-500/20 rounded-3xl flex items-center justify-center gap-2">
                <Save size={20} /> {saveMessage || "Save All Settings"}
            </GlassButton>
        </div>

        {/* Data Management */}
        <h3 className="font-bold text-lg px-2 flex items-center gap-2"><Database size={18} className="text-indigo-500" /> Data & Reports</h3>
        <GlassCard className="p-5 space-y-4 rounded-3xl">
            <div className="grid grid-cols-3 gap-2">
                <button onClick={handleCloudSync} disabled={isRestoring} className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md border border-white/50 dark:border-white/20 shadow-sm hover:scale-[1.02] transition-all group disabled:opacity-50">
                    <RefreshCw size={24} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[9px] font-black uppercase text-center text-zinc-600 dark:text-zinc-300">Force<br/>Sync</span>
                </button>
                <button onClick={triggerFullBackup} disabled={isBackingUp} className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md border border-white/50 dark:border-white/20 shadow-sm hover:scale-[1.02] transition-all group disabled:opacity-50 disabled:pointer-events-none">
                    {isBackingUp ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : <Download size={24} className="text-indigo-600 dark:text-indigo-400" />}
                    <span className="text-[9px] font-black uppercase text-center text-zinc-600 dark:text-zinc-300">Backup<br/>JSON</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md border border-white/50 dark:border-white/20 shadow-sm hover:scale-[1.02] transition-all group">
                    <Upload size={24} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-[9px] font-black uppercase text-center text-zinc-600 dark:text-zinc-300">Restore<br/>JSON</span>
                </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={onFileChange} />
            
            <div className="pt-4 border-t border-gray-200/50 dark:border-white/10 space-y-3">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Detailed Document Export</p>
                <div className="flex gap-2">
                    <input type="month" value={backupMonth} onChange={(e) => setBackupMonth(e.target.value)} className="flex-1 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md border border-white/50 dark:border-white/20 rounded-3xl px-4 py-2 text-sm outline-none text-zinc-800 dark:text-white" />
                    <button onClick={handlePrintView} className="px-5 bg-black/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-black rounded-3xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm">PDF</button>
                    <button onClick={handleExcelExport} className="px-4 bg-emerald-600/90 backdrop-blur-md text-white rounded-3xl active:scale-95 transition-all shadow-sm flex items-center justify-center" title="Export to Excel">
                        <FileSpreadsheet size={16} />
                    </button>
                </div>
            </div>
        </GlassCard>

        {/* App Installation & PWA Section */}
        <h3 className="font-bold text-lg px-2 flex items-center gap-2"><Smartphone size={18} className="text-blue-500" /> Application &amp; Device</h3>
        <GlassCard className="p-5 space-y-4 rounded-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {isInstalled ? "SalesTrack App Installed" : "Install Standalone App"}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {isInstalled ? "Running as standalone progressive web app" : "Add to home screen for 1-tap launch & offline reporting"}
                    </div>
                </div>
                {isInstalled ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    <CheckCircle2 size={14} /> Installed
                  </div>
                ) : (
                  <GlassButton
                    onClick={() => {
                      if (isInIframe) {
                        setShowPwaGuideModal(true);
                      } else {
                        triggerInstall(() => setShowPwaGuideModal(true));
                      }
                    }}
                    className="text-xs px-4 py-2 rounded-2xl flex items-center gap-1.5 !bg-blue-600 !border-blue-500 text-white"
                  >
                    {isInIframe ? <Smartphone size={14} /> : <Download size={14} />} 
                    <span>{isInIframe ? 'Install App' : 'Install App'}</span>
                  </GlassButton>
                )}
            </div>
        </GlassCard>

        {/* Theme and Logout Controls */}
        <div className="flex gap-3">
            <GlassButton onClick={toggleTheme} variant="secondary" className="flex-1 rounded-3xl py-4 flex items-center justify-center gap-2">
                {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
                <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </GlassButton>
            <GlassButton variant="danger" onClick={onLogout} className="flex-1 rounded-3xl py-4">
                Logout Account
            </GlassButton>
        </div>

        {/* Modals */}
        <Modal isOpen={showRestoreModal} onClose={() => setShowRestoreModal(false)} title="Confirm Import">
            <div className="space-y-6">
                <div className="p-4 bg-amber-50/80 dark:bg-amber-900/30 backdrop-blur-md rounded-3xl border border-amber-200/50 dark:border-amber-800/50 flex gap-4">
                    <AlertTriangle size={32} className="text-amber-600 dark:text-amber-500 shrink-0" />
                    <div className="text-xs text-amber-800 dark:text-amber-200">
                        Warning: This will import reports, attendance, and profile data from the backup file into your account.
                    </div>
                </div>

                {restoreSummary && (
                    <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md p-4 rounded-3xl border border-white/50 dark:border-white/20 space-y-2">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Backup File Info</p>
                        <p className="text-sm font-bold text-zinc-800 dark:text-white">Executive: {restoreSummary.userName}</p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300">Sales Records: {restoreSummary.salesCount} | EOD Entries: {restoreSummary.eodCount} | CRM: {restoreSummary.crmCount}</p>
                        <p className="text-[11px] text-zinc-500">Backup Date: {restoreSummary.date}</p>
                    </div>
                )}

                <div className="flex gap-3">
                    <GlassButton disabled={isRestoring} onClick={confirmRestore} className="flex-1 !bg-amber-600/90 !border-amber-500 rounded-3xl text-white disabled:opacity-50">
                        {isRestoring ? "Restoring..." : "Confirm & Restore"}
                    </GlassButton>
                    <GlassButton disabled={isRestoring} onClick={() => setShowRestoreModal(false)} variant="secondary" className="flex-1 rounded-3xl disabled:opacity-50">
                        Cancel
                    </GlassButton>
                </div>
            </div>
        </Modal>

        <Modal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} title="Set Store Location">
            <div className="h-[300px] w-full rounded-3xl overflow-hidden relative z-0 mb-4 border border-zinc-200 dark:border-zinc-800">
                <MapContainer center={tempLocation ? [tempLocation.lat, tempLocation.lng] : [12.9716, 77.5946]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationMarker />
                </MapContainer>
                <div className="absolute bottom-2 left-2 bg-white/90 p-2 rounded-lg text-[10px] font-bold uppercase z-[400] shadow-md">Tap on map to set location</div>
            </div>
            <GlassButton onClick={handleSaveLocation} className="w-full rounded-3xl py-3">Register Location</GlassButton>
        </Modal>

        {/* Universal PWA Install Modal */}
        <InstallModal isOpen={showPwaGuideModal} onClose={() => setShowPwaGuideModal(false)} />

        {showReportAdjuster && backupMonth && (
            <ReportAdjuster
                user={user}
                sales={reportSales}
                monthDate={new Date(parseInt(backupMonth.split('-')[0]), parseInt(backupMonth.split('-')[1]) - 1, 1)}
                onClose={() => setShowReportAdjuster(false)}
            />
        )}
    </div>
  );
};

export default Settings;
