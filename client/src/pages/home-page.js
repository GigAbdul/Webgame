import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HomeMenuTraffic } from '../components/home-menu-traffic';
import { PlayerModelCanvas } from '../features/game/player-model-canvas';
import { getPlayerModeDescription, getPlayerModeLabel } from '../features/game/player-mode-config';
import { playerSkinModes, usePlayerSkinSelectionStore, useSelectedPlayerSkinRecord, } from '../features/game/player-skin-selection';
import { usePlayerSkinsQuery } from '../features/game/player-skins';
import { apiRequest } from '../services/api';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/auth-store';
import { z } from 'zod';
const homeSettingsStorageKey = 'dashforge-home-settings';
const adminToolOptions = [
    {
        id: 'dashboard',
        name: 'Control Room',
        accent: 'Overview Hub',
        flavor: 'Р“Р»Р°РІРЅР°СЏ Р°РґРјРёРЅ-РїР°РЅРµР»СЊ СЃРѕ СЃС‚Р°С‚СѓСЃРѕРј СЃРёСЃС‚РµРјС‹ Рё Р±С‹СЃС‚СЂС‹РјРё РїРµСЂРµС…РѕРґР°РјРё.',
        route: '/admin',
        routeLabel: '/admin',
    },
    {
        id: 'queue',
        name: 'Review Queue',
        accent: 'Moderation Flow',
        flavor: 'РџСЂРѕРІРµСЂРєР° РѕС‚РїСЂР°РІР»РµРЅРЅС‹С… СѓСЂРѕРІРЅРµР№, official-СЂРµС€РµРЅРёСЏ Рё publish control.',
        route: '/admin/levels',
        routeLabel: '/admin/levels',
    },
    {
        id: 'forge',
        name: 'Official Forge',
        accent: 'Create Stage',
        flavor: 'РЎС‚Р°СЂС‚ РЅРѕРІРѕРіРѕ official-СѓСЂРѕРІРЅСЏ СЃ Р°РґРјРёРЅСЃРєРёРј РґСЂР°С„С‚РѕРј Рё СЂРµРґР°РєС‚РѕСЂРѕРј.',
        route: '/admin/create-official',
        routeLabel: '/admin/create-official',
    },
    {
        id: 'skins',
        name: 'Skin Lab',
        accent: 'Pixel Workshop',
        flavor: 'Р РµРґР°РєС‚РѕСЂ СЃРєРёРЅРѕРІ СЃ Р·Р°Р»РёРІРєРѕР№, СЃР»РѕСЏРјРё, undo/redo Рё РёРіСЂРѕРІС‹Рј preview.',
        route: '/admin/player-skins',
        routeLabel: '/admin/player-skins',
    },
    {
        id: 'users',
        name: 'Users',
        accent: 'Account Watch',
        flavor: 'РЎРїРёСЃРѕРє РёРіСЂРѕРєРѕРІ, СЃС‚Р°С‚СѓСЃС‹ Р°РєРєР°СѓРЅС‚РѕРІ Рё Р±С‹СЃС‚СЂР°СЏ СЂСѓС‡РЅР°СЏ РїСЂРѕРІРµСЂРєР°.',
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
const homeLoginSchema = z.object({
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});
const homeRegisterSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, 'Username must be at least 3 characters')
        .max(24, 'Username must be 24 characters or fewer')
        .regex(/^[a-zA-Z0-9_]+$/, 'Use only letters, numbers, and underscores'),
    email: z.string().trim().email('Enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must include an uppercase letter')
        .regex(/[a-z]/, 'Password must include a lowercase letter')
        .regex(/[0-9]/, 'Password must include a number'),
});
function getHomeAuthErrorMessage(error) {
    if (error instanceof z.ZodError) {
        return error.issues[0]?.message ?? 'Check the highlighted fields and try again.';
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'Something went wrong. Please try again.';
}
function clampPercentage(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
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
    const setAuth = useAuthStore((state) => state.setAuth);
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const playerSkinsQuery = usePlayerSkinsQuery();
    const selectedPlayerSkinRecord = useSelectedPlayerSkinRecord();
    const playerSkinSelection = usePlayerSkinSelectionStore((state) => state.selection);
    const setPlayerSkinSelection = usePlayerSkinSelectionStore((state) => state.setSelection);
    const isAdmin = user?.role === 'ADMIN';
    const playRoute = '/levels';
    const builderRoute = user ? '/my-levels' : '/register';
    const homeScreenRef = useRef(null);
    const [activePanel, setActivePanel] = useState(null);
    const [authDialog, setAuthDialog] = useState(null);
    const [settings, setSettings] = useState(() => readStoredSettings());
    const [isAccountHelpOpen, setIsAccountHelpOpen] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [authInfo, setAuthInfo] = useState(null);
    const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
    const [loginForm, setLoginForm] = useState({
        email: '',
        password: '',
    });
    const [registerForm, setRegisterForm] = useState({
        username: '',
        email: '',
        password: '',
    });
    const publishedPlayerSkins = playerSkinsQuery.data?.skins ?? null;
    const publishedSkinCount = playerSkinModes.filter((mode) => Boolean(publishedPlayerSkins?.[mode])).length;
    const musicRangeStyle = { '--settings-range-fill': `${settings.musicVolume}%` };
    const sfxRangeStyle = { '--settings-range-fill': `${settings.sfxVolume}%` };
    function getEquippedSkinSource(mode) {
        return playerSkinSelection[mode] === 'published' && publishedPlayerSkins?.[mode] ? 'published' : 'default';
    }
    function openAccountPanel() {
        setActivePanel('account');
        setAuthDialog(null);
        setAuthError(null);
        setAuthInfo(null);
        setIsAccountHelpOpen(false);
    }
    function closeAuthDialog() {
        setAuthDialog(null);
        setAuthError(null);
        setAuthInfo(null);
    }
    function openAuthDialog(mode) {
        setAuthDialog(mode);
        setAuthError(null);
        setAuthInfo(null);
        setIsAccountHelpOpen(false);
    }
    function fillDemoAdminCredentials() {
        setLoginForm({
            email: 'admin@example.com',
            password: 'Admin123!',
        });
        setAuthError(null);
        setAuthInfo('Demo admin credentials are filled in.');
    }
    async function submitAuthRequest(schema, values, path) {
        const payload = schema.parse(values);
        const response = await apiRequest(path, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        setAuth(response.token, response.user);
        setAuthDialog(null);
        setAuthError(null);
        setAuthInfo(null);
        setIsAccountHelpOpen(false);
        setActivePanel('account');
        return response;
    }
    async function handleLoginSubmit(event) {
        event.preventDefault();
        if (isAuthSubmitting) {
            return;
        }
        setAuthInfo(null);
        setIsAuthSubmitting(true);
        try {
            await submitAuthRequest(homeLoginSchema, loginForm, '/api/auth/login');
            setLoginForm({
                email: '',
                password: '',
            });
        }
        catch (error) {
            setAuthError(getHomeAuthErrorMessage(error));
        }
        finally {
            setIsAuthSubmitting(false);
        }
    }
    async function handleRegisterSubmit(event) {
        event.preventDefault();
        if (isAuthSubmitting) {
            return;
        }
        setAuthInfo(null);
        setIsAuthSubmitting(true);
        try {
            await submitAuthRequest(homeRegisterSchema, registerForm, '/api/auth/register');
            setRegisterForm({
                username: '',
                email: '',
                password: '',
            });
        }
        catch (error) {
            setAuthError(getHomeAuthErrorMessage(error));
        }
        finally {
            setIsAuthSubmitting(false);
        }
    }
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        window.localStorage.setItem(homeSettingsStorageKey, JSON.stringify(settings));
    }, [settings]);
    useEffect(() => {
        if (!activePanel && !authDialog) {
            return;
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                if (authDialog) {
                    closeAuthDialog();
                    return;
                }
                if (activePanel === 'account') {
                    setActivePanel('settings');
                    setIsAccountHelpOpen(false);
                    return;
                }
                setActivePanel(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activePanel, authDialog]);
    useEffect(() => {
        if (activePanel !== 'account') {
            setAuthDialog(null);
            setIsAccountHelpOpen(false);
            setAuthError(null);
            setAuthInfo(null);
        }
    }, [activePanel]);
    return (_jsxs("div", { ref: homeScreenRef, className: "game-home-screen", "data-screen-shake": settings.screenShake ? 'on' : 'off', children: [_jsxs("div", { className: "game-home-atmosphere", "aria-hidden": "true", children: [_jsx("div", { className: "game-home-stars" }), _jsx("div", { className: "game-home-planet-glow" }), _jsx("div", { className: "game-home-planet" }), _jsx("div", { className: "game-home-grid" }), _jsx("div", { className: "game-home-skyline game-home-skyline--rear" }), _jsx("div", { className: "game-home-skyline game-home-skyline--front" }), _jsx("div", { className: "game-home-stage-lane" }), _jsx("div", { className: "game-home-stage-blocks" }), _jsx("div", { className: "game-home-floating-cube game-home-floating-cube--left" }), _jsx("div", { className: "game-home-floating-cube game-home-floating-cube--right" })] }), _jsx(HomeMenuTraffic, { screenRef: homeScreenRef, showHitFlash: settings.showHitFlash, playerSkinOverrides: selectedPlayerSkinRecord }), _jsx("div", { className: "game-home-shell", children: _jsxs("div", { className: "game-home-shell-content", children: [_jsx("header", { className: "game-home-hero", children: _jsxs("h1", { className: "game-home-title", "aria-label": "DashForge", children: [_jsx("span", { className: "game-home-title-word", "data-title": "Dash", children: "Dash" }), _jsx("span", { className: "game-home-title-word", "data-title": "Forge", children: "Forge" })] }) }), _jsx("div", { className: "game-home-primary", children: _jsxs("div", { className: "game-home-button-row", children: [_jsxs("div", { className: "game-home-button-slot game-home-button-slot--skin", children: [_jsx("button", { type: "button", className: "game-home-main-button game-home-main-button--skin", onClick: () => setActivePanel('skins'), "aria-label": "Skin Select", children: _jsx("span", { className: "game-home-main-button-core", children: _jsx("span", { className: "game-home-main-button-sprite game-home-main-button-sprite--skin" }) }) }), _jsx("span", { className: "game-home-button-caption", children: "Character Select" })] }), _jsx(Link, { to: playRoute, className: "game-home-main-button game-home-main-button--play", "aria-label": "Play", children: _jsx("span", { className: "game-home-main-button-core", children: _jsx("span", { className: "game-home-main-button-sprite game-home-main-button-sprite--play" }) }) }), _jsx("div", { className: "game-home-button-slot game-home-button-slot--builder", children: _jsx(Link, { to: builderRoute, className: "game-home-main-button game-home-main-button--builder", "aria-label": "Level Builder", children: _jsx("span", { className: "game-home-main-button-core", children: _jsx("span", { className: "game-home-main-button-sprite game-home-main-button-sprite--builder" }) }) }) })] }) }), _jsxs("div", { className: "game-home-submenu", children: [isAdmin ? (_jsx("button", { type: "button", className: "game-home-submenu-button game-home-submenu-button--admin", onClick: () => setActivePanel('admin-tools'), "aria-label": "Admin Tools", children: _jsx("span", { className: "game-home-submenu-icon game-home-submenu-icon--admin", "aria-hidden": "true", children: "Admin" }) })) : null, _jsx("button", { type: "button", className: "game-home-submenu-button game-home-submenu-button--settings", onClick: () => setActivePanel('settings'), "aria-label": "Settings" }), _jsx(Link, { to: "/leaderboard", className: "game-home-submenu-button game-home-submenu-button--leaderboard", "aria-label": "Leaderboard", children: _jsx("span", { className: "game-home-submenu-icon game-home-submenu-icon--leaderboard", "aria-hidden": "true" }) })] })] }) }), activePanel === 'skins' ? (_jsx("div", { className: "game-home-overlay", role: "presentation", onClick: () => setActivePanel(null), children: _jsxs("div", { className: "game-home-panel", role: "dialog", "aria-modal": "true", "aria-label": "Character Select", onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "game-home-panel-header", children: [_jsxs("div", { children: [_jsx("p", { className: "game-home-panel-kicker", children: "Garage" }), _jsx("h2", { className: "game-home-panel-title", children: "Character Select" })] }), _jsx("button", { type: "button", className: "game-home-close", onClick: () => setActivePanel(null), children: "Close" })] }), _jsxs("div", { className: "game-home-character-summary", children: [_jsxs("div", { className: "game-home-character-summary-copy", children: [_jsx("span", { className: "game-home-character-summary-kicker", children: "Published Skins" }), _jsxs("strong", { children: [publishedSkinCount, "/4 Modes Ready"] })] }), _jsx("p", { className: "game-home-character-summary-text", children: "Choose a default or published skin for each mode. Your choice is used when the player switches between cube, ball, ship, and arrow." })] }), _jsx("div", { className: "game-home-character-grid", children: playerSkinModes.map((mode) => {
                                const publishedSkin = publishedPlayerSkins?.[mode] ?? null;
                                const hasPublishedSkin = Boolean(publishedSkin);
                                const equippedSkinSource = getEquippedSkinSource(mode);
                                return (_jsxs("section", { className: "game-home-character-card", children: [_jsxs("div", { className: "game-home-character-card-header", children: [_jsxs("div", { children: [_jsx("p", { className: "game-home-character-card-title", children: getPlayerModeLabel(mode) }), _jsx("p", { className: "game-home-character-card-description", children: getPlayerModeDescription(mode) })] }), _jsx("span", { className: cn('game-home-character-status', hasPublishedSkin ? 'is-ready' : 'is-default-only'), children: hasPublishedSkin ? 'Published Ready' : 'Default Only' })] }), _jsxs("div", { className: "game-home-character-choice-grid", children: [_jsxs("button", { type: "button", className: cn('game-home-character-choice', equippedSkinSource === 'default' && 'is-active'), onClick: () => setPlayerSkinSelection(mode, 'default'), children: [_jsx("span", { className: "game-home-character-choice-preview", children: _jsx(PlayerModelCanvas, { mode: mode, width: 96, height: 96, skinSource: "default" }) }), _jsxs("span", { className: "game-home-character-choice-name", children: [getPlayerModeLabel(mode), " Default"] }), _jsx("span", { className: "game-home-character-choice-copy", children: "Classic built-in runner icon." })] }), _jsxs("button", { type: "button", className: cn('game-home-character-choice', 'game-home-character-choice--published', equippedSkinSource === 'published' && 'is-active'), disabled: !hasPublishedSkin, onClick: () => setPlayerSkinSelection(mode, 'published'), children: [_jsx("span", { className: "game-home-character-choice-preview", children: _jsx(PlayerModelCanvas, { mode: mode, width: 96, height: 96, skinSource: "published" }) }), _jsx("span", { className: "game-home-character-choice-name", children: publishedSkin?.name ?? 'Published' }), _jsx("span", { className: "game-home-character-choice-copy", children: hasPublishedSkin
                                                                ? 'Skin Lab release ready to equip.'
                                                                : 'No published skin for this mode yet.' })] })] })] }, mode));
                            }) }), playerSkinsQuery.isError ? (_jsx("p", { className: "game-home-character-feedback", children: "Published skins are temporarily unavailable. You can still keep using the default set." })) : null] }) })) : null, activePanel === 'settings' ? (_jsx("div", { className: "game-home-overlay", role: "presentation", onClick: () => setActivePanel(null), children: _jsxs("div", { className: "game-home-panel game-home-panel--settings", role: "dialog", "aria-modal": "true", "aria-label": "Settings", onClick: (event) => event.stopPropagation(), children: [_jsx("span", { className: "game-home-settings-chain game-home-settings-chain--left", "aria-hidden": "true" }), _jsx("span", { className: "game-home-settings-chain game-home-settings-chain--right", "aria-hidden": "true" }), _jsxs("div", { className: "game-home-settings-scaffold", children: [_jsxs("div", { className: "game-home-settings-topbar", "aria-hidden": "true", children: [_jsx("span", { className: "game-home-settings-beam-cap game-home-settings-beam-cap--left" }), _jsx("div", { className: "game-home-settings-topbar-core", children: _jsx("h2", { className: "game-home-settings-topbar-title", children: "Settings" }) }), _jsx("span", { className: "game-home-settings-beam-cap game-home-settings-beam-cap--right" })] }), _jsx("span", { className: "game-home-settings-post game-home-settings-post--left", "aria-hidden": "true" }), _jsx("span", { className: "game-home-settings-post game-home-settings-post--right", "aria-hidden": "true" }), _jsxs("div", { className: "game-home-settings-body", children: [_jsxs("button", { type: "button", className: "game-home-settings-launch", "aria-label": "Open account menu", onClick: openAccountPanel, children: [_jsx("span", { className: "game-home-settings-card-face", children: _jsx("span", { className: "game-home-settings-card-title", children: "Account" }) }), _jsx("span", { className: "game-home-settings-account-status", children: user ? `Signed in as ${user.username}` : 'Open account menu' })] }), _jsxs("label", { className: "game-home-settings-meter", children: [_jsxs("div", { className: "game-home-settings-meter-heading", children: [_jsx("span", { className: "game-home-settings-meter-title", children: "Music" }), _jsxs("strong", { className: "game-home-settings-meter-value", children: [settings.musicVolume, "%"] })] }), _jsx("div", { className: "game-home-settings-meter-track", children: _jsx("input", { type: "range", min: "0", max: "100", value: settings.musicVolume, className: "game-home-settings-range", style: musicRangeStyle, "aria-label": "Music volume", onChange: (event) => setSettings((current) => ({
                                                            ...current,
                                                            musicVolume: clampPercentage(Number(event.target.value)),
                                                        })) }) })] }), _jsxs("label", { className: "game-home-settings-meter", children: [_jsxs("div", { className: "game-home-settings-meter-heading", children: [_jsx("span", { className: "game-home-settings-meter-title", children: "SFX" }), _jsxs("strong", { className: "game-home-settings-meter-value", children: [settings.sfxVolume, "%"] })] }), _jsx("div", { className: "game-home-settings-meter-track", children: _jsx("input", { type: "range", min: "0", max: "100", value: settings.sfxVolume, className: "game-home-settings-range", style: sfxRangeStyle, "aria-label": "SFX volume", onChange: (event) => setSettings((current) => ({
                                                            ...current,
                                                            sfxVolume: clampPercentage(Number(event.target.value)),
                                                        })) }) })] })] }), _jsxs("div", { className: "game-home-settings-bottombar", children: [_jsx("div", { className: "game-home-settings-bottombar-segment" }), _jsx("button", { type: "button", className: "game-home-settings-close", onClick: () => setActivePanel(null), "aria-label": "Close settings", children: _jsx("span", { className: "game-home-settings-close-glyph" }) }), _jsx("div", { className: "game-home-settings-bottombar-segment" })] })] })] }) })) : null, activePanel === 'account' ? (_jsx("div", { className: "game-home-overlay", role: "presentation", onClick: () => setActivePanel('settings'), children: _jsxs("div", { className: "game-home-panel game-home-panel--settings game-home-panel--account", role: "dialog", "aria-modal": "true", "aria-label": "Account", onClick: (event) => event.stopPropagation(), children: [_jsx("span", { className: "game-home-settings-chain game-home-settings-chain--left", "aria-hidden": "true" }), _jsx("span", { className: "game-home-settings-chain game-home-settings-chain--right", "aria-hidden": "true" }), _jsxs("div", { className: "game-home-settings-scaffold", children: [_jsxs("div", { className: "game-home-settings-topbar", "aria-hidden": "true", children: [_jsx("span", { className: "game-home-settings-beam-cap game-home-settings-beam-cap--left" }), _jsx("div", { className: "game-home-settings-topbar-core", children: _jsx("h2", { className: "game-home-settings-topbar-title", children: "Account" }) }), _jsx("span", { className: "game-home-settings-beam-cap game-home-settings-beam-cap--right" })] }), _jsx("span", { className: "game-home-settings-post game-home-settings-post--left", "aria-hidden": "true" }), _jsx("span", { className: "game-home-settings-post game-home-settings-post--right", "aria-hidden": "true" }), _jsxs("div", { className: "game-home-account-body", children: [user ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "game-home-account-state", children: user.username }), _jsx("p", { className: "game-home-account-copy", children: "Your runner profile is online. Stats, stars, and workshop progress are ready to sync." }), _jsxs("div", { className: "game-home-account-detail-row", children: [_jsx("span", { className: "game-home-account-detail-pill", children: user.role }), _jsx("span", { className: "game-home-account-detail-pill", children: user.email })] }), _jsxs("div", { className: "game-home-account-button-stack", children: [_jsx(Link, { to: "/profile", className: "game-home-account-button", onClick: () => {
                                                                setActivePanel(null);
                                                                setAuthDialog(null);
                                                            }, children: "Profile" }), _jsx("button", { type: "button", className: "game-home-account-button game-home-account-button--help", onClick: () => setIsAccountHelpOpen((current) => !current), children: "Help" }), _jsx("button", { type: "button", className: "game-home-account-button", onClick: () => {
                                                                clearAuth();
                                                                setIsAccountHelpOpen(false);
                                                                setAuthDialog(null);
                                                            }, children: "Log Out" })] })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "game-home-account-state game-home-account-state--warning", children: "Not Logged In" }), _jsx("p", { className: "game-home-account-copy", children: "Create an account to back up and load your data from the cloud." }), _jsxs("div", { className: "game-home-account-button-stack", children: [_jsx("button", { type: "button", className: "game-home-account-button", onClick: () => openAuthDialog('login'), children: "Log In" }), _jsx("button", { type: "button", className: "game-home-account-button game-home-account-button--help", onClick: () => setIsAccountHelpOpen((current) => !current), children: "Help" }), _jsx("button", { type: "button", className: "game-home-account-button", onClick: () => openAuthDialog('register'), children: "Register" })] })] })), isAccountHelpOpen ? (_jsx("div", { className: "game-home-account-help", children: _jsx("p", { children: "Log in with your email and password. Register creates a new pilot profile and stores your progress in the cloud." }) })) : null] }), _jsxs("div", { className: "game-home-settings-bottombar", children: [_jsx("div", { className: "game-home-settings-bottombar-segment" }), _jsx("button", { type: "button", className: "game-home-settings-close", onClick: () => {
                                                setActivePanel('settings');
                                                closeAuthDialog();
                                                setIsAccountHelpOpen(false);
                                            }, "aria-label": "Back to settings", children: _jsx("span", { className: "game-home-settings-close-glyph" }) }), _jsx("div", { className: "game-home-settings-bottombar-segment" })] })] })] }) })) : null, authDialog ? (_jsx("div", { className: "game-home-auth-overlay", role: "presentation", onClick: closeAuthDialog, children: _jsxs("div", { className: "game-home-auth-shell", role: "dialog", "aria-modal": "true", "aria-label": authDialog, onClick: (event) => event.stopPropagation(), children: [_jsx("button", { type: "button", className: "game-home-auth-back", onClick: closeAuthDialog, "aria-label": "Back to account menu", children: _jsx("span", { className: "game-home-auth-back-arrow", "aria-hidden": "true" }) }), _jsxs("div", { className: "game-home-auth-card", children: [_jsx("h3", { className: "game-home-auth-title", children: authDialog === 'login' ? 'Login' : 'Register' }), _jsxs("form", { className: "game-home-auth-form", onSubmit: authDialog === 'login' ? handleLoginSubmit : handleRegisterSubmit, children: [authDialog === 'login' ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: "game-home-auth-field", children: [_jsx("span", { className: "game-home-auth-label", children: "Email:" }), _jsx("input", { type: "email", autoComplete: "email", className: "game-home-auth-input", value: loginForm.email, placeholder: "admin@example.com", onChange: (event) => setLoginForm((current) => ({ ...current, email: event.target.value })) })] }), _jsxs("label", { className: "game-home-auth-field", children: [_jsx("span", { className: "game-home-auth-label", children: "Password:" }), _jsx("input", { type: "password", autoComplete: "current-password", className: "game-home-auth-input", value: loginForm.password, placeholder: "Password", onChange: (event) => setLoginForm((current) => ({ ...current, password: event.target.value })) })] }), _jsxs("div", { className: "game-home-auth-utility-stack", children: [_jsx("button", { type: "button", className: "game-home-auth-utility-button", onClick: fillDemoAdminCredentials, children: "Use Demo Admin" }), _jsx("button", { type: "button", className: "game-home-auth-utility-button", onClick: () => openAuthDialog('register'), children: "Need Account?" })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("label", { className: "game-home-auth-field", children: [_jsx("span", { className: "game-home-auth-label", children: "Username:" }), _jsx("input", { type: "text", autoComplete: "username", className: "game-home-auth-input", value: registerForm.username, placeholder: "Username", onChange: (event) => setRegisterForm((current) => ({ ...current, username: event.target.value })) })] }), _jsxs("label", { className: "game-home-auth-field", children: [_jsx("span", { className: "game-home-auth-label", children: "Email:" }), _jsx("input", { type: "email", autoComplete: "email", className: "game-home-auth-input", value: registerForm.email, placeholder: "nova@example.com", onChange: (event) => setRegisterForm((current) => ({ ...current, email: event.target.value })) })] }), _jsxs("label", { className: "game-home-auth-field", children: [_jsx("span", { className: "game-home-auth-label", children: "Password:" }), _jsx("input", { type: "password", autoComplete: "new-password", className: "game-home-auth-input", value: registerForm.password, placeholder: "StrongPass1", onChange: (event) => setRegisterForm((current) => ({ ...current, password: event.target.value })) })] }), _jsx("div", { className: "game-home-auth-utility-stack game-home-auth-utility-stack--single", children: _jsx("button", { type: "button", className: "game-home-auth-utility-button", onClick: () => openAuthDialog('login'), children: "Already Have Account?" }) })] })), authInfo ? _jsx("p", { className: "game-home-auth-note", children: authInfo }) : null, authError ? _jsx("p", { className: "game-home-auth-error", children: authError }) : null, _jsxs("div", { className: "game-home-auth-action-row", children: [_jsx("button", { type: "button", className: "game-home-auth-submit", onClick: closeAuthDialog, children: "Cancel" }), _jsx("button", { type: "submit", className: "game-home-auth-submit", disabled: isAuthSubmitting, children: isAuthSubmitting ? 'Please Wait' : authDialog === 'login' ? 'Login' : 'Register' })] })] })] })] }) })) : null, activePanel === 'admin-tools' && isAdmin ? (_jsx("div", { className: "game-home-overlay", role: "presentation", onClick: () => setActivePanel(null), children: _jsxs("div", { className: "game-home-panel", role: "dialog", "aria-modal": "true", "aria-label": "Admin Tools", onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "game-home-panel-header", children: [_jsxs("div", { children: [_jsx("p", { className: "game-home-panel-kicker", children: "Admin Access" }), _jsx("h2", { className: "game-home-panel-title", children: "Admin Tools" })] }), _jsx("button", { type: "button", className: "game-home-close", onClick: () => setActivePanel(null), children: "Close" })] }), _jsx("div", { className: "game-home-skin-grid game-home-skin-grid--admin", children: adminToolOptions.map((tool) => (_jsxs(Link, { to: tool.route, className: "game-home-skin-card game-home-skin-card--tool", onClick: () => setActivePanel(null), children: [_jsx("span", { className: "game-home-tool-preview", "data-admin-tool": tool.id, children: _jsx("strong", { children: tool.name.slice(0, 3).toUpperCase() }) }), _jsx("span", { className: "game-home-skin-name", children: tool.name }), _jsx("span", { className: "game-home-skin-accent", children: tool.accent }), _jsx("span", { className: "game-home-skin-flavor", children: tool.flavor }), _jsx("span", { className: "game-home-tool-route", children: tool.routeLabel })] }, tool.id))) })] }) })) : null] }));
}
