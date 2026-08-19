import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Share2, 
  PlusSquare, 
  X, 
  Smartphone, 
  ExternalLink, 
  Copy, 
  Check, 
  Monitor
} from 'lucide-react';
import { GlassButton, Modal } from './ui/GlassComponents';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if running inside an iframe (e.g. AI Studio Preview)
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    // 2. Check if running in standalone mode (already installed & launched from homescreen/app icon)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('source=pwa');
    
    setIsInstalled(isStandalone);

    // 3. Platform & Device Detection
    const userAgent = (window.navigator.userAgent || '').toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isDesktopDevice = !isIosDevice && !isAndroidDevice && !/mobile/.test(userAgent);

    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(isDesktopDevice);

    // 4. Capture beforeinstallprompt (available in standalone Chrome/Edge/Android tabs)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (onShowGuide?: () => void) => {
    // If native prompt is ready and we are not blocked by iframe, prompt directly
    if (deferredPrompt && !isInIframe) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        return;
      } catch (err) {
        console.warn('Install prompt execution warning:', err);
      }
    }
    
    // Otherwise open the guided install modal
    if (onShowGuide) {
      onShowGuide();
    }
  };

  return {
    deferredPrompt,
    isInstallable: !!deferredPrompt || isIOS || isAndroid || !isInstalled,
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    isInIframe,
    triggerInstall,
  };
};

export const InstallModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { deferredPrompt, isIOS, isAndroid, isInIframe } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  const standaloneUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    if (!standaloneUrl) return;
    navigator.clipboard.writeText(standaloneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDirectTab = () => {
    window.open(standaloneUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativePrompt = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          onClose();
        }
      } catch (e) {
        console.warn("Direct prompt error:", e);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Install SalesTrack Application">
      <div className="space-y-4 text-zinc-800 dark:text-zinc-200">
        
        {/* Header feature summary */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-blue-900 dark:text-blue-200">Install as Native Web Application</p>
            <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">Enables offline sales entry, 1-tap home screen launch &amp; fast performance.</p>
          </div>
        </div>

        {/* If running in iframe preview */}
        {isInIframe ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="text-base">⚠️</span>
              <div>
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Browser Security Restriction: Embedded Preview
                </p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Web browsers (Chrome, Edge, Safari) strictly disable PWA app installation inside preview iframes. 
                  To install SalesTrack, open it directly in a full browser tab:
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleOpenDirectTab}
                className="flex-1 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                <ExternalLink size={14} />
                <span>Open in New Tab &amp; Install</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="py-2.5 px-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        ) : deferredPrompt ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3">
            <div className="text-xs">
              <p className="font-bold text-emerald-800 dark:text-emerald-300">Ready to Install</p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Click below to trigger the official browser install dialog.</p>
            </div>
            <button
              onClick={handleNativePrompt}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Install Now</span>
            </button>
          </div>
        ) : null}

        {/* Step-by-Step Instructions based on OS */}
        {isIOS ? (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={13} /> iPhone / iPad (Safari) Steps:
            </p>
            <ol className="space-y-2 text-xs">
              <li className="flex items-center gap-2.5 p-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                <span>Tap the <strong>Share icon</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-500" /> in Safari's bottom toolbar.</span>
              </li>
              <li className="flex items-center gap-2.5 p-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and select <strong>'Add to Home Screen'</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-blue-500" />.</span>
              </li>
              <li className="flex items-center gap-2.5 p-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                <span>Tap <strong>'Add'</strong> in the top-right corner. The app will appear on your home screen!</span>
              </li>
            </ol>
          </div>
        ) : isAndroid ? (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={13} /> Android (Chrome / Edge / Samsung) Steps:
            </p>
            <ol className="space-y-2 text-xs">
              <li className="flex items-center gap-2.5 p-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                <span>Tap the browser menu <strong>(⋮)</strong> in the top-right corner of Chrome.</span>
              </li>
              <li className="flex items-center gap-2.5 p-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                <span>Select <strong>'Install app'</strong> or <strong>'Add to Home screen'</strong>.</span>
              </li>
              <li className="flex items-center gap-2.5 p-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                <span>Confirm by tapping <strong>'Install'</strong>. SalesTrack will install to your app drawer!</span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Monitor size={13} /> Desktop (Chrome / Edge) Steps:
            </p>
            <ol className="space-y-2 text-xs">
              <li className="flex items-center gap-2.5 p-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                <span>Look for the <strong>Install icon</strong> 🖥️ / 📥 on the right side of your browser address bar.</span>
              </li>
              <li className="flex items-center gap-2.5 p-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                <span>Or open browser menu <strong>(⋮)</strong> &gt; <strong>'Save and share'</strong> &gt; <strong>'Install SalesTrack...'</strong>.</span>
              </li>
              <li className="flex items-center gap-2.5 p-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                <span>Click <strong>'Install'</strong> to create a dedicated standalone desktop app.</span>
              </li>
            </ol>
          </div>
        )}

        <div className="pt-2">
          <GlassButton onClick={onClose} className="w-full justify-center rounded-2xl py-3 text-xs">
            Got It
          </GlassButton>
        </div>
      </div>
    </Modal>
  );
};

export const InstallBanner: React.FC = () => {
  const { isInstalled, isInIframe, triggerInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled || dismissed) return null;

  const handleAction = () => {
    if (isInIframe) {
      setShowGuideModal(true);
    } else {
      triggerInstall(() => setShowGuideModal(true));
    }
  };

  return (
    <>
      <div id="pwa_install_banner" className="fixed top-20 left-4 right-4 z-40 max-w-lg mx-auto animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="bg-zinc-900/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-700/60 dark:border-white/10 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-md shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">Install SalesTrack App</p>
              <p className="text-[10px] text-zinc-400 truncate">
                {isInIframe ? 'Open tab to install app' : '1-tap launcher • Works offline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAction}
              className="px-3.5 py-1.5 bg-white text-zinc-950 font-bold text-xs rounded-xl shadow-sm hover:bg-zinc-100 active:scale-95 transition-all flex items-center gap-1.5"
            >
              {isInIframe ? <ExternalLink size={13} /> : <Download size={13} />}
              <span>{isInIframe ? 'Install App' : 'Install'}</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      <InstallModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />
    </>
  );
};

