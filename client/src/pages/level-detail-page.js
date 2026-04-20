import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Panel } from '../components/ui';
import { GameCanvas } from '../features/game/game-canvas';
import { useSelectedPlayerSkinRecord } from '../features/game/player-skin-selection';
import { DifficultyIcon } from '../features/levels/difficulty-icon';
import { formatThemeName, getDifficultyPresentation, getDisplayedStars } from '../features/levels/level-presentation';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
export function LevelDetailPage() {
    const { slugOrId = '' } = useParams();
    const user = useAuthStore((state) => state.user);
    const selectedPlayerSkinRecord = useSelectedPlayerSkinRecord();
    const levelQuery = useQuery({
        queryKey: ['official-level', slugOrId],
        queryFn: () => apiRequest(`/api/levels/official/${slugOrId}`),
        enabled: Boolean(slugOrId),
    });
    const level = levelQuery.data?.level;
    if (levelQuery.isLoading) {
        return (_jsx(Panel, { className: "game-screen bg-transparent", children: _jsx("p", { className: "font-display text-sm tracking-[0.24em] text-white/78", children: "Loading stage briefing..." }) }));
    }
    if (!level) {
        return (_jsx(Panel, { className: "game-screen bg-transparent", children: _jsx("p", { className: "font-display text-sm tracking-[0.24em] text-white/78", children: "Stage not found." }) }));
    }
    const difficulty = getDifficultyPresentation(level.difficulty);
    const rewardStars = getDisplayedStars(level);
    const detailStyle = {
        '--gd-stage-primary': difficulty.primary,
        '--gd-stage-secondary': difficulty.secondary,
        '--gd-stage-highlight': difficulty.highlight,
        '--gd-stage-glow': difficulty.glow,
    };
    return (_jsxs("div", { className: "mx-auto max-w-6xl space-y-6", children: [_jsx("article", { className: "gd-stage-briefing-card", style: detailStyle, children: _jsxs("div", { className: "gd-stage-briefing-grid", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Badge, { tone: "default", children: "Official Briefing" }), _jsx(Badge, { tone: "accent", children: difficulty.label }), _jsxs(Badge, { tone: "success", children: [rewardStars, " Stars"] }), level.featured ? _jsx(Badge, { tone: "success", children: "Featured" }) : null] }), _jsxs("div", { className: "flex flex-col gap-6 md:flex-row md:items-start", children: [_jsx(DifficultyIcon, { difficulty: level.difficulty, size: "lg", showStars: true }), _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "gd-stage-eyebrow", children: "Stage Launch Brief" }), _jsx("h2", { className: "font-display text-4xl leading-[0.9] text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.35)] md:text-6xl", children: level.title }), _jsx("p", { className: "max-w-3xl text-sm leading-8 text-white/82", children: level.description?.trim() ||
                                                        'No extra briefing copy yet. Read the route through its layout, timing, and difficulty rhythm.' }), _jsxs("div", { className: "gd-stage-meta", children: [_jsx("span", { className: "gd-stage-meta-pill", children: formatThemeName(level.theme) }), _jsxs("span", { className: "gd-stage-meta-pill", children: ["Builder ", level.author?.username ?? 'Unknown'] }), _jsx("span", { className: "gd-stage-meta-pill", children: "Reward pays on first clear" })] })] })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [_jsx(BriefChip, { label: "Difficulty", value: difficulty.label }), _jsx(BriefChip, { label: "Reward", value: `${rewardStars} Stars` }), _jsx(BriefChip, { label: "Theme", value: formatThemeName(level.theme) })] })] }), _jsxs("div", { className: "gd-stage-briefing-actions", children: [_jsxs("div", { className: "gd-stage-reward gd-stage-reward-large", children: [_jsx("span", { className: "gd-stage-reward-value", children: rewardStars }), _jsx("span", { className: "gd-stage-reward-label", children: "Official Reward" })] }), _jsx(Panel, { className: "game-screen bg-transparent", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Launch Window" }), _jsx("h3", { className: "font-display text-3xl text-white", children: "Ready To Run" })] }), _jsx("p", { className: "text-sm leading-7 text-white/80", children: "The live run uses the same runtime as the official play screen. Signed-in runs are tracked for rewards and leaderboard progress, while guests can still jump in and practice freely." }), _jsxs("div", { className: "grid gap-3", children: [_jsx(Link, { to: `/play/${level.slug}`, children: _jsx(Button, { className: "w-full", children: user ? 'Launch Official Run' : 'Play As Guest' }) }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Link, { to: "/levels", children: _jsx(Button, { variant: "ghost", className: "w-full", children: "Back To Select" }) }), _jsx(Link, { to: "/leaderboard", children: _jsx(Button, { variant: "secondary", className: "w-full", children: "Leaderboard" }) })] })] })] }) }), _jsx(Panel, { className: "game-screen bg-transparent", children: _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "arcade-eyebrow", children: "Clear Rules" }), _jsx("p", { className: "text-sm leading-7 text-white/78", children: "Stars are granted only on the first successful official clear for signed-in pilots. Guest runs are great for routing, timing, and learning the lane, but they do not enter the leaderboard." })] }) })] })] }) }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.18fr_0.82fr]", children: [_jsx(GameCanvas, { levelData: level.dataJson, attemptNumber: 1, autoRestartOnFail: true, playerSkinOverrides: selectedPlayerSkinRecord }), _jsxs("div", { className: "space-y-4", children: [_jsx(Panel, { className: "game-screen bg-transparent", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Route Brief" }), _jsx("h3", { className: "font-display text-3xl text-white", children: "What To Expect" })] }), _jsx("p", { className: "text-sm leading-7 text-white/78", children: "Use this screen as your launch pad: preview the route, check its reward band, and get a feel for the stage before entering the official session wrapper." }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(BriefChip, { label: "Builder", value: level.author?.username ?? 'Unknown' }), _jsx(BriefChip, { label: "Featured", value: level.featured ? 'Yes' : 'No' }), _jsx(BriefChip, { label: "Session", value: "Server Backed" }), _jsx(BriefChip, { label: "Restart", value: "Instant Retry" })] })] }) }), _jsx(Panel, { className: "game-screen bg-transparent", children: _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "arcade-eyebrow", children: "Why This Screen Exists" }), _jsx("p", { className: "text-sm leading-7 text-white/78", children: "The goal is to make stage launch feel deliberate: one clean briefing card, a readable live preview, and a strong launch button instead of raw metadata blocks." })] }) })] })] })] }));
}
function BriefChip({ label, value }) {
    return (_jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: label }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: value })] }));
}
