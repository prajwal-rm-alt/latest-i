const fs = require('fs');
let content = fs.readFileSync('components/Auth.tsx', 'utf8');

content = content.replace(
  "import React, { useState } from 'react';",
  "import React, { useState, useEffect } from 'react';\nimport { getRedirectResult, onAuthStateChanged } from 'firebase/auth';\nimport { auth } from '../services/firebase';"
);

const oldHandle = `  const handleGoogleSignIn = async () => {
    try {
      setIsCheckingProfile(true);
      const result = await loginWithGoogle();
      const user = result.user;
      setGoogleUser(user);
      
      // Check if profile exists
      const profile = await getFromStore<UserProfile>('users', user.uid);
      if (profile) {
        onLogin({ ...profile, uid: user.uid });
      } else {
        setFormData(prev => ({ ...prev, name: user.displayName || '' }));
        setIsCheckingProfile(false);
      }
    } catch (error) {
      console.error("Google Sign-in failed", error);
      setIsCheckingProfile(false);
    }
  };`;

const newHandle = `  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        setIsCheckingProfile(true);
        // 1. Check if we just came back from a redirect
        const result = await getRedirectResult(auth);
        let user = result?.user;
        
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
    };
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
       if (user && !googleUser) {
          initAuth();
       } else if (!user && mounted) {
          setIsCheckingProfile(false);
       }
    });

    initAuth();
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsCheckingProfile(true);
      await loginWithGoogle(); // This now does signInWithRedirect
    } catch (error) {
      console.error("Google Sign-in failed", error);
      setIsCheckingProfile(false);
    }
  };`;

content = content.replace(oldHandle, newHandle);
fs.writeFileSync('components/Auth.tsx', content);
