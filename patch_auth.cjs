const fs = require('fs');
let content = fs.readFileSync('components/Auth.tsx', 'utf8');

// Replace imports
content = content.replace(
  "import { saveUser } from '../services/storageService';",
  "import { saveUser, getFromStore } from '../services/storageService';\nimport { loginWithGoogle, auth } from '../services/firebase';"
);

// Add Google Sign-in state
const componentStart = `const Auth = ({ onLogin }: { onLogin: (user: UserProfile) => void }) => {`;
const newComponentStart = `const Auth = ({ onLogin }: { onLogin: (user: UserProfile) => void }) => {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);`;
content = content.replace(componentStart, newComponentStart);

// Handle Google Login
const handleGoogleLogin = `
  const handleGoogleSignIn = async () => {
    try {
      setIsCheckingProfile(true);
      const result = await loginWithGoogle();
      const user = result.user;
      setGoogleUser(user);
      
      // Check if profile exists
      const profile = await getFromStore('users', user.uid);
      if (profile) {
        onLogin(profile);
      } else {
        setFormData(prev => ({ ...prev, name: user.displayName || '' }));
        setIsCheckingProfile(false);
      }
    } catch (error) {
      console.error("Google Sign-in failed", error);
      setIsCheckingProfile(false);
    }
  };
`;

content = content.replace(
  "const validate = () => {",
  handleGoogleLogin + "\n  const validate = () => {"
);

// Modify submit to include UID
content = content.replace(
  "const user: UserProfile = {",
  "const user: UserProfile = {\n      uid: googleUser?.uid || '',"
);

// Modify UI to show Google login first, then profile form
const uiReplacement = `
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-8 animate-in zoom-in-95 duration-500 rounded-3xl border border-white/50 dark:border-white/20 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-zinc-100 dark:to-zinc-400 mb-2">SalesTrack</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Welcome back, Executive.</p>
        </div>

        {!googleUser ? (
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
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-center text-zinc-500 mb-4">Complete your profile to continue.</p>
`;

content = content.replace(
  `  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-8 animate-in zoom-in-95 duration-500 rounded-3xl border border-white/50 dark:border-white/20 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-zinc-100 dark:to-zinc-400 mb-2">SalesTrack</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Welcome back, Executive.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">`,
  uiReplacement
);

content = content.replace(
  `          <GlassButton type="submit" className="w-full mt-6 rounded-3xl">
            Get Started
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );`,
  `          <GlassButton type="submit" className="w-full mt-6 rounded-3xl">
            Get Started
          </GlassButton>
        </form>
        )}
      </GlassCard>
    </div>
  );`
);

fs.writeFileSync('components/Auth.tsx', content);
