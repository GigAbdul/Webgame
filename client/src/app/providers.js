import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiRequest, ApiClientError } from '../services/api';
import { useAuthStore } from '../store/auth-store';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 15,
            retry: 1,
        },
    },
});
function AuthSessionBootstrap() {
    const token = useAuthStore((state) => state.token);
    const isAuthResolved = useAuthStore((state) => state.isAuthResolved);
    const syncAuthUser = useAuthStore((state) => state.syncAuthUser);
    const markAuthResolved = useAuthStore((state) => state.markAuthResolved);
    const clearAuth = useAuthStore((state) => state.clearAuth);
    useEffect(() => {
        if (!token || isAuthResolved) {
            return;
        }
        const controller = new AbortController();
        void apiRequest('/api/auth/me', {
            signal: controller.signal,
        })
            .then((user) => {
            syncAuthUser(user);
        })
            .catch((error) => {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }
            if (error instanceof ApiClientError && error.statusCode === 401) {
                clearAuth();
                return;
            }
            markAuthResolved();
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                markAuthResolved();
            }
        });
        return () => {
            controller.abort();
        };
    }, [clearAuth, isAuthResolved, markAuthResolved, syncAuthUser, token]);
    return null;
}
export function AppProviders({ children }) {
    return (_jsxs(QueryClientProvider, { client: queryClient, children: [_jsx(AuthSessionBootstrap, {}), children] }));
}
