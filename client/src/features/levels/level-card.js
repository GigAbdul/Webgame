import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui';
import { DifficultyIcon } from './difficulty-icon';
import { formatStageNumber, formatThemeName, getDifficultyPresentation, getDisplayedStars, } from './level-presentation';
export function LevelCard({ level, index, selected }) {
    const difficulty = getDifficultyPresentation(level.difficulty);
    const rewardStars = getDisplayedStars(level);
    const themeLabel = formatThemeName(level.theme);
    const stageNumber = formatStageNumber(index);
    const rewardPercent = Math.max(18, Math.min(100, rewardStars * 10));
    const intensityPercent = Math.max(18, difficulty.meter);
    const rewardPips = rewardStars >= 10 ? 3 : rewardStars >= 6 ? 2 : rewardStars > 0 ? 1 : 0;
    const cardStyle = {
        '--gd-stage-primary': difficulty.primary,
        '--gd-stage-secondary': difficulty.secondary,
        '--gd-stage-highlight': difficulty.highlight,
        '--gd-stage-glow': difficulty.glow,
    };
    return (_jsx("article", { className: `gd-level-selector-card${selected ? ' is-active' : ''}`, style: cardStyle, children: _jsxs("div", { className: "gd-level-selector-window", children: [_jsxs("div", { className: "gd-level-selector-header", children: [_jsxs("span", { className: "gd-level-selector-stage", children: ["Stage ", stageNumber] }), _jsxs("span", { className: "gd-level-selector-stars", children: [rewardStars, " ", _jsx("span", { className: "gd-level-selector-stars-mark", children: "*" })] })] }), _jsxs("div", { className: "gd-level-selector-banner", children: [_jsx(DifficultyIcon, { difficulty: level.difficulty, size: "sm" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h3", { className: "gd-level-selector-title", children: level.title }), _jsxs("p", { className: "gd-level-selector-subtitle", children: [difficulty.label, " / ", themeLabel] }), _jsxs("p", { className: "gd-level-selector-note", children: ["by ", level.author?.username ?? 'Unknown', " / official route"] })] }), _jsx("div", { className: "gd-level-selector-pips", "aria-hidden": "true", children: Array.from({ length: 3 }).map((_, pipIndex) => (_jsx("span", { className: `gd-level-selector-pip${pipIndex < rewardPips ? ' is-active' : ''}` }, `${level.id}-pip-${pipIndex}`))) })] }), _jsxs("div", { className: "gd-level-selector-preview", children: [_jsxs("div", { className: "gd-level-selector-preview-copy", children: [_jsx("span", { children: "Route Preview" }), _jsx("span", { children: selected ? 'Selected Lane' : 'In Queue' })] }), _jsxs("div", { className: "gd-level-selector-preview-window", children: [_jsx("div", { className: "gd-level-selector-preview-ground" }), _jsx("div", { className: "gd-level-selector-preview-cube" }), _jsx("div", { className: "gd-level-selector-preview-block is-short" }), _jsx("div", { className: "gd-level-selector-preview-block is-tall" }), _jsx("div", { className: "gd-level-selector-preview-spike" }), _jsx("div", { className: "gd-level-selector-preview-portal" })] })] }), _jsxs("div", { className: "gd-level-selector-bars", children: [_jsx(SelectorBar, { label: "Official Reward", value: `${rewardStars} Stars`, percent: rewardPercent }), _jsx(SelectorBar, { label: "Route Pressure", value: difficulty.label, percent: intensityPercent })] }), _jsxs("div", { className: "gd-level-selector-footer", children: [_jsxs("div", { className: "gd-level-selector-meta", children: [_jsx("span", { className: "gd-level-selector-chip", children: themeLabel }), level.featured ? _jsx("span", { className: "gd-level-selector-chip is-featured", children: "Featured" }) : null] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(Link, { to: `/levels/${level.slug}`, children: _jsx(Button, { variant: "secondary", children: "Briefing" }) }), _jsx(Link, { to: `/play/${level.slug}`, children: _jsx(Button, { children: "Launch" }) })] })] })] }) }));
}
function SelectorBar({ label, value, percent, }) {
    return (_jsxs("div", { className: "gd-level-selector-bar-block", children: [_jsxs("div", { className: "gd-level-selector-bar-copy", children: [_jsx("span", { children: label }), _jsx("span", { children: value })] }), _jsx("div", { className: "gd-level-selector-bar", children: _jsx("div", { className: "gd-level-selector-bar-fill", style: { width: `${percent}%` } }) })] }));
}
