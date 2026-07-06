'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

type LiffContextType = {
  isInitialized: boolean;
  liffError: string | null;
  profile: LiffProfile | null;
  groupId: string | null;
  namespace: string | null;
  debugLog: string;
};

const LiffContext = createContext<LiffContextType>({
  isInitialized: false,
  liffError: null,
  profile: null,
  groupId: null,
  namespace: null,
  debugLog: '',
});

export const useLiff = () => useContext(LiffContext);

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LiffContextType>({
    isInitialized: false,
    liffError: null,
    profile: null,
    groupId: null,
    namespace: null,
    debugLog: 'v5 - Mounting...',
  });
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double-run in React Strict Mode
    if (hasRun.current) return;
    hasRun.current = true;

    const logs: string[] = ['Started...'];
    const log = (msg: string) => {
      console.log('[LIFF]', msg);
      logs.push(msg);
      setState(prev => ({ ...prev, debugLog: logs.join('\n') }));
    };

    const run = async () => {
      try {
        log('Loading LIFF SDK script...');

        // Load the LIFF SDK via a script tag
        await new Promise<void>((resolve, reject) => {
          // If already loaded (e.g. HMR), skip
          if ((window as any).liff) {
            log('LIFF SDK already loaded on window');
            resolve();
            return;
          }
          const existing = document.querySelector('script[data-liff-sdk]');
          if (existing) {
            log('Script tag already exists, waiting...');
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Script load failed')));
            return;
          }
          const s = document.createElement('script');
          s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
          s.setAttribute('data-liff-sdk', 'true');
          s.onload = () => {
            log('Script loaded successfully');
            resolve();
          };
          s.onerror = () => reject(new Error('Failed to load LIFF SDK script'));
          document.head.appendChild(s);
        });

        const liff = (window as any).liff;
        if (!liff) throw new Error('window.liff is undefined after script load');

        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        log('LIFF ID: ' + (liffId || 'MISSING!'));
        if (!liffId) throw new Error('NEXT_PUBLIC_LIFF_ID is not set in .env.local');

        log('Calling liff.init()...');
        await liff.init({ liffId });
        log('liff.init() completed');

        if (!liff.isLoggedIn()) {
          log('User not logged in - redirecting to LINE login...');
          liff.login();
          return;
        }

        log('User is logged in. Fetching profile...');
        const profile = await liff.getProfile();
        log('Profile: ' + profile.displayName);

        // Firebase Custom Auth
        const accessToken = liff.getAccessToken();
        if (accessToken) {
          log('Fetching Firebase Custom Token...');
          const authRes = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken }),
          });

          if (!authRes.ok) {
            let errText = await authRes.text();
            if (errText.includes('<!DOCTYPE html>')) {
              errText = `Server returned an HTML error page. (Status ${authRes.status}). Check Vercel logs.`;
            }
            log('Failed to fetch Custom Token: ' + errText);
            throw new Error('Firebase Auth Failed: ' + errText);
          } else {
            const { customToken } = await authRes.json();
            if (customToken) {
              log('Signing into Firebase...');
              await signInWithCustomToken(auth, customToken);
              log('Firebase Auth successful!');
            } else {
              throw new Error('No custom token received');
            }
          }
        }

        const ctx = liff.getContext();
        log('Context type: ' + (ctx?.type || 'none'));
        
        let gid = null;
        if (ctx?.type === 'group' && ctx.groupId) {
          gid = ctx.groupId;
        } else if (ctx?.type === 'room' && ctx.roomId) {
          gid = ctx.roomId;
        }
        
        if (gid) log('Group/Room ID: ' + gid);

        // Read marketId directly from URL to bypass LIFF privacy restrictions
        const searchParams = new URLSearchParams(window.location.search);
        const marketId = searchParams.get('marketId');
        
        if (marketId) log('Found marketId in URL: ' + marketId);

        setState(prev => ({
          ...prev,
          isInitialized: true,
          profile,
          groupId: gid,
          namespace: marketId || gid || `personal-${profile.userId}`,
          debugLog: logs.join('\n'),
        }));
      } catch (err: any) {
        const msg = err?.message || String(err);
        log('ERROR: ' + msg);
        setState(prev => ({
          ...prev,
          liffError: msg,
          debugLog: logs.join('\n'),
        }));
      }
    };

    run();
  }, []);

  return (
    <LiffContext.Provider value={state}>
      {children}
    </LiffContext.Provider>
  );
}
