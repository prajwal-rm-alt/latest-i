import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import { CheckCircle, AlertTriangle, MapPin, Share2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard, GlassButton } from './ui/GlassComponents';
import { UserProfile, AttendanceEntry, StoreLocation } from '../types';
import { getAttendance, saveAttendance } from '../services/storageService';
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

interface AttendanceProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
}

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceEntry[]>([]);
  const [currentLocation, setCurrentLocation] = useState<StoreLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [status, setStatus] = useState<'Present' | 'Week Off' | 'Leave' | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    loadHistory();
    getLocation();
  }, []);

  const loadHistory = async () => {
    const history = await getAttendance();
    setAttendanceHistory(history);
    
    // Check today's status
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEntry = history.find(e => e.date === todayStr);
    if (todayEntry) setStatus(todayEntry.status);
  };

  const getLocation = () => {
    setLoadingLocation(true);
    if (!navigator.geolocation) {
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(loc);
        setLoadingLocation(false);

        if (user.storeLocation) {
          const dist = calculateDistance(loc.lat, loc.lng, user.storeLocation.lat, user.storeLocation.lng);
          setDistance(dist);
        }
      },
      () => {
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  };

  const handleMarkAttendance = async (type: 'Present' | 'Week Off' | 'Leave') => {
    if (type === 'Present') {
        if (!user.storeLocation) {
            console.log("Please set your store location in Settings first.");
            return;
        }
        if (!currentLocation) {
            console.log("Waiting for location... Please try again in a moment.");
            getLocation();
            return;
        }
        if (distance && distance > 200) { // 200 meters radius
            console.log(`You are ${Math.round(distance)}m away from the store. You need to be within 200m to mark Present.`);
            return;
        }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const entry: AttendanceEntry = {
        date: todayStr,
        status: type,
        checkInTime: new Date().toLocaleTimeString(),
        location: currentLocation || undefined
    };

    await saveAttendance(entry);
    await loadHistory();
    setStatus(type);
  };

  const handleShareReport = () => {
    if (!status) return;
    const todayStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
    
    // Exact format requested by user
    const text = `Name :${user.name}
Store: ${user.storeName}
Location: ${user.storeLocation?.address || 'JP Nagar 2nd phase Bengaluru'}
Date : ${todayStr}    
${status === 'Present' ? 'I am in the store sir...' : `Status: ${status}`}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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

  const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng]);
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-zinc-100 dark:to-zinc-400">Attendance</h2>
        <div className="text-xs font-bold px-3 py-1 bg-white/50 dark:bg-white/10 rounded-3xl border border-white/20">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
        </div>
      </div>

      <GlassCard className="p-4 space-y-4 rounded-3xl">
        {!user.storeLocation ? (
            <div className="text-center py-6 space-y-3">
                <AlertTriangle className="mx-auto text-amber-500" size={32} />
                <p className="text-sm text-zinc-600 dark:text-zinc-300">Store location not set.</p>
                <p className="text-xs text-zinc-500">Please go to Settings to register your store location.</p>
            </div>
        ) : (
            <>
                <div className="h-48 w-full rounded-3xl overflow-hidden relative z-0 border border-zinc-200 dark:border-zinc-800">
                    {currentLocation ? (
                        <MapContainer center={[currentLocation.lat, currentLocation.lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[currentLocation.lat, currentLocation.lng]} />
                            <Circle center={[user.storeLocation.lat, user.storeLocation.lng]} radius={200} pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.2 }} />
                            <RecenterMap lat={currentLocation.lat} lng={currentLocation.lng} />
                        </MapContainer>
                    ) : (
                        <div className="h-full w-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <p className="text-xs text-zinc-500">Locating...</p>
                        </div>
                    )}
                    <button onClick={getLocation} className="absolute bottom-2 right-2 z-[400] bg-white dark:bg-zinc-800 p-2 rounded-full shadow-md border border-zinc-200 dark:border-zinc-700">
                        <MapPin size={16} className={loadingLocation ? 'animate-bounce text-blue-500' : 'text-zinc-600 dark:text-zinc-300'} />
                    </button>
                </div>
                
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1">
                    <span>Distance: {distance !== null ? `${Math.round(distance)}m` : '---'}</span>
                    <span className={distance !== null && distance <= 200 ? 'text-green-500' : 'text-amber-500'}>
                        {distance !== null && distance <= 200 ? '✓ Within Range' : '⚠ Out of Range'}
                    </span>
                </div>

                {!status ? (
                    <div className="grid grid-cols-3 gap-3">
                        <GlassButton onClick={() => handleMarkAttendance('Present')} className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-600 dark:text-green-400 rounded-3xl py-3">Present</GlassButton>
                        <GlassButton onClick={() => handleMarkAttendance('Week Off')} className="bg-zinc-500/10 hover:bg-zinc-500/20 border-zinc-500/30 text-zinc-600 dark:text-zinc-400 rounded-3xl py-3">Off</GlassButton>
                        <GlassButton onClick={() => handleMarkAttendance('Leave')} className="bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-3xl py-3">Leave</GlassButton>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className={`p-4 rounded-3xl flex items-center justify-between border ${
                            status === 'Present' ? 'bg-green-50/50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' :
                            status === 'Week Off' ? 'bg-zinc-50/50 border-zinc-200 text-zinc-700 dark:bg-zinc-900/20 dark:border-zinc-800 dark:text-zinc-300' :
                            'bg-amber-50/50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
                        }`}>
                            <span className="font-bold flex items-center gap-2">
                                {status === 'Present' ? <CheckCircle size={18} /> : status === 'Week Off' ? <CalendarIcon size={18} /> : <AlertTriangle size={18} />}
                                Marked as {status}
                            </span>
                            <span className="text-xs opacity-70 font-mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <GlassButton onClick={handleShareReport} className="w-full flex items-center justify-center gap-2 rounded-3xl py-4 bg-zinc-900 text-white dark:bg-white dark:text-black">
                            <Share2 size={18} /> Share to WhatsApp
                        </GlassButton>
                    </div>
                )}
            </>
        )}
      </GlassCard>

      <GlassCard className="p-5 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Attendance Calendar</h3>
            <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-3xl">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-full transition-colors"><ChevronLeft size={16} /></button>
                <span className="text-xs font-bold uppercase tracking-widest">{currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-full transition-colors"><ChevronRight size={16} /></button>
            </div>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-center text-[10px] text-zinc-400 font-black uppercase">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((d, i) => {
                if (!d) return <div key={i} />;
                const entry = attendanceHistory.find(e => e.date === d.dateStr);
                let bgClass = 'bg-zinc-50 dark:bg-zinc-900/30';
                let borderClass = 'border-transparent';
                let textClass = 'text-zinc-400';
                
                if (entry) {
                    textClass = 'text-zinc-900 dark:text-white';
                    if (entry.status === 'Present') {
                        bgClass = 'bg-green-500/20 dark:bg-green-500/10';
                        borderClass = 'border-green-500/30';
                    } else if (entry.status === 'Week Off') {
                        bgClass = 'bg-zinc-500/20 dark:bg-zinc-500/10';
                        borderClass = 'border-zinc-500/30';
                    } else if (entry.status === 'Leave') {
                        bgClass = 'bg-amber-500/20 dark:bg-amber-500/10';
                        borderClass = 'border-amber-500/30';
                    }
                }
                
                const isToday = d.dateStr === new Date().toISOString().split('T')[0];
                
                return (
                    <div key={i} className={`aspect-square rounded-3xl flex items-center justify-center text-xs font-bold border transition-all ${bgClass} ${borderClass} ${textClass} ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-950' : ''}`}>
                        {d.day}
                    </div>
                );
            })}
        </div>
        <div className="mt-6 flex justify-center gap-4 text-[9px] font-bold uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /> Present</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-zinc-500" /> Week Off</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Leave</div>
        </div>
      </GlassCard>
    </div>
  );
};

export default Attendance;
