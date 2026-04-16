import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { resolveLevelMusic } from '../features/game/level-music';
import { apiRequest } from '../services/api';
const FILTER_OPTIONS = [
    { id: 'ALL', label: 'All' },
    { id: 'DRAFTS', label: 'Drafts' },
    { id: 'QUEUE', label: 'Queue' },
];
function formatUpdatedDate(value) {
    return new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}
function getLevelStatusCopy(level) {
    if (level.isOfficial || level.status === 'OFFICIAL') {
        return 'Official';
    }
    if (level.status === 'SUBMITTED') {
        return 'In Review';
    }
    if (level.status === 'ARCHIVED') {
        return 'Archived';
    }
    return 'Draft';
}
function getLevelMetaBadge(level) {
    if (level.status === 'DRAFT') {
        return `v${level.versionNumber}`;
    }
    if (level.isOfficial || level.status === 'OFFICIAL') {
        return `${level.starsReward} stars`;
    }
    if (level.status === 'ARCHIVED') {
        return 'Stored';
    }
    return 'Waiting';
}
function getVerificationCopy(level) {
    if (level.isOfficial || level.status === 'OFFICIAL') {
        return 'Official';
    }
    if (level.status === 'SUBMITTED') {
        return 'In Review';
    }
    if (level.status === 'ARCHIVED') {
        return 'Archived';
    }
    return 'Unverified';
}
function getLengthCopy(lengthUnits) {
    if (lengthUnits <= 120) {
        return 'Tiny';
    }
    if (lengthUnits <= 180) {
        return 'Short';
    }
    if (lengthUnits <= 260) {
        return 'Medium';
    }
    if (lengthUnits <= 360) {
        return 'Long';
    }
    return 'XL';
}
function matchesFilter(level, filterMode) {
    if (filterMode === 'DRAFTS') {
        return level.status === 'DRAFT';
    }
    if (filterMode === 'QUEUE') {
        return level.status !== 'DRAFT';
    }
    return true;
}
function MyLevelsBackIcon() {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "gd-my-levels-icon-svg", "aria-hidden": "true", children: [_jsx("path", { d: "M41 14 19 32l22 18", fill: "none", stroke: "currentColor", strokeWidth: "8", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M20 32h26", fill: "none", stroke: "currentColor", strokeWidth: "8", strokeLinecap: "round" })] }));
}
function MyLevelsSearchIcon() {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "gd-my-levels-icon-svg", "aria-hidden": "true", children: [_jsx("circle", { cx: "27", cy: "27", r: "14", fill: "none", stroke: "currentColor", strokeWidth: "7" }), _jsx("path", { d: "M38 38l12 12", fill: "none", stroke: "currentColor", strokeWidth: "7", strokeLinecap: "round" })] }));
}
function MyLevelsFolderIcon() {
    return (_jsxs("svg", { viewBox: "0 0 88 64", className: "gd-my-levels-icon-svg", "aria-hidden": "true", children: [_jsx("path", { d: "M8 20h22l7-8h16c3.8 0 7 3.2 7 7v5H8Z", fill: "#ffd44a", stroke: "#0f1b31", strokeWidth: "4", strokeLinejoin: "round" }), _jsx("path", { d: "M6 22h76v30c0 3.3-2.7 6-6 6H12c-3.3 0-6-2.7-6-6Z", fill: "url(#folderBody)", stroke: "#0f1b31", strokeWidth: "4", strokeLinejoin: "round" }), _jsx("defs", { children: _jsxs("linearGradient", { id: "folderBody", x1: "44", y1: "22", x2: "44", y2: "58", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { stopColor: "#ffd44a" }), _jsx("stop", { offset: "1", stopColor: "#ffb624" })] }) })] }));
}
function MyLevelsCardIcon() {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "gd-my-levels-icon-svg", "aria-hidden": "true", children: [_jsx("rect", { x: "12", y: "10", width: "40", height: "44", rx: "8", fill: "#8c4f1d", stroke: "#5d3415", strokeWidth: "4" }), _jsx("rect", { x: "18", y: "16", width: "28", height: "32", rx: "6", fill: "#b77535" }), _jsx("circle", { cx: "32", cy: "30", r: "8", fill: "#2bcfff" }), _jsx("path", { d: "M23 18h18M23 42h18", fill: "none", stroke: "#f9dfc0", strokeWidth: "4", strokeLinecap: "round" })] }));
}
function MyLevelsPlusIcon() {
    return (_jsx("svg", { viewBox: "0 0 64 64", className: "gd-my-levels-icon-svg", "aria-hidden": "true", children: _jsx("path", { d: "M32 14v36M14 32h36", fill: "none", stroke: "currentColor", strokeWidth: "8", strokeLinecap: "round" }) }));
}
function MyLevelsTrashIcon() {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "gd-my-levels-icon-svg", "aria-hidden": "true", children: [_jsx("path", { d: "M22 16h20l2 6H20l2-6Z", fill: "#f6f8fc", stroke: "#343434", strokeWidth: "3.5", strokeLinejoin: "round" }), _jsx("path", { d: "M18 22h28v28c0 3-2 5-5 5H23c-3 0-5-2-5-5Z", fill: "#cdced4", stroke: "#343434", strokeWidth: "4", strokeLinejoin: "round" }), _jsx("path", { d: "M25 28v18M32 28v18M39 28v18", fill: "none", stroke: "#343434", strokeWidth: "4", strokeLinecap: "round" }), _jsx("path", { d: "M16 22h32", fill: "none", stroke: "#343434", strokeWidth: "4.5", strokeLinecap: "round" })] }));
}
function MyLevelsSelectAllIcon() {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "gd-my-levels-icon-svg", "aria-hidden": "true", children: [_jsx("rect", { x: "10", y: "12", width: "16", height: "16", rx: "3", fill: "#ffffff", stroke: "#3d3d3d", strokeWidth: "4" }), _jsx("rect", { x: "10", y: "36", width: "16", height: "16", rx: "3", fill: "#ffffff", stroke: "#3d3d3d", strokeWidth: "4" }), _jsx("path", { d: "M35 20h18M35 44h18", fill: "none", stroke: "#3d3d3d", strokeWidth: "6", strokeLinecap: "round" }), _jsx("path", { d: "m13 21 5 5 10-11", fill: "none", stroke: "#64cd22", strokeWidth: "4.5", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "m13 45 5 5 10-11", fill: "none", stroke: "#64cd22", strokeWidth: "4.5", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
function MyLevelsClockIcon() {
    return (_jsxs("svg", { viewBox: "0 0 48 48", className: "gd-my-levels-icon-svg", "aria-hidden": "true", children: [_jsx("circle", { cx: "24", cy: "24", r: "18", fill: "#ffffff", stroke: "#111316", strokeWidth: "4" }), _jsx("path", { d: "M24 13v12l7 6", fill: "none", stroke: "#111316", strokeWidth: "4", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M24 8v4M24 36v4M8 24h4M36 24h4", fill: "none", stroke: "#111316", strokeWidth: "3", strokeLinecap: "round" })] }));
}
function MyLevelsMusicIcon() {
    return (_jsx("svg", { viewBox: "0 0 48 48", className: "gd-my-levels-icon-svg", "aria-hidden": "true", children: _jsx("path", { d: "M18 10v20c0 3-2.3 5.5-5.5 5.5S7 33 7 30s2.3-5.5 5.5-5.5c1.1 0 2.2.3 3.2.8V13.8l18-4.3v17.7c0 3-2.3 5.5-5.5 5.5S22.7 30 22.7 27s2.3-5.5 5.5-5.5c1.1 0 2.1.3 3 .7V12.7Z", fill: "#ffffff", stroke: "#111316", strokeWidth: "3", strokeLinejoin: "round" }) }));
}
function MyLevelsInfoIcon() {
    return (_jsxs("svg", { viewBox: "0 0 48 48", className: "gd-my-levels-icon-svg", "aria-hidden": "true", children: [_jsx("circle", { cx: "24", cy: "24", r: "18", fill: "url(#infoFill)", stroke: "#0d1a26", strokeWidth: "4" }), _jsx("path", { d: "M24 21v12M24 15h.01", fill: "none", stroke: "#ffffff", strokeWidth: "5", strokeLinecap: "round" }), _jsx("defs", { children: _jsxs("linearGradient", { id: "infoFill", x1: "24", y1: "6", x2: "24", y2: "42", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { stopColor: "#56fbff" }), _jsx("stop", { offset: "1", stopColor: "#00b7ff" })] }) })] }));
}
function MyLevelsCheckIcon() {
    return (_jsx("svg", { viewBox: "0 0 24 24", className: "gd-my-levels-icon-svg", "aria-hidden": "true", children: _jsx("path", { d: "m5 12 4.2 4.2L19 6.4", fill: "none", stroke: "currentColor", strokeWidth: "3.5", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
export function MyLevelsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const searchInputRef = useRef(null);
    const [filterMode, setFilterMode] = useState('ALL');
    const [searchValue, setSearchValue] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedLevelId, setSelectedLevelId] = useState(null);
    const [checkedLevelIds, setCheckedLevelIds] = useState([]);
    const levelsQuery = useQuery({
        queryKey: ['my-levels'],
        queryFn: () => apiRequest('/api/levels/mine'),
    });
    const deleteMutation = useMutation({
        mutationFn: async (ids) => Promise.all(ids.map((id) => apiRequest(`/api/levels/${id}`, {
            method: 'DELETE',
        }))),
        onSuccess: async () => {
            setCheckedLevelIds([]);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['my-levels'] }),
                queryClient.invalidateQueries({ queryKey: ['profile'] }),
            ]);
        },
    });
    const levels = levelsQuery.data?.levels ?? [];
    const trimmedSearch = searchValue.trim().toLowerCase();
    const currentFilterLabel = FILTER_OPTIONS.find((filter) => filter.id === filterMode)?.label ?? 'All';
    const filteredLevels = levels.filter((level) => {
        if (!matchesFilter(level, filterMode)) {
            return false;
        }
        if (!trimmedSearch) {
            return true;
        }
        return level.title.toLowerCase().includes(trimmedSearch);
    });
    const mutableFilteredLevels = filteredLevels.filter((level) => !level.isOfficial && level.status !== 'OFFICIAL');
    const mutableFilteredLevelIds = mutableFilteredLevels.map((level) => level.id);
    const checkedVisibleLevelIds = checkedLevelIds.filter((id) => mutableFilteredLevelIds.includes(id));
    const allVisibleLevelsChecked = Boolean(mutableFilteredLevelIds.length) && mutableFilteredLevelIds.every((id) => checkedLevelIds.includes(id));
    const selectedLevel = filteredLevels.find((level) => level.id === selectedLevelId) ?? null;
    useEffect(() => {
        if (!isSearchOpen) {
            return;
        }
        searchInputRef.current?.focus();
    }, [isSearchOpen]);
    useEffect(() => {
        const visibleIds = new Set(mutableFilteredLevelIds);
        setCheckedLevelIds((current) => {
            const next = current.filter((id) => visibleIds.has(id));
            return next.length === current.length ? current : next;
        });
    }, [mutableFilteredLevelIds]);
    useEffect(() => {
        if (!filteredLevels.length) {
            if (selectedLevelId !== null) {
                setSelectedLevelId(null);
            }
            return;
        }
        const hasSelectedLevel = filteredLevels.some((level) => level.id === selectedLevelId);
        if (!hasSelectedLevel) {
            setSelectedLevelId(filteredLevels[0].id);
        }
    }, [filteredLevels, selectedLevelId]);
    const openSelectedCard = () => {
        if (!selectedLevel) {
            return;
        }
        navigate(`/my-levels/${selectedLevel.id}`);
    };
    const handleDeleteSelected = () => {
        if (!checkedVisibleLevelIds.length) {
            return;
        }
        deleteMutation.mutate(checkedVisibleLevelIds);
    };
    const toggleLevelChecked = (levelId) => {
        setCheckedLevelIds((current) => (current.includes(levelId) ? current.filter((id) => id !== levelId) : [...current, levelId]));
    };
    const toggleSelectAllVisible = () => {
        if (!mutableFilteredLevelIds.length) {
            return;
        }
        setCheckedLevelIds((current) => {
            if (mutableFilteredLevelIds.every((id) => current.includes(id))) {
                return current.filter((id) => !mutableFilteredLevelIds.includes(id));
            }
            return Array.from(new Set([...current, ...mutableFilteredLevelIds]));
        });
    };
    return (_jsxs("div", { className: "gd-my-levels-page", children: [_jsxs("div", { className: "gd-my-levels-scene", "aria-hidden": "true", children: [_jsx("div", { className: "gd-my-levels-grid" }), _jsx("div", { className: "gd-my-levels-corner gd-my-levels-corner--left" }), _jsx("div", { className: "gd-my-levels-corner gd-my-levels-corner--right" })] }), _jsx(Link, { to: "/", className: "gd-my-levels-side-arrow", "aria-label": "Back to home", children: _jsx("span", { className: "gd-my-levels-side-arrow-icon", children: _jsx(MyLevelsBackIcon, {}) }) }), _jsx("button", { type: "button", className: "gd-my-levels-square-button gd-my-levels-square-button--search", onClick: () => {
                    if (isSearchOpen) {
                        setIsSearchOpen(false);
                        setSearchValue('');
                        return;
                    }
                    setIsSearchOpen(true);
                }, "aria-label": isSearchOpen ? 'Hide search' : 'Search levels', "aria-pressed": isSearchOpen, children: _jsx("span", { className: "gd-my-levels-search-icon", children: _jsx(MyLevelsSearchIcon, {}) }) }), _jsxs("div", { className: "gd-my-levels-folder-counter", "aria-label": `${filteredLevels.length} levels in this view`, children: [_jsx("span", { className: "gd-my-levels-folder-icon", "aria-hidden": "true", children: _jsx(MyLevelsFolderIcon, {}) }), _jsx("span", { className: "gd-my-levels-folder-count", children: filteredLevels.length })] }), _jsxs("button", { type: "button", className: "gd-my-levels-round-button gd-my-levels-round-button--card", onClick: openSelectedCard, disabled: !selectedLevel, "aria-label": "Open selected level card", children: [_jsx("span", { className: "gd-my-levels-book-icon", "aria-hidden": "true", children: _jsx(MyLevelsCardIcon, {}) }), _jsx("span", { className: "gd-my-levels-round-button-copy", children: "Card" })] }), _jsxs("button", { type: "button", className: "gd-my-levels-round-button gd-my-levels-round-button--new", onClick: () => navigate('/my-levels/new'), "aria-label": "Create a new level", children: [_jsx("span", { className: "gd-my-levels-plus-icon", "aria-hidden": "true", children: _jsx(MyLevelsPlusIcon, {}) }), _jsx("span", { className: "gd-my-levels-round-button-copy", children: "New" })] }), _jsx("div", { className: "gd-my-levels-shell", children: _jsxs("section", { className: "gd-my-levels-frame", children: [_jsx("header", { className: "gd-my-levels-titlebar", children: _jsx("h1", { className: "gd-my-levels-title", children: "MY LEVELS" }) }), _jsxs("div", { className: "gd-my-levels-board", children: [isSearchOpen ? (_jsxs("div", { className: "gd-my-levels-search-row", children: [_jsx("input", { ref: searchInputRef, value: searchValue, onChange: (event) => setSearchValue(event.target.value), className: "gd-my-levels-search-input", placeholder: "Search by level title", "aria-label": "Search levels by title" }), searchValue ? (_jsx("button", { type: "button", className: "gd-my-levels-search-clear", onClick: () => setSearchValue(''), "aria-label": "Clear search", children: "Clear" })) : null] })) : null, levelsQuery.isLoading ? (_jsx("div", { className: "gd-my-levels-feedback", children: _jsx("p", { children: "Loading your levels..." }) })) : null, levelsQuery.isError ? (_jsx("div", { className: "gd-my-levels-feedback", children: _jsx("p", { children: "Could not load your levels." }) })) : null, !levelsQuery.isLoading && !levelsQuery.isError && filteredLevels.length ? (_jsx("div", { className: "gd-my-levels-list", role: "listbox", "aria-label": "My levels", "aria-multiselectable": "true", children: filteredLevels.map((level) => {
                                        const isSelected = level.id === selectedLevelId;
                                        const isChecked = checkedLevelIds.includes(level.id);
                                        const musicLabel = resolveLevelMusic(level.dataJson.meta).label;
                                        const levelLength = getLengthCopy(level.dataJson.meta.lengthUnits);
                                        const verificationCopy = getVerificationCopy(level);
                                        const canDeleteLevel = !level.isOfficial && level.status !== 'OFFICIAL';
                                        const rowTone = level.isOfficial || level.status === 'OFFICIAL'
                                            ? 'is-official'
                                            : level.status === 'DRAFT'
                                                ? 'is-draft'
                                                : 'is-queue';
                                        return (_jsxs("article", { role: "option", "aria-selected": isSelected, tabIndex: 0, className: `gd-my-levels-row ${rowTone}${isSelected ? ' is-selected' : ''}`, onClick: () => setSelectedLevelId(level.id), onDoubleClick: () => navigate(`/my-levels/${level.id}`), onKeyDown: (event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    setSelectedLevelId(level.id);
                                                }
                                            }, children: [_jsxs("div", { className: "gd-my-levels-row-main", children: [_jsx("span", { className: "gd-my-levels-row-title", children: level.title }), _jsxs("div", { className: "gd-my-levels-row-stats", children: [_jsxs("span", { className: "gd-my-levels-row-stat", children: [_jsx("span", { className: "gd-my-levels-row-stat-icon", "aria-hidden": "true", children: _jsx(MyLevelsClockIcon, {}) }), _jsx("span", { children: levelLength })] }), _jsxs("span", { className: "gd-my-levels-row-stat", children: [_jsx("span", { className: "gd-my-levels-row-stat-icon", "aria-hidden": "true", children: _jsx(MyLevelsMusicIcon, {}) }), _jsx("span", { children: musicLabel })] }), _jsxs("span", { className: "gd-my-levels-row-stat", children: [_jsx("span", { className: "gd-my-levels-row-stat-icon", "aria-hidden": "true", children: _jsx(MyLevelsInfoIcon, {}) }), _jsx("span", { children: verificationCopy })] })] }), _jsxs("span", { className: "gd-my-levels-row-copy", children: [getLevelStatusCopy(level), " | Updated ", formatUpdatedDate(level.updatedAt)] })] }), _jsxs("div", { className: "gd-my-levels-row-actions", children: [_jsx("button", { type: "button", className: `gd-my-levels-row-check${isChecked ? ' is-checked' : ''}`, "aria-label": isChecked ? `Unselect ${level.title}` : `Select ${level.title}`, "aria-pressed": isChecked, disabled: !canDeleteLevel, onClick: (event) => {
                                                                event.stopPropagation();
                                                                toggleLevelChecked(level.id);
                                                            }, children: isChecked ? (_jsx("span", { className: "gd-my-levels-row-check-icon", "aria-hidden": "true", children: _jsx(MyLevelsCheckIcon, {}) })) : null }), _jsx("button", { type: "button", className: "gd-my-levels-row-view", onClick: (event) => {
                                                                event.stopPropagation();
                                                                navigate(`/my-levels/${level.id}`);
                                                            }, children: "View" })] })] }, level.id));
                                    }) })) : null, !levelsQuery.isLoading && !levelsQuery.isError && !filteredLevels.length ? (_jsxs("div", { className: "gd-my-levels-empty", children: [trimmedSearch ? (_jsxs("p", { className: "gd-my-levels-empty-copy", children: ["No levels match ", _jsxs("span", { className: "gd-my-levels-empty-token", children: ["\"", searchValue.trim(), "\""] }), "."] })) : filterMode === 'QUEUE' ? (_jsxs("p", { className: "gd-my-levels-empty-copy", children: ["Nothing has reached the ", _jsx("span", { className: "gd-my-levels-empty-token", children: "queue" }), " yet."] })) : (_jsxs("p", { className: "gd-my-levels-empty-copy", children: ["Tap ", _jsx("span", { className: "gd-my-levels-empty-token gd-my-levels-empty-token--green", children: "new" }), " to create a ", _jsx("span", { className: "gd-my-levels-empty-token gd-my-levels-empty-token--blue", children: "level" }), "!"] })), _jsx("button", { type: "button", className: "gd-my-levels-empty-button", onClick: () => {
                                                if (trimmedSearch) {
                                                    setSearchValue('');
                                                    return;
                                                }
                                                navigate('/my-levels/new');
                                            }, children: trimmedSearch ? 'Clear Search' : 'Create Level' })] })) : null] }), _jsxs("div", { className: "gd-my-levels-bottom", children: [_jsx("button", { type: "button", className: "gd-my-levels-mini-button gd-my-levels-mini-button--delete", onClick: handleDeleteSelected, disabled: !checkedVisibleLevelIds.length || deleteMutation.isPending, "aria-label": "Delete selected levels", children: _jsx("span", { className: "gd-my-levels-trash-icon", "aria-hidden": "true", children: _jsx(MyLevelsTrashIcon, {}) }) }), _jsx("button", { type: "button", className: "gd-my-levels-mini-button gd-my-levels-mini-button--select", onClick: toggleSelectAllVisible, disabled: !mutableFilteredLevelIds.length, "aria-label": allVisibleLevelsChecked ? 'Clear selected levels' : 'Select all visible levels', children: _jsx("span", { className: "gd-my-levels-edit-icon", "aria-hidden": "true", children: _jsx(MyLevelsSelectAllIcon, {}) }) }), _jsx("div", { className: "gd-my-levels-filter-bar", role: "tablist", "aria-label": "Level filters", children: FILTER_OPTIONS.map((filter) => (_jsx("button", { type: "button", role: "tab", "aria-selected": filterMode === filter.id, className: `gd-my-levels-filter-button${filterMode === filter.id ? ' is-active' : ''}`, onClick: () => setFilterMode(filter.id), children: filter.label }, filter.id))) }), _jsx("div", { className: "gd-my-levels-bottom-core", "aria-hidden": "true" }), _jsx("div", { className: "gd-my-levels-bottom-copy", children: checkedVisibleLevelIds.length
                                        ? `${checkedVisibleLevelIds.length} selected for deletion`
                                        : selectedLevel
                                            ? `${selectedLevel.title} - ${getLevelStatusCopy(selectedLevel)}`
                                            : `${currentFilterLabel} - ${filteredLevels.length} levels` })] })] }) })] }));
}
