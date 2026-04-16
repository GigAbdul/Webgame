import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, FieldLabel, Input, Panel, Select, Textarea } from '../components/ui';
import { GameCanvas } from '../features/game/game-canvas';
import { DifficultyIcon } from '../features/levels/difficulty-icon';
import { difficultyOptions, getDifficultyPresentation, getDifficultyStars, getDisplayedStars, } from '../features/levels/level-presentation';
import { apiRequest } from '../services/api';
const statuses = ['DRAFT', 'SUBMITTED', 'OFFICIAL', 'ARCHIVED'];
export function AdminLevelPage() {
    const { id = '' } = useParams();
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        title: '',
        description: '',
        difficulty: 'NORMAL',
        status: 'DRAFT',
        featured: false,
        isVisible: true,
    });
    const levelQuery = useQuery({
        queryKey: ['admin-level', id],
        queryFn: () => apiRequest(`/api/admin/levels/${id}`),
        enabled: Boolean(id),
    });
    useEffect(() => {
        const level = levelQuery.data?.level;
        if (!level) {
            return;
        }
        setForm({
            title: level.title,
            description: level.description,
            difficulty: level.difficulty ?? 'NORMAL',
            status: level.status,
            featured: level.featured,
            isVisible: level.isVisible,
        });
    }, [levelQuery.data?.level]);
    const saveSettingsMutation = useMutation({
        mutationFn: () => apiRequest(`/api/admin/levels/${id}/official-settings`, {
            method: 'PATCH',
            body: JSON.stringify(form),
        }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin-level', id] });
            void queryClient.invalidateQueries({ queryKey: ['admin-levels'] });
            void queryClient.invalidateQueries({ queryKey: ['official-levels'] });
        },
    });
    const publishMutation = useMutation({
        mutationFn: () => apiRequest(`/api/admin/levels/${id}/publish`, {
            method: 'PATCH',
            body: JSON.stringify({
                difficulty: form.difficulty,
            }),
        }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin-level', id] });
            void queryClient.invalidateQueries({ queryKey: ['admin-levels'] });
            void queryClient.invalidateQueries({ queryKey: ['official-levels'] });
        },
    });
    const archiveMutation = useMutation({
        mutationFn: () => apiRequest(`/api/admin/levels/${id}/archive`, {
            method: 'PATCH',
        }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin-level', id] });
            void queryClient.invalidateQueries({ queryKey: ['admin-levels'] });
            void queryClient.invalidateQueries({ queryKey: ['official-levels'] });
        },
    });
    const recalcMutation = useMutation({
        mutationFn: () => apiRequest(`/api/admin/levels/${id}/recalculate-stars`, {
            method: 'POST',
        }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
            void queryClient.invalidateQueries({ queryKey: ['admin-level', id] });
        },
    });
    const level = levelQuery.data?.level;
    const activeDifficulty = level?.difficulty ?? form.difficulty;
    const difficultyPreview = getDifficultyPresentation(activeDifficulty);
    const previewStars = getDifficultyStars(activeDifficulty);
    const displayedLevelStars = level ? getDisplayedStars(level) : previewStars;
    if (levelQuery.isLoading) {
        return _jsx("p", { className: "text-white/70", children: "Loading admin level..." });
    }
    if (!level) {
        return _jsx("p", { className: "text-white/70", children: "Level not found." });
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Panel, { className: "game-screen bg-transparent p-0", children: _jsxs("div", { className: "grid gap-6 px-5 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-8", children: [_jsxs("div", { className: "admin-hero", children: [_jsx("p", { className: "arcade-eyebrow", children: "Control Room" }), _jsxs("div", { className: "flex flex-col gap-5 md:flex-row md:items-start", children: [_jsx(DifficultyIcon, { difficulty: activeDifficulty, size: "lg", showStars: true }), _jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl", children: level.title }), _jsx("p", { className: "max-w-2xl text-sm leading-8 text-white/82", children: level.description }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Badge, { tone: level.isOfficial ? 'success' : 'default', children: level.status }), _jsx(Badge, { tone: "accent", children: level.author?.username ?? 'Unknown Author' }), _jsx(Badge, { children: difficultyPreview.label })] })] })] })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [_jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Stars" }), _jsx("p", { className: "mt-2 font-display text-4xl text-white", children: displayedLevelStars })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Difficulty" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: difficultyPreview.label })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Theme" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: level.theme })] })] })] }) }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.08fr_0.92fr]", children: [_jsx(GameCanvas, { levelData: level.dataJson, attemptNumber: 1, autoRestartOnFail: true, className: "h-fit" }), _jsxs("div", { className: "control-room-grid", children: [_jsx(Panel, { className: "game-screen bg-transparent", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Official Settings" }), _jsx("h3", { className: "font-display text-3xl text-white", children: "Moderation Controls" })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Title" }), _jsx(Input, { value: form.title, onChange: (event) => setForm((current) => ({ ...current, title: event.target.value })) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Description" }), _jsx(Textarea, { rows: 4, value: form.description, onChange: (event) => setForm((current) => ({ ...current, description: event.target.value })) })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Difficulty" }), _jsx(Select, { value: form.difficulty, onChange: (event) => setForm((current) => ({ ...current, difficulty: event.target.value })), children: difficultyOptions.map((difficulty) => (_jsx("option", { value: difficulty, children: getDifficultyPresentation(difficulty).label }, difficulty))) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Stars Reward" }), _jsx("div", { className: "game-stat min-h-[56px] px-4 py-3", children: _jsx("p", { className: "font-display text-2xl text-white", children: previewStars }) })] })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Status" }), _jsx(Select, { value: form.status, onChange: (event) => setForm((current) => ({ ...current, status: event.target.value })), children: statuses.map((status) => (_jsx("option", { value: status, children: status }, status))) })] }), _jsxs("div", { className: "toggle-row pt-7", children: [_jsxs("label", { className: "toggle-box", children: [_jsx("input", { type: "checkbox", checked: form.featured, onChange: (event) => setForm((current) => ({ ...current, featured: event.target.checked })) }), _jsx("span", { className: "text-sm text-white/82", children: "Featured slot" })] }), _jsxs("label", { className: "toggle-box", children: [_jsx("input", { type: "checkbox", checked: form.isVisible, onChange: (event) => setForm((current) => ({ ...current, isVisible: event.target.checked })) }), _jsx("span", { className: "text-sm text-white/82", children: "Visible in catalog" })] })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(Button, { onClick: () => saveSettingsMutation.mutate(), children: "Save Settings" }), _jsx(Button, { variant: "secondary", onClick: () => publishMutation.mutate(), children: "Publish Official" }), _jsx(Button, { variant: "danger", onClick: () => archiveMutation.mutate(), children: "Archive" }), _jsx(Button, { variant: "ghost", onClick: () => recalcMutation.mutate(), children: "Recalculate Stars" })] })] }) }), _jsx(Panel, { className: "game-screen bg-transparent", children: _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "arcade-eyebrow", children: "Moderation Notes" }), _jsx("p", { className: "text-sm leading-7 text-white/78", children: "Reward is derived from the selected difficulty icon. Every demon rank pays 10 stars, and recalculation syncs stored rewards plus total leaderboard values." }), _jsx(Link, { to: `/editor/${level.id}`, className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a] hover:text-white", children: "Open Level In Editor" })] }) })] })] })] }));
}
