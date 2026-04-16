import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { Button } from './ui';
import { ViewportFit } from './viewport-fit';
const primaryNavigation = [
    { to: '/', label: 'Home' },
    { to: '/levels', label: 'Official Levels' },
    { to: '/leaderboard', label: 'Leaderboard' },
];
const signedInNavigation = [
    { to: '/profile', label: 'Profile' },
    { to: '/my-levels', label: 'Workshop' },
];
export function AppLayout() {
    const location = useLocation();
    const { user, clearAuth } = useAuthStore();
    const isHomeRoute = location.pathname === '/';
    const isWorkshopDetailRoute = location.pathname.startsWith('/my-levels/');
    const levelsViewportFitClassName = location.pathname === '/levels'
        ? 'viewport-fit-frame--levels-classic'
        : 'viewport-fit-frame--arcade-blue';
    const isFullScreenArcadeRoute = location.pathname === '/levels' ||
        location.pathname === '/my-levels' ||
        location.pathname === '/leaderboard' ||
        isWorkshopDetailRoute;
    if (isFullScreenArcadeRoute) {
        return (_jsx("div", { className: "app-root app-root--levels", children: _jsx(ViewportFit, { className: levelsViewportFitClassName, children: _jsx("main", { className: "app-main app-main--levels", children: _jsx(Outlet, {}) }) }) }));
    }
    return (_jsx("div", { className: "app-root", children: _jsx(ViewportFit, { className: "viewport-fit-frame--app", children: _jsxs("div", { className: "app-shell", children: [isHomeRoute ? (_jsxs("div", { className: "app-home-toolbar", children: [_jsx("div", { className: "app-corner-chip", children: "Arcade Title Screen" }), _jsx("div", { className: "flex flex-wrap items-center gap-3", children: user ? (_jsxs(_Fragment, { children: [_jsxs(NavLink, { to: "/profile", className: "app-user-card", children: [_jsx("span", { className: "app-user-label", children: "Pilot" }), _jsx("span", { className: "app-user-name", children: user.username })] }), _jsxs("div", { className: "app-star-card", children: [_jsx("span", { className: "app-user-label", children: "Stars" }), _jsx("span", { className: "app-user-name", children: user.totalStars })] }), _jsx(Button, { variant: "ghost", onClick: () => clearAuth(), children: "Log Out" })] })) : (_jsxs(_Fragment, { children: [_jsx(NavLink, { to: "/login", children: _jsx(Button, { variant: "ghost", children: "Login" }) }), _jsx(NavLink, { to: "/register", children: _jsx(Button, { children: "Register" }) })] })) })] })) : (_jsxs("header", { className: "app-header", children: [_jsxs("div", { className: "app-header-main", children: [_jsxs(NavLink, { to: "/", className: "app-brand-lockup", children: [_jsx("div", { className: "app-brand-mark", children: "D" }), _jsxs("div", { className: "app-brand-copy", children: [_jsx("p", { className: "app-brand-eyebrow", children: "Arcade Hub" }), _jsx("h1", { className: "app-brand-title", children: "DashForge" })] })] }), _jsxs("div", { className: "app-toolbar", children: [_jsxs("div", { className: "app-toolbar-group", children: [_jsxs("div", { className: "app-status-tile", children: [_jsx("span", { className: "app-status-label", children: "Mode" }), _jsx("span", { className: "app-status-value", children: "Play / Build / Publish" })] }), _jsxs("div", { className: "app-status-tile", children: [_jsx("span", { className: "app-status-label", children: "Identity" }), _jsx("span", { className: "app-status-value", children: "Arcade First Interface" })] })] }), _jsx("div", { className: "app-toolbar-group", children: user ? (_jsxs(_Fragment, { children: [_jsxs(NavLink, { to: "/profile", className: "app-user-card", children: [_jsx("span", { className: "app-user-label", children: "Pilot" }), _jsx("span", { className: "app-user-name", children: user.username })] }), _jsxs("div", { className: "app-star-card", children: [_jsx("span", { className: "app-user-label", children: "Stars" }), _jsx("span", { className: "app-user-name", children: user.totalStars })] }), _jsx(Button, { variant: "ghost", onClick: () => clearAuth(), children: "Log Out" })] })) : (_jsxs(_Fragment, { children: [_jsx(NavLink, { to: "/login", children: _jsx(Button, { variant: "ghost", children: "Login" }) }), _jsx(NavLink, { to: "/register", children: _jsx(Button, { children: "Register" }) })] })) })] })] }), _jsx("div", { className: "app-header-rail" }), _jsxs("div", { className: "app-header-bottom", children: [_jsxs("nav", { className: "app-nav-track", children: [primaryNavigation.map((item) => (_jsx(NavLink, { to: item.to, className: ({ isActive }) => getNavClass(isActive), children: item.label }, item.to))), user
                                                ? signedInNavigation.map((item) => (_jsx(NavLink, { to: item.to, className: ({ isActive }) => getNavClass(isActive), children: item.label }, item.to)))
                                                : null, user?.role === 'ADMIN' ? (_jsx(NavLink, { to: "/admin", className: ({ isActive }) => getNavClass(isActive), children: "Admin" })) : null] }), _jsxs("div", { className: "app-marquee", children: [_jsx("span", { className: "app-marquee-pill", children: "Official Levels" }), _jsx("span", { className: "app-marquee-copy", children: "Bold neon UI, live stars, creator workshop, no ripped assets." })] })] })] })), _jsx("main", { className: "app-main", children: _jsx(Outlet, {}) })] }) }) }));
}
function getNavClass(isActive) {
    return isActive ? 'app-nav-link is-active' : 'app-nav-link';
}
