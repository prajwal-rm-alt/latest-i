const fs = require('fs');
let content = fs.readFileSync('components/Auth.tsx', 'utf8');

const newInitAuth = `    const initAuth = async () => {
      try {
        // 1. Check if we just came back from a redirect
        const result = await Promise.race([
            getRedirectResult(auth),
            new Promise((resolve) => setTimeout(() => resolve(null), 3000)) // 3s timeout
        ]).catch(() => null) as any;
        
        let user = result?.user || null;
        
        // 2. If no redirect result, check current auth state
        if (!user) {
          user = auth.currentUser;
        }
        
        if (user && mounted) {
          setGoogleUser(user);
          const profile = await getFromStore<UserProfile>('users', user.uid);
          if (profile) {
            onLogin({ ...profile, uid: user.uid });
          } else {
            setFormData(prev => ({ ...prev, name: user?.displayName || '' }));
            setIsCheckingProfile(false);
          }
        } else if (mounted) {
           setIsCheckingProfile(false);
        }
      } catch (error) {
        console.error("Auth init failed", error);
        if (mounted) setIsCheckingProfile(false);
      }
    };`;

content = content.replace(/const initAuth = async \(\) => \{[\s\S]*?catch \(error\) \{[\s\S]*?\}\n    \};/, newInitAuth);

const newButtons = `        {!googleUser ? (
          <div className="flex flex-col gap-4">
            <GlassButton onClick={handleGoogleSignIn} disabled={isCheckingProfile} className="w-full rounded-3xl py-4 flex items-center justify-center gap-2 bg-white dark:bg-white/10 text-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-white/20">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isCheckingProfile ? "Checking..." : "Sign in with Google"}
            </GlassButton>
            <button 
              onClick={handlePopupSignIn} 
              disabled={isCheckingProfile}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2"
            >
              Alternative Sign in (Popup)
            </button>
          </div>
        ) : (`;

content = content.replace(/\{!googleUser \? \([\s\S]*?\) : \(/, newButtons);

const popupHandler = `  const handlePopupSignIn = async () => {
    try {
      setIsCheckingProfile(true);
      const { loginWithGooglePopup } = await import('../services/firebase');
      const result = await loginWithGooglePopup();
      let user = result?.user;
      if (user) {
        setGoogleUser(user);
        const profile = await getFromStore('users', user.uid);
        if (profile) {
          onLogin({ ...profile, uid: user.uid } as UserProfile);
        } else {
          setFormData(prev => ({ ...prev, name: user?.displayName || '' }));
          setIsCheckingProfile(false);
        }
      }
    } catch (error) {
      console.error("Popup Sign-in failed", error);
      setIsCheckingProfile(false);
    }
  };

  const handleGoogleSignIn = async () => {`;

content = content.replace('  const handleGoogleSignIn = async () => {', popupHandler);

fs.writeFileSync('components/Auth.tsx', content);
