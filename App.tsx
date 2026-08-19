import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import NewEntry from './components/NewEntry';
import EOD from './components/EOD';
import CRM from './components/CRM';
import Settings from './components/Settings';
import Performance from './components/Performance';
import { Tab, UserProfile, DailyReport } from './types';
import { getUser, logoutUser, getSalesWithoutImages, getTheme, saveTheme, ensureUserProfileFromGoogle } from './services/storageService';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const App = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      return getUser();
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [salesData, setSalesData] = useState<DailyReport[]>([]);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const savedTheme = getTheme();
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
      if (isDarkMode && typeof document !== 'undefined') {
        document.documentElement.classList.add('dark');
      }
      return isDarkMode;
    } catch {
      return false;
    }
  });

  const refreshData = async () => {
    try {
      const storedSales = await getSalesWithoutImages();
      setSalesData(storedSales);
    } catch (e) {
      console.warn("refreshData error", e);
    }
  };

  useEffect(() => {
    // 1. Initial load of sales data
    refreshData();

    // 2. Listen to Firebase Auth state for cloud sync
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await ensureUserProfileFromGoogle(firebaseUser);
          if (profile) {
            setUser(profile);
          }
        } catch (err) {
          console.warn("Error fetching cloud profile:", err);
        }
        await refreshData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    saveTheme(newMode ? 'dark' : 'light');
  };

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    refreshData();
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={user}
      salesData={salesData}
      onUpdateUser={setUser}
    >
      {activeTab === 'dashboard' && <Dashboard sales={salesData} user={user} onDataChange={refreshData} onUpdateUser={setUser} />}
      {activeTab === 'entry' && <NewEntry user={user} onEntryComplete={refreshData} />}
      {activeTab === 'eod' && <EOD user={user} onUpdateUser={setUser} />}
      {activeTab === 'crm' && <CRM user={user} />}
      {activeTab === 'performance' && <Performance sales={salesData} />}
      {activeTab === 'settings' && <Settings user={user} onUpdateUser={setUser} onLogout={handleLogout} isDark={isDark} toggleTheme={toggleTheme} onDataChange={refreshData} />}
    </Layout>
  );
};

export default App;
