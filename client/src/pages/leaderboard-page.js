import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
const TAB_OPTIONS = [
    { id: 'TOP_100', label: 'Top 100' },
    { id: 'FRIENDS', label: 'Friends' },
    { id: 'GLOBAL', label: 'Global' },
    { id: 'CREATORS', label: 'Creators' },
];
const METRIC_OPTIONS = [
    { id: 'stars', label: 'Stars', icon: 'star' },
    { id: 'clears', label: 'Clears', icon: 'moon' },
    { id: 'creators', label: 'Creators', icon: 'tools' },
    { id: 'recent', label: 'Recent', icon: 'clock' },
];
const numberFormatter = new Intl.NumberFormat('en-US');
function formatNumber(value) {
    return numberFormatter.format(value);
}
function getMetricValue(entry, metric) {
    if (metric === 'clears') {
        return entry.completedOfficialLevels;
    }
    if (metric === 'creators') {
        return entry.officialLevelsAuthored;
    }
    if (metric === 'recent') {
        return entry.createdAt ? new Date(entry.createdAt).getTime() : 0;
    }
    return entry.totalStars;
}
function compareEntries(left, right, metric) {
    const metricDelta = getMetricValue(right, metric) - getMetricValue(left, metric);
    if (metricDelta !== 0) {
        return metricDelta;
    }
    if (right.totalStars !== left.totalStars) {
        return right.totalStars - left.totalStars;
    }
    if (right.completedOfficialLevels !== left.completedOfficialLevels) {
        return right.completedOfficialLevels - left.completedOfficialLevels;
    }
    if (right.officialLevelsAuthored !== left.officialLevelsAuthored) {
        return right.officialLevelsAuthored - left.officialLevelsAuthored;
    }
    return left.username.localeCompare(right.username);
}
function getSeed(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
}
function getAvatarTone(entry) {
    const seed = getSeed(entry.id);
    const hue = seed % 360;
    const accentHue = (hue + 48) % 360;
    return {
        '--lb-avatar-primary': `hsl(${hue} 76% 46%)`,
        '--lb-avatar-secondary': `hsl(${accentHue} 84% 58%)`,
    };
}
function getAvatarGlyph(entry) {
    return entry.username.trim().charAt(0).toUpperCase() || '?';
}
function getNeighborhoodEntries(entries, userId) {
    if (!userId) {
        return [];
    }
    const targetIndex = entries.findIndex((entry) => entry.id === userId);
    if (targetIndex === -1) {
        return [];
    }
    const start = Math.max(0, targetIndex - 4);
    const end = Math.min(entries.length, targetIndex + 5);
    return entries.slice(start, end);
}
function getJoinedCopy(createdAt) {
    if (!createdAt) {
        return 'Now';
    }
    return new Date(createdAt).getFullYear().toString();
}
function getFooterCopy(input) {
    if (input.activeTab === 'FRIENDS') {
        return input.myRank
            ? `Your global star rank is #${input.myRank.rank}.`
            : 'Sign in to unlock friend comparisons and your saved rank.';
    }
    if (input.activeMetric === 'creators') {
        return `Showing ${input.totalEntries} players sorted by official levels authored.`;
    }
    if (input.activeMetric === 'clears') {
        return `Showing ${input.totalEntries} players sorted by official clears.`;
    }
    if (input.activeMetric === 'recent') {
        return `Showing ${input.totalEntries} players sorted by most recent account creation.`;
    }
    return `Showing ${input.totalEntries} players sorted by total stars.`;
}
export function LeaderboardPage() {
    const user = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState('TOP_100');
    const [activeMetric, setActiveMetric] = useState('stars');
    const leaderboardQuery = useQuery({
        queryKey: ['leaderboard'],
        queryFn: () => apiRequest('/api/leaderboard'),
    });
    const myRankQuery = useQuery({
        queryKey: ['leaderboard-me'],
        queryFn: () => apiRequest('/api/leaderboard/me'),
        enabled: Boolean(user),
    });
    const effectiveMetric = activeTab === 'CREATORS' ? 'creators' : activeMetric;
    const leaderboard = leaderboardQuery.data?.leaderboard ?? [];
    const rankedEntries = useMemo(() => [...leaderboard]
        .sort((left, right) => compareEntries(left, right, effectiveMetric))
        .map((entry, index) => ({
        ...entry,
        rank: index + 1,
    })), [effectiveMetric, leaderboard]);
    const visibleEntries = useMemo(() => {
        if (activeTab === 'FRIENDS') {
            return getNeighborhoodEntries(rankedEntries, user?.id);
        }
        return rankedEntries.slice(0, 100);
    }, [activeTab, rankedEntries, user?.id]);
    const currentUserId = user?.id ?? null;
    return (_jsxs("div", { className: "gd-arcade-leaderboard-page", children: [_jsxs("div", { className: "gd-arcade-leaderboard-scene", "aria-hidden": "true", children: [_jsx("div", { className: "gd-arcade-leaderboard-grid" }), _jsx("div", { className: "gd-arcade-leaderboard-corner gd-arcade-leaderboard-corner--left" }), _jsx("div", { className: "gd-arcade-leaderboard-corner gd-arcade-leaderboard-corner--right" })] }), _jsx(Link, { to: "/", className: "gd-arcade-leaderboard-back-button", "aria-label": "Back to home", children: _jsx("span", { className: "gd-arcade-leaderboard-back-icon" }) }), _jsx("div", { className: "gd-arcade-leaderboard-side-buttons", "aria-label": "Sort leaderboard", children: METRIC_OPTIONS.map((metric) => {
                    const isActive = effectiveMetric === metric.id;
                    return (_jsx("button", { type: "button", className: `gd-arcade-leaderboard-side-button${isActive ? ' is-active' : ''}`, onClick: () => {
                            setActiveMetric(metric.id);
                            if (metric.id === 'creators') {
                                setActiveTab('CREATORS');
                                return;
                            }
                            if (activeTab === 'CREATORS') {
                                setActiveTab('TOP_100');
                            }
                        }, "aria-label": `Sort by ${metric.label}`, "aria-pressed": isActive, children: _jsx("span", { className: `gd-arcade-leaderboard-side-icon gd-arcade-leaderboard-side-icon--${metric.icon}` }) }, metric.id));
                }) }), _jsxs("div", { className: "gd-arcade-leaderboard-shell", children: [_jsx("div", { className: "gd-arcade-leaderboard-tabs", role: "tablist", "aria-label": "Leaderboard categories", children: TAB_OPTIONS.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (_jsx("button", { type: "button", role: "tab", "aria-selected": isActive, className: `gd-arcade-leaderboard-tab${isActive ? ' is-active' : ''}`, onClick: () => {
                                    setActiveTab(tab.id);
                                    if (tab.id === 'TOP_100' || tab.id === 'GLOBAL') {
                                        setActiveMetric('stars');
                                    }
                                    if (tab.id === 'CREATORS') {
                                        setActiveMetric('creators');
                                    }
                                }, children: tab.label }, tab.id));
                        }) }), _jsxs("section", { className: "gd-arcade-leaderboard-frame", children: [_jsx("div", { className: "gd-arcade-leaderboard-toprail" }), _jsxs("div", { className: "gd-arcade-leaderboard-board", children: [leaderboardQuery.isLoading ? (_jsx("div", { className: "gd-arcade-leaderboard-feedback", children: _jsx("p", { children: "Loading leaderboard..." }) })) : null, !leaderboardQuery.isLoading && activeTab === 'FRIENDS' && !user ? (_jsx("div", { className: "gd-arcade-leaderboard-feedback", children: _jsx("p", { children: "Sign in to unlock friend comparisons." }) })) : null, !leaderboardQuery.isLoading && activeTab === 'FRIENDS' && user && !visibleEntries.length ? (_jsx("div", { className: "gd-arcade-leaderboard-feedback", children: _jsx("p", { children: "Friend list is not wired yet. Your rank card will show here later." }) })) : null, !leaderboardQuery.isLoading && activeTab !== 'FRIENDS' && !visibleEntries.length ? (_jsx("div", { className: "gd-arcade-leaderboard-feedback", children: _jsx("p", { children: "No ranked players yet." }) })) : null, !leaderboardQuery.isLoading && visibleEntries.length ? (_jsx("div", { className: "gd-arcade-leaderboard-list", role: "list", children: visibleEntries.map((entry) => {
                                            const isCurrentUser = currentUserId === entry.id;
                                            return (_jsxs("article", { className: `gd-arcade-leaderboard-row${isCurrentUser ? ' is-current-user' : ''}`, role: "listitem", children: [_jsxs("div", { className: "gd-arcade-leaderboard-rank-column", children: [_jsx("div", { className: "gd-arcade-leaderboard-avatar", style: getAvatarTone(entry), children: _jsx("span", { children: getAvatarGlyph(entry) }) }), _jsx("span", { className: "gd-arcade-leaderboard-rank-number", children: entry.rank })] }), _jsxs("div", { className: "gd-arcade-leaderboard-row-main", children: [_jsxs("div", { className: "gd-arcade-leaderboard-row-top", children: [_jsx("h2", { className: "gd-arcade-leaderboard-player-name", children: entry.username }), _jsxs("div", { className: "gd-arcade-leaderboard-primary-stats", children: [_jsx(LeaderboardStat, { icon: "star", value: formatNumber(entry.totalStars) }), _jsx(LeaderboardStat, { icon: "moon", value: formatNumber(entry.completedOfficialLevels) })] })] }), _jsxs("div", { className: "gd-arcade-leaderboard-secondary-stats", children: [_jsx(LeaderboardMiniStat, { icon: "diamond", value: `#${entry.rank}` }), _jsx(LeaderboardMiniStat, { icon: "coin", value: formatNumber(entry.officialLevelsAuthored) }), _jsx(LeaderboardMiniStat, { icon: "tools", value: getJoinedCopy(entry.createdAt) }), _jsx(LeaderboardMiniStat, { icon: "clock", value: isCurrentUser ? 'You' : 'Pilot' })] })] })] }, `${activeTab}-${effectiveMetric}-${entry.id}`));
                                        }) })) : null] }), _jsxs("div", { className: "gd-arcade-leaderboard-bottom", children: [_jsx("div", { className: "gd-arcade-leaderboard-bottom-rail" }), _jsx("div", { className: "gd-arcade-leaderboard-bottom-core", "aria-hidden": "true" }), _jsx("div", { className: "gd-arcade-leaderboard-bottom-copy", children: getFooterCopy({
                                            activeTab,
                                            activeMetric: effectiveMetric,
                                            totalEntries: visibleEntries.length,
                                            myRank: myRankQuery.data?.entry,
                                        }) })] })] })] })] }));
}
function LeaderboardStat({ icon, value }) {
    return (_jsxs("span", { className: "gd-arcade-leaderboard-stat", children: [_jsx("span", { className: `gd-arcade-leaderboard-stat-icon gd-arcade-leaderboard-stat-icon--${icon}`, "aria-hidden": "true" }), _jsx("span", { className: "gd-arcade-leaderboard-stat-value", children: value })] }));
}
function LeaderboardMiniStat({ icon, value }) {
    return (_jsxs("span", { className: "gd-arcade-leaderboard-mini-stat", children: [_jsx("span", { className: `gd-arcade-leaderboard-stat-icon gd-arcade-leaderboard-stat-icon--${icon}`, "aria-hidden": "true" }), _jsx("span", { className: "gd-arcade-leaderboard-mini-value", children: value })] }));
}
