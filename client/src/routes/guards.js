import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
export function ProtectedRoute() {
    const user = useAuthStore((state) => state.user);
    const location = useLocation();
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true, state: { from: location.pathname } });
    }
    return _jsx(Outlet, {});
}
export function AdminRoute() {
    const user = useAuthStore((state) => state.user);
    const location = useLocation();
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true, state: { from: location.pathname } });
    }
    if (user.role !== 'ADMIN') {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return _jsx(Outlet, {});
}
