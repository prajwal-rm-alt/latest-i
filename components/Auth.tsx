import React, { useState, useEffect } from 'react';
import { GlassCard, GlassInput, GlassButton } from './ui/GlassComponents';
import { UserProfile } from '../types';
import { saveUser, ensureUserProfileFromGoogle } from '../services/storageService';
import { loginWithGooglePopup, loginWithGoogleRedirect, checkRedirectResult, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AlertCircle, RefreshCw, Smartphone, Download, ExternalLink } from 'lucide-react';
import { usePWAInstall, InstallModal } from './InstallPWA';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    phoneNumber: '',
    storeName: '',
  });

  const [errors, setErrors] = useState({
    name: '',
    employeeId: '',
    phoneNumber: '',
    storeName: '',
  });

  const [googleLoading, setGoogleLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [googleUser, setGoogleUser] = useState<any>(null);

  const { isInstallable, isInstalled, isInIframe, triggerInstall } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Check if returning from a redirect
    checkRedirectResult()
      .then(async (result) => {
        if (result && result.user && mounted) {
          setGoogleLoading(true);
          const profile = await ensureUserProfileFromGoogle(result.user);
          if (mounted) onLogin(profile);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in notice:', err);
      });

    // Check auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && mounted) {
        setGoogleUser(user);
        try {
          const profile = await ensureUserProfileFromGoogle(user);
          if (mounted && profile) {
            onLogin(profile);
          }
        } catch (e) {
          console.warn('Auth state profile sync:', e);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [onLogin]);

  const validate = () => {
    let isValid = true;
    const newErrors = { name: '', employeeId: '', phoneNumber: '', storeName: '' };

    // Name Validation: Letters and spaces only, min 2 chars
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Please enter your full name.';
      isValid = false;
    }

    // Employee ID Validation: Alphanumeric only
    if (!formData.employeeId.trim() || !/^[a-zA-Z0-9-]+$/.test(formData.employeeId.trim())) {
      newErrors.employeeId = 'Valid Employee ID required (e.g. EMP001).';
      isValid = false;
    }

    // Phone Validation: 10 digits
    if (!formData.phoneNumber.trim() || !/^\d{10}$/.test(formData.phoneNumber.replace(/[\s-]/g, ''))) {
      newErrors.phoneNumber = 'Enter a valid 10-digit mobile number.';
      isValid = false;
    }

    // Store Name Validation: Non-empty
    if (!formData.storeName.trim() || formData.storeName.trim().length < 2) {
      newErrors.storeName = 'Store name is required (e.g. Reliance Digital).';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleGoogleSignIn = async () => {
    setAuthNotice('');
    setGoogleLoading(true);

    try {
      const result = await loginWithGooglePopup();
      if (result && result.user) {
        setGoogleUser(result.user);
        const profile = await ensureUserProfileFromGoogle(result.user);
        onLogin(profile);
      }
    } catch (err: any) {
      console.warn('Google sign-in exception:', err);
      const code = err?.code || '';

      if (code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'custom domain';
        setAuthNotice(`Notice: "${domain}" needs to be authorized in Firebase Console. You can enter details below to sign in directly.`);
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/user-cancelled') {
        setAuthNotice('Google sign-in was cancelled. You can retry or fill details below.');
      } else if (code === 'auth/popup-blocked') {
        try {
          await loginWithGoogleRedirect();
          return;
        } catch {
          setAuthNotice('Popup was blocked by your browser. Please enter details below.');
        }
      } else {
        setAuthNotice('Google sign-in temporary notice. You can enter details below.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const rawPhone = formData.phoneNumber.replace(/[\s-]/g, '');
    const cleanName = formData.name.trim().toUpperCase();
    const customId = googleUser?.uid || `exec_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;

    const user: UserProfile = {
      uid: customId,
      userId: customId,
      name: cleanName,
      employeeId: formData.employeeId.trim().toUpperCase(),
      phoneNumber: rawPhone,
      storeName: formData.storeName.trim().toUpperCase(),
      email: googleUser?.email || `${cleanName.toLowerCase().replace(/\s+/g, '.')}@salestrack.app`,
      monthlyTarget: 100000,
    };

    await saveUser(user);
    onLogin(user);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-100 dark:bg-zinc-950 dark:bg-none transition-colors duration-500">
      {/* Background ambient lighting */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/15 dark:bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-500/15 dark:bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Install App Quick Pill */}
      {!isInstalled && isInstallable && (
        <button
          onClick={() => {
            if (isInIframe) {
              setShowInstallModal(true);
            } else {
              triggerInstall(() => setShowInstallModal(true));
            }
          }}
          className="mb-4 px-4 py-2 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 z-10"
        >
          <Smartphone size={14} className="text-blue-500" />
          <span>Install SalesTrack App</span>
          {isInIframe ? <ExternalLink size={12} className="text-amber-500" /> : <Download size={12} className="text-zinc-400" />}
        </button>
      )}

      <GlassCard className="w-full max-w-md p-8 animate-in zoom-in-95 duration-500 rounded-3xl relative z-10 border border-white/60 dark:border-white/10 shadow-2xl">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-lg mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-7 h-7">
              <path d="M35 65 L50 35 L65 65" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
            SalesTrack
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Welcome back, Executive.</p>
        </div>

        {/* Google Sign-in Option */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 px-5 rounded-2xl font-semibold text-sm bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-700/80 shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {googleLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span>Signing in with Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {authNotice && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-tight">{authNotice}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">or enter details</span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>

        {/* Executive Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1">Full Name</label>
            <GlassInput
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`rounded-2xl py-3 px-4 text-sm ${errors.name ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1">Employee ID</label>
            <GlassInput
              placeholder="e.g. EMP123"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className={`rounded-2xl py-3 px-4 text-sm ${errors.employeeId ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            />
            {errors.employeeId && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.employeeId}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1">Phone Number</label>
            <GlassInput
              type="tel"
              maxLength={10}
              placeholder="9876543210"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className={`rounded-2xl py-3 px-4 text-sm ${errors.phoneNumber ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            />
            {errors.phoneNumber && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.phoneNumber}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1">Store Name</label>
            <GlassInput
              placeholder="e.g. Reliance Digital, JPNagara"
              value={formData.storeName}
              onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              className={`rounded-2xl py-3 px-4 text-sm ${errors.storeName ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            />
            {errors.storeName && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.storeName}
              </p>
            )}
          </div>

          <GlassButton type="submit" className="w-full mt-6 rounded-2xl py-3.5">
            Get Started
          </GlassButton>
        </form>
      </GlassCard>

      {/* Universal Installation Guide Modal */}
      <InstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </div>
  );
};

export default Auth;
