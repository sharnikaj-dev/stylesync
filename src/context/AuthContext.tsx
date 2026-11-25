import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiFetch } from '../services/api';
import { AppUser } from '../types/stylesync';

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  dbUser: AppUser | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setDbUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setDbUser(null);
      return;
    }
    try {
      const data = await apiFetch<{ user: AppUser }>('/api/auth/me');
      setDbUser(data.user);
      setAuthError(null);
    } catch (err: any) {
      console.error('Failed to sync profile:', err);
      setAuthError(err.message || 'Unable to sync profile with server.');
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await refreshProfile();
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [refreshProfile]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      await refreshProfile();
      notify('Welcome to StyleSync AI.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Sign-in was cancelled or blocked.';
      setAuthError(msg);
      notify(msg, 'error');
    }
  }, [notify, refreshProfile]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setDbUser(null);
    notify('Signed out safely.', 'info');
  }, [notify]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        loading,
        authError,
        signInWithGoogle,
        logout,
        refreshProfile,
        setDbUser,
        notify,
      }}
    >
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`px-4 py-3 rounded-lg border shadow-sm text-sm font-medium transition-all ${
              toast.type === 'error'
                ? 'bg-[#FDF2F2] border-[#E5B8B8] text-[#8B2E2E]'
                : toast.type === 'success'
                  ? 'bg-[#F2F7F3] border-[#BBD3BF] text-[#284D31]'
                  : 'bg-white border-[#E5DFD6] text-[#1C1917]'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
