import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { Button } from './ui';
import { ViewportFit } from './viewport-fit';
export function ArcadeScreenLayout() {
    const location = useLocation();
    const { user, clearAuth } = useAuthStore();
    const isHomeRoute = location.pathname === '/';
    const routeMode = location.pathname.startsWith('/editor')
        ? 'Forge Mode'
        : location.pathname.startsWith('/play')
            ? 'Run Mode'
            : 'Menu Mode';
    const routeHint = location.pathname.startsWith('/editor')
        ? 'Creator workshop and live preview'
        : location.pathname.startsWith('/play')
            ? 'Official run wrapper with session HUD'
            : 'Main menu launch scene';
    if (isHomeRoute) {
        return (_jsx("div", { className: "app-root app-root--home", children: _jsx(ViewportFit, { className: "viewport-fit-frame--home", children: _jsx("main", { className: "app-main app-main--home", children: _jsx(Outlet, {}) }) }) }));
    }
    return (_jsx("div", { className: "app-root", children: _jsx(ViewportFit, { className: "viewport-fit-frame--app", children: _jsxs("div", { className: "app-shell", children: [_jsxs("div", { className: "mode-header", children: [_jsxs("div", { className: "mode-header-main", children: [_jsxs(NavLink, { to: "/", className: "app-brand-lockup", children: [_jsx("div", { className: "app-brand-mark", children: "D" }), _jsxs("div", { className: "app-brand-copy", children: [_jsx("p", { className: "app-brand-eyebrow", children: "Arcade Route" }), _jsx("h1", { className: "app-brand-title", children: "DashForge" })] })] }), _jsxs("div", { className: "mode-header-right", children: [_jsxs("div", { className: "mode-chip-cluster", children: [_jsx("span", { className: "mode-chip", children: routeMode }), _jsx("span", { className: "mode-chip mode-chip--ghost", children: routeHint })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [!location.pathname.startsWith('/levels') && !location.pathname.startsWith('/play') ? null : (_jsx(NavLink, { to: "/levels", children: _jsx(Button, { variant: "secondary", children: "Back To Levels" }) })), user ? (_jsxs(_Fragment, { children: [_jsxs(NavLink, { to: "/profile", className: "app-user-card", children: [_jsx("span", { className: "app-user-label", children: "Pilot" }), _jsx("span", { className: "app-user-name", children: user.username })] }), _jsx(Button, { variant: "ghost", onClick: () => clearAuth(), children: "Log Out" })] })) : (_jsxs(_Fragment, { children: [_jsx(NavLink, { to: "/login", children: _jsx(Button, { variant: "ghost", children: "Login" }) }), _jsx(NavLink, { to: "/register", children: _jsx(Button, { children: "Register" }) })] }))] })] })] }), _jsxs("div", { className: "mode-header-lane", children: [_jsx("span", { children: "Neon arcade framing" }), _jsx("span", { children: "Fast readable UI" }), _jsx("span", { children: "Gameplay logic preserved" })] })] }), _jsx("main", { className: "app-main", children: _jsx(Outlet, {}) })] }) }) }));
}
