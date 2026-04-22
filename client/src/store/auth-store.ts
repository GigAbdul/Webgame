import { create } from 'zustand';
import type { User } from '../types/models';

type AuthState = {
  token: string | null;
  user: User | null;
  isAuthResolved: boolean;
  setAuth: (token: string, user: User) => void;
  syncAuthUser: (user: User) => void;
  markAuthResolved: () => void;
  clearAuth: () => void;
};

const storageKey = 'dashforge-auth';

function readStoredAuth() {
  if (typeof window === 'undefined') {
    return { token: null, user: null };
  }

  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return { token: null, user: null };
  }

  try {
    const parsed = JSON.parse(raw) as { token: string | null; user: User | null };

    if (!parsed.token || !parsed.user) {
      return { token: null, user: null };
    }

    return parsed;
  } catch {
    return { token: null, user: null };
  }
}

const initialAuth = readStoredAuth();
const hasStoredSession = Boolean(initialAuth.token && initialAuth.user);

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initialAuth.token,
  user: initialAuth.user,
  isAuthResolved: !hasStoredSession,
  setAuth: (token, user) => {
    window.localStorage.setItem(storageKey, JSON.stringify({ token, user }));
    set({ token, user, isAuthResolved: true });
  },
  syncAuthUser: (user) => {
    const token = get().token;

    if (!token) {
      set({ user: null, isAuthResolved: true });
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify({ token, user }));
    set({ user, isAuthResolved: true });
  },
  markAuthResolved: () => {
    set({ isAuthResolved: true });
  },
  clearAuth: () => {
    window.localStorage.removeItem(storageKey);
    set({ token: null, user: null, isAuthResolved: true });
  },
}));

