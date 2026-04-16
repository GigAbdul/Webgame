import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { DifficultyIcon } from '../features/levels/difficulty-icon';
import { getDisplayedStars } from '../features/levels/level-presentation';
import { apiRequest } from '../services/api';
const EMPTY_LEVELS = [];
export function LevelsPage() {
    const levelsQuery = useQuery({
        queryKey: ['official-levels'],
        queryFn: () => apiRequest('/api/levels/official'),
    });
    const levelList = levelsQuery.data?.levels ?? EMPTY_LEVELS;
    const [displayedIndex, setDisplayedIndex] = useState(0);
    const [pendingIndex, setPendingIndex] = useState(null);
    const [transitionDirection, setTransitionDirection] = useState('next');
    const initializedRef = useRef(false);
    const displayedLevel = levelList[displayedIndex] ?? null;
    const incomingLevel = pendingIndex !== null ? levelList[pendingIndex] ?? null : null;
    const activeIndex = pendingIndex ?? displayedIndex;
    const isAnimating = pendingIndex !== null;
    const canGoPrevious = activeIndex > 0;
    const canGoNext = activeIndex < levelList.length - 1;
    useEffect(() => {
        if (!levelList.length) {
            initializedRef.current = false;
            setDisplayedIndex(0);
            setPendingIndex(null);
            return;
        }
        if (initializedRef.current) {
            setDisplayedIndex((current) => Math.min(current, levelList.length - 1));
            setPendingIndex((current) => current === null ? null : Math.min(current, levelList.length - 1));
            return;
        }
        const featuredIndex = levelList.findIndex((level) => level.featured);
        initializedRef.current = true;
        setDisplayedIndex(featuredIndex >= 0 ? featuredIndex : 0);
        setPendingIndex(null);
    }, [levelList]);
    useEffect(() => {
        if (!levelList.length) {
            return;
        }
        const handleKeyDown = (event) => {
            if (isAnimating) {
                return;
            }
            if (event.key === 'ArrowLeft') {
                if (displayedIndex <= 0) {
                    return;
                }
                event.preventDefault();
                setTransitionDirection('previous');
                setPendingIndex(displayedIndex - 1);
            }
            if (event.key === 'ArrowRight') {
                if (displayedIndex >= levelList.length - 1) {
                    return;
                }
                event.preventDefault();
                setTransitionDirection('next');
                setPendingIndex(displayedIndex + 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [displayedIndex, isAnimating, levelList]);
    const requestLevelChange = (targetIndex, direction) => {
        if (!levelList.length || isAnimating) {
            return;
        }
        if (targetIndex < 0 || targetIndex >= levelList.length || targetIndex === displayedIndex) {
            return;
        }
        setTransitionDirection(direction ?? (targetIndex > displayedIndex ? 'next' : 'previous'));
        setPendingIndex(targetIndex);
    };
    const selectNextLevel = () => {
        requestLevelChange(displayedIndex + 1, 'next');
    };
    const selectPreviousLevel = () => {
        requestLevelChange(displayedIndex - 1, 'previous');
    };
    const handleTransitionComplete = (event) => {
        if (event.target !== event.currentTarget || pendingIndex === null) {
            return;
        }
        setDisplayedIndex(pendingIndex);
        setPendingIndex(null);
    };
    return (_jsxs("div", { className: "gd-classic-level-page", children: [_jsxs("div", { className: "gd-classic-level-scene", "aria-hidden": "true", children: [_jsx("div", { className: "gd-classic-level-glow" }), _jsx("div", { className: "gd-classic-level-grid" }), _jsx("div", { className: "gd-classic-level-floor" }), _jsx("div", { className: "gd-classic-level-corner gd-classic-level-corner--left" }), _jsx("div", { className: "gd-classic-level-corner gd-classic-level-corner--right" })] }), _jsx(Link, { to: "/", className: "gd-classic-menu-button", "aria-label": "Back to main menu", children: _jsx("span", { className: "gd-classic-back-button-icon" }) }), displayedLevel ? (_jsxs(_Fragment, { children: [canGoPrevious ? (_jsx("button", { type: "button", className: "gd-classic-back-button gd-classic-back-button--previous", onClick: selectPreviousLevel, "aria-label": "Previous level", disabled: isAnimating, children: _jsx("span", { className: "gd-classic-back-button-icon" }) })) : null, canGoNext ? (_jsx("button", { type: "button", className: "gd-classic-back-button gd-classic-back-button--next", onClick: selectNextLevel, "aria-label": "Next level", disabled: isAnimating, children: _jsx("span", { className: "gd-classic-back-button-icon gd-classic-back-button-icon--next" }) })) : null, _jsxs("div", { className: "gd-classic-level-shell", children: [_jsxs("div", { className: "gd-classic-level-carousel", "aria-live": "polite", children: [_jsx(LevelPanel, { level: displayedLevel, className: incomingLevel
                                            ? `gd-classic-level-panel gd-classic-level-panel--exit gd-classic-level-panel--${transitionDirection}`
                                            : 'gd-classic-level-panel gd-classic-level-panel--static' }), incomingLevel ? (_jsx(LevelPanel, { level: incomingLevel, className: `gd-classic-level-panel gd-classic-level-panel--enter gd-classic-level-panel--${transitionDirection}`, onAnimationEnd: handleTransitionComplete })) : null] }), _jsx("div", { className: "gd-classic-level-dots", "aria-label": "Level selection", children: levelList.map((level, index) => (_jsx("button", { type: "button", className: `gd-classic-level-dot${index === activeIndex ? ' is-active' : ''}`, onClick: () => requestLevelChange(index), "aria-label": `Go to ${level.title}`, disabled: isAnimating && index === activeIndex }, `${level.id}-dot`))) })] })] })) : null, levelsQuery.isLoading ? (_jsx("div", { className: "gd-classic-level-feedback", children: _jsx("p", { children: "Loading official levels..." }) })) : null, !levelsQuery.isLoading && !displayedLevel ? (_jsx("div", { className: "gd-classic-level-feedback", children: _jsx("p", { children: "No official levels yet." }) })) : null] }));
}
function LevelPanel({ level, className, onAnimationEnd, }) {
    return (_jsx("div", { className: className, onAnimationEnd: onAnimationEnd, children: _jsxs("div", { className: "gd-classic-level-panel-body", children: [_jsxs(Link, { to: `/play/${level.slug}`, className: "gd-classic-level-hero gd-classic-level-hero--playable", "aria-label": `Play ${level.title}`, children: [_jsxs("div", { className: "gd-classic-level-hero-main", children: [_jsx(DifficultyIcon, { difficulty: level.difficulty, size: "lg" }), _jsx("div", { className: "gd-classic-level-title-wrap", children: _jsx("h1", { className: "gd-classic-level-title", children: level.title }) }), _jsxs("div", { className: "gd-classic-level-stars", children: [_jsx("span", { className: "gd-classic-level-stars-count", children: getDisplayedStars(level) }), _jsx("span", { className: "gd-classic-level-stars-mark", "aria-hidden": "true" })] })] }), _jsxs("div", { className: "gd-classic-level-coins", "aria-hidden": "true", children: [_jsx("span", { className: "gd-classic-level-coin" }), _jsx("span", { className: "gd-classic-level-coin" }), _jsx("span", { className: "gd-classic-level-coin" })] })] }), _jsxs("div", { className: "gd-classic-level-bars", children: [_jsx(ProgressLane, { label: "Normal Mode", progress: 0 }), _jsx(ProgressLane, { label: "Practice Mode", progress: 0 })] }), _jsx(Link, { to: `/levels/${level.slug}`, className: "gd-classic-soundtrack-button", "aria-label": `Open details for ${level.title}`, children: "Download The Soundtracks" })] }) }));
}
function ProgressLane({ label, progress, }) {
    return (_jsxs("div", { className: "gd-classic-progress-group", children: [_jsx("p", { className: "gd-classic-progress-label", children: label }), _jsxs("div", { className: "gd-classic-progress-track", children: [_jsx("div", { className: "gd-classic-progress-fill", style: { width: `${progress}%` } }), _jsxs("span", { className: "gd-classic-progress-value", children: [progress, "%"] })] })] }));
}
