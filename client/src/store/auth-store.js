import { create } from 'zustand';
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
        return JSON.parse(raw);
    }
    catch {
        return { token: null, user: null };
    }
}
const initialAuth = readStoredAuth();
export const useAuthStore = create((set) => ({
    token: initialAuth.token,
    user: initialAuth.user,
    setAuth: (token, user) => {
        window.localStorage.setItem(storageKey, JSON.stringify({ token, user }));
        set({ token, user });
    },
    clearAuth: () => {
        window.localStorage.removeItem(storageKey);
        set({ token: null, user: null });
    },
}));
