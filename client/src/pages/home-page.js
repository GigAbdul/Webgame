import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HomeMenuTraffic } from '../components/home-menu-traffic';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/auth-store';
const homeSkinStorageKey = 'dashforge-home-skin';
const homeSettingsStorageKey = 'dashforge-home-settings';
const skinOptions = [
    {
        id: 'pulse',
        name: 'Pulse',
        accent: 'Pink-Cyan',
        flavor: 'Fast neon default with sharp contrast.',
    },
    {
        id: 'nova',
        name: 'Nova',
        accent: 'Gold-Orange',
        flavor: 'Warm arcade glow for brighter stages.',
    },
    {
        id: 'volt',
        name: 'Volt',
        accent: 'Lime-Blue',
        flavor: 'Electric palette tuned for clear silhouettes.',
    },
];
const adminToolOptions = [
    {
        id: 'dashboard',
        name: 'Control Room',
        accent: 'Overview Hub',
        flavor: 'Главная админ-панель со статусом системы и быстрыми переходами.',
        route: '/admin',
        routeLabel: '/admin',
    },
    {
        id: 'queue',
        name: 'Review Queue',
        accent: 'Moderation Flow',
        flavor: 'Проверка отправленных уровней, official-решения и publish control.',
        route: '/admin/levels',
        routeLabel: '/admin/levels',
    },
    {
        id: 'forge',
        name: 'Official Forge',
        accent: 'Create Stage',
        flavor: 'Старт нового official-уровня с админским драфтом и редактором.',
        route: '/admin/create-official',
        routeLabel: '/admin/create-official',
    },
    {
        id: 'skins',
        name: 'Skin Lab',
        accent: 'Pixel Workshop',
        flavor: 'Редактор скинов с заливкой, слоями, undo/redo и игровым preview.',
        route: '/admin/player-skins',
        routeLabel: '/admin/player-skins',
    },
    {
        id: 'users',
        name: 'Users',
        accent: 'Account Watch',
        flavor: 'Список игроков, статусы аккаунтов и быстрая ручная проверка.',
        route: '/admin/users',
        routeLabel: '/admin/users',
    },
];
const defaultSettings = {
    musicVolume: 70,
    sfxVolume: 80,
    screenShake: true,
    showHitFlash: true,
};
function isSkinId(value) {
    return value === 'pulse' || value === 'nova' || value === 'volt';
}
function clampPercentage(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
}
function readStoredSkin() {
    if (typeof window === 'undefined') {
        return 'pulse';
    }
    const storedValue = window.localStorage.getItem(homeSkinStorageKey);
    return isSkinId(storedValue) ? storedValue : 'pulse';
}
function readStoredSettings() {
    if (typeof window === 'undefined') {
        return defaultSettings;
    }
    const raw = window.localStorage.getItem(homeSettingsStorageKey);
    if (!raw) {
        return defaultSettings;
    }
    try {
        const parsed = JSON.parse(raw);
        return {
            musicVolume: clampPercentage(parsed.musicVolume ?? defaultSettings.musicVolume),
            sfxVolume: clampPercentage(parsed.sfxVolume ?? defaultSettings.sfxVolume),
            screenShake: Boolean(parsed.screenShake ?? defaultSettings.screenShake),
            showHitFlash: Boolean(parsed.showHitFlash ?? defaultSettings.showHitFlash),
        };
    }
    catch {
        return defaultSettings;
    }
}
export function HomePage() {
    const user = useAuthStore((state) => state.user);
    const isAdmin = user?.role === 'ADMIN';
    const playRoute = '/levels';
    const builderRoute = user ? '/my-levels' : '/register';
    const homeScreenRef = useRef(null);
    const [activePanel, setActivePanel] = useState(null);
    const [selectedSkin, setSelectedSkin] = useState(() => readStoredSkin());
    const [settings, setSettings] = useState(() => readStoredSettings());
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        window.localStorage.setItem(homeSkinStorageKey, selectedSkin);
    }, [selectedSkin]);
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        window.localStorage.setItem(homeSettingsStorageKey, JSON.stringify(settings));
    }, [settings]);
    useEffect(() => {
        if (!activePanel) {
            return;
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setActivePanel(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activePanel]);
    return (_jsxs("div", { ref: homeScreenRef, className: "game-home-screen", "data-screen-shake": settings.screenShake ? 'on' : 'off', children: [_jsxs("div", { className: "game-home-atmosphere", "aria-hidden": "true", children: [_jsx("div", { className: "game-home-stars" }), _jsx("div", { className: "game-home-planet-glow" }), _jsx("div", { className: "game-home-planet" }), _jsx("div", { className: "game-home-grid" }), _jsx("div", { className: "game-home-skyline game-home-skyline--rear" }), _jsx("div", { className: "game-home-skyline game-home-skyline--front" }), _jsx("div", { className: "game-home-stage-lane" }), _jsx("div", { className: "game-home-stage-blocks" }), _jsx("div", { className: "game-home-floating-cube game-home-floating-cube--left" }), _jsx("div", { className: "game-home-floating-cube game-home-floating-cube--right" })] }), _jsx(HomeMenuTraffic, { screenRef: homeScreenRef, showHitFlash: settings.showHitFlash }), _jsx("div", { className: "game-home-shell", children: _jsxs("div", { className: "game-home-shell-content", children: [_jsx("header", { className: "game-home-hero", children: _jsxs("h1", { className: "game-home-title", "aria-label": "DashForge", children: [_jsx("span", { className: "game-home-title-word", "data-title": "Dash", children: "Dash" }), _jsx("span", { className: "game-home-title-word", "data-title": "Forge", children: "Forge" })] }) }), _jsx("div", { className: "game-home-primary", children: _jsxs("div", { className: "game-home-button-row", children: [_jsxs("div", { className: "game-home-button-slot game-home-button-slot--skin", children: [_jsx("button", { type: "button", className: "game-home-main-button game-home-main-button--skin", onClick: () => setActivePanel('skins'), "aria-label": "Skin Select", children: _jsx("span", { className: "game-home-main-button-core", children: _jsx("span", { className: "game-home-main-button-sprite game-home-main-button-sprite--skin" }) }) }), _jsx("span", { className: "game-home-button-caption", children: "Character Select" })] }), _jsx(Link, { to: playRoute, className: "game-home-main-button game-home-main-button--play", "aria-label": "Play", children: _jsx("span", { className: "game-home-main-button-core", children: _jsx("span", { className: "game-home-main-button-sprite game-home-main-button-sprite--play" }) }) }), _jsx("div", { className: "game-home-button-slot game-home-button-slot--builder", children: _jsx(Link, { to: builderRoute, className: "game-home-main-button game-home-main-button--builder", "aria-label": "Level Builder", children: _jsx("span", { className: "game-home-main-button-core", children: _jsx("span", { className: "game-home-main-button-sprite game-home-main-button-sprite--builder" }) }) }) })] }) }), _jsxs("div", { className: "game-home-submenu", children: [isAdmin ? (_jsx("button", { type: "button", className: "game-home-submenu-button game-home-submenu-button--admin", onClick: () => setActivePanel('admin-tools'), "aria-label": "Admin Tools", children: _jsx("span", { className: "game-home-submenu-icon game-home-submenu-icon--admin", "aria-hidden": "true", children: "Admin" }) })) : null, _jsx("button", { type: "button", className: "game-home-submenu-button game-home-submenu-button--settings", onClick: () => setActivePanel('settings'), "aria-label": "Settings" }), _jsx(Link, { to: "/leaderboard", className: "game-home-submenu-button game-home-submenu-button--leaderboard", "aria-label": "Leaderboard", children: _jsx("span", { className: "game-home-submenu-icon game-home-submenu-icon--leaderboard", "aria-hidden": "true" }) })] })] }) }), activePanel === 'skins' ? (_jsx("div", { className: "game-home-overlay", role: "presentation", onClick: () => setActivePanel(null), children: _jsxs("div", { className: "game-home-panel", role: "dialog", "aria-modal": "true", "aria-label": "Skin Select", onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "game-home-panel-header", children: [_jsxs("div", { children: [_jsx("p", { className: "game-home-panel-kicker", children: "Garage" }), _jsx("h2", { className: "game-home-panel-title", children: "Skin Select" })] }), _jsx("button", { type: "button", className: "game-home-close", onClick: () => setActivePanel(null), children: "Close" })] }), _jsx("div", { className: "game-home-skin-grid", children: skinOptions.map((skin) => (_jsxs("button", { type: "button", className: cn('game-home-skin-card', selectedSkin === skin.id && 'is-active'), onClick: () => setSelectedSkin(skin.id), children: [_jsx("span", { className: "game-home-skin-preview", "data-preview-skin": skin.id, children: _jsx("span", {}) }), _jsx("span", { className: "game-home-skin-name", children: skin.name }), _jsx("span", { className: "game-home-skin-accent", children: skin.accent }), _jsx("span", { className: "game-home-skin-flavor", children: skin.flavor })] }, skin.id))) })] }) })) : null, activePanel === 'settings' ? (_jsx("div", { className: "game-home-overlay", role: "presentation", onClick: () => setActivePanel(null), children: _jsxs("div", { className: "game-home-panel", role: "dialog", "aria-modal": "true", "aria-label": "Settings", onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "game-home-panel-header", children: [_jsxs("div", { children: [_jsx("p", { className: "game-home-panel-kicker", children: "Options" }), _jsx("h2", { className: "game-home-panel-title", children: "Settings" })] }), _jsx("button", { type: "button", className: "game-home-close", onClick: () => setActivePanel(null), children: "Close" })] }), _jsxs("div", { className: "game-home-settings-grid", children: [_jsxs("label", { className: "game-home-slider", children: [_jsxs("div", { className: "game-home-slider-copy", children: [_jsx("span", { children: "Music Volume" }), _jsxs("strong", { children: [settings.musicVolume, "%"] })] }), _jsx("input", { type: "range", min: "0", max: "100", value: settings.musicVolume, onChange: (event) => setSettings((current) => ({
                                                ...current,
                                                musicVolume: clampPercentage(Number(event.target.value)),
                                            })) })] }), _jsxs("label", { className: "game-home-slider", children: [_jsxs("div", { className: "game-home-slider-copy", children: [_jsx("span", { children: "SFX Volume" }), _jsxs("strong", { children: [settings.sfxVolume, "%"] })] }), _jsx("input", { type: "range", min: "0", max: "100", value: settings.sfxVolume, onChange: (event) => setSettings((current) => ({
                                                ...current,
                                                sfxVolume: clampPercentage(Number(event.target.value)),
                                            })) })] }), _jsxs("div", { className: "game-home-toggle-row", children: [_jsx("button", { type: "button", className: cn('game-home-toggle', settings.screenShake && 'is-active'), onClick: () => setSettings((current) => ({
                                                ...current,
                                                screenShake: !current.screenShake,
                                            })), children: "Screen Shake" }), _jsx("button", { type: "button", className: cn('game-home-toggle', settings.showHitFlash && 'is-active'), onClick: () => setSettings((current) => ({
                                                ...current,
                                                showHitFlash: !current.showHitFlash,
                                            })), children: "Hit Flash" })] })] })] }) })) : null, activePanel === 'admin-tools' && isAdmin ? (_jsx("div", { className: "game-home-overlay", role: "presentation", onClick: () => setActivePanel(null), children: _jsxs("div", { className: "game-home-panel", role: "dialog", "aria-modal": "true", "aria-label": "Admin Tools", onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "game-home-panel-header", children: [_jsxs("div", { children: [_jsx("p", { className: "game-home-panel-kicker", children: "Admin Access" }), _jsx("h2", { className: "game-home-panel-title", children: "Admin Tools" })] }), _jsx("button", { type: "button", className: "game-home-close", onClick: () => setActivePanel(null), children: "Close" })] }), _jsx("div", { className: "game-home-skin-grid game-home-skin-grid--admin", children: adminToolOptions.map((tool) => (_jsxs(Link, { to: tool.route, className: "game-home-skin-card game-home-skin-card--tool", onClick: () => setActivePanel(null), children: [_jsx("span", { className: "game-home-tool-preview", "data-admin-tool": tool.id, children: _jsx("strong", { children: tool.name.slice(0, 3).toUpperCase() }) }), _jsx("span", { className: "game-home-skin-name", children: tool.name }), _jsx("span", { className: "game-home-skin-accent", children: tool.accent }), _jsx("span", { className: "game-home-skin-flavor", children: tool.flavor }), _jsx("span", { className: "game-home-tool-route", children: tool.routeLabel })] }, tool.id))) })] }) })) : null] }));
}
