import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Panel } from '../components/ui';
import { apiRequest } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../utils/cn';
const adminToolCards = [
    {
        title: 'Review Queue',
        eyebrow: 'Moderation',
        description: 'Проверка сабмитов, official status, архивирование и publish controls.',
        route: '/admin/levels',
        accent: 'Queue',
    },
    {
        title: 'Official Forge',
        eyebrow: 'Build',
        description: 'Создание нового official-драфта и быстрый переход в редактор.',
        route: '/admin/create-official',
        accent: 'Create',
    },
    {
        title: 'Player Skin Lab',
        eyebrow: 'Cosmetics',
        description: 'Редактор скинов с preview-run, слоями и быстрым сохранением.',
        route: '/admin/player-skins',
        accent: 'Skins',
    },
    {
        title: 'Users',
        eyebrow: 'Accounts',
        description: 'Просмотр пользователей, ролей и состояния аккаунтов.',
        route: '/admin/users',
        accent: 'Users',
    },
];
export function AdminDashboardPage() {
    const statsQuery = useQuery({
        queryKey: ['admin-stats'],
        queryFn: () => apiRequest('/api/admin/stats'),
    });
    const stats = statsQuery.data?.stats;
    const statusCards = useMemo(() => [
        {
            label: 'Users',
            value: stats?.users ?? '-',
            note: 'Accounts visible',
        },
        {
            label: 'Levels',
            value: stats?.levels ?? '-',
            note: 'Total stages',
        },
        {
            label: 'Official',
            value: stats?.officialLevels ?? '-',
            note: 'Published canon',
        },
        {
            label: 'Submitted',
            value: stats?.submittedLevels ?? '-',
            note: 'Needs review',
        },
    ], [stats]);
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Panel, { className: "game-screen bg-transparent p-0", children: _jsxs("div", { className: "grid gap-6 px-5 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-8", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "font-display text-[11px] tracking-[0.3em] text-[#ffd44a]", children: "Admin Room" }), _jsxs("h2", { className: "font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl", children: ["Control", _jsx("br", {}), "Room"] }), _jsx("p", { className: "max-w-2xl text-sm leading-8 text-white/82", children: "\u0415\u0434\u0438\u043D\u0430\u044F \u0430\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C \u0432 \u0441\u0442\u0438\u043B\u0435 skin lab: \u0431\u044B\u0441\u0442\u0440\u044B\u0435 \u043C\u043E\u0434\u0443\u043B\u0438, \u0441\u0432\u043E\u0434\u043A\u0430 \u043F\u043E \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \u0438 \u043F\u0440\u044F\u043C\u043E\u0439 \u0432\u0445\u043E\u0434 \u0432 \u0440\u0430\u0431\u043E\u0447\u0438\u0435 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B \u0431\u0435\u0437 \u043B\u0438\u0448\u043D\u0438\u0445 \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u043E\u0432." })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Moderation" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: statsQuery.isLoading ? 'Loading...' : `${stats?.submittedLevels ?? 0} queued` })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Official Ops" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: statsQuery.isLoading ? 'Loading...' : `${stats?.officialLevels ?? 0} live` })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Skin Pipeline" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: "Editor Ready" })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Quick Launch" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: "4 modules" })] })] })] }) }), _jsx("div", { className: "grid gap-4 md:grid-cols-4", children: statusCards.map((card) => (_jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: card.label }), _jsx("p", { className: "mt-2 font-display text-2xl text-white", children: card.value }), _jsx("p", { className: "mt-1 text-xs uppercase tracking-[0.16em] text-white/58", children: card.note })] }, card.label))) }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.08fr_0.92fr]", children: [_jsx(Panel, { className: "game-screen bg-transparent", children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Admin Tools" }), _jsx("h3", { className: "font-display text-3xl text-white", children: "Launch Modules" })] }), _jsx(Link, { to: "/", className: "rounded-[18px] border-[3px] border-[#163057] bg-[#0e1d36] px-4 py-2 text-xs uppercase tracking-[0.16em] text-white transition hover:brightness-110", children: "Back Home" })] }), _jsx("div", { className: "grid gap-3 md:grid-cols-2", children: adminToolCards.map((tool) => (_jsxs(Link, { to: tool.route, className: cn('rounded-[24px] border-[4px] border-[#0f1b31] bg-[#12203c] px-4 py-4 text-left text-white transition hover:-translate-y-0.5 hover:border-[#caff45] hover:brightness-110'), children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] uppercase tracking-[0.22em] text-[#ffd44a]", children: tool.eyebrow }), _jsx("h4", { className: "mt-2 font-display text-2xl", children: tool.title })] }), _jsx(Badge, { tone: "accent", children: tool.accent })] }), _jsx("p", { className: "mt-3 text-sm leading-7 text-white/76", children: tool.description }), _jsx("p", { className: "mt-4 text-xs uppercase tracking-[0.16em] text-[#79f7ff]", children: tool.route })] }, tool.route))) })] }) }), _jsx(Panel, { className: "game-screen bg-transparent", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Ops Notes" }), _jsx("h3", { className: "font-display text-3xl text-white", children: "Workflow" })] }), _jsx("div", { className: "rounded-[24px] border-[4px] border-[#0f1b31] bg-[#101a30] px-5 py-5", children: _jsxs("div", { className: "space-y-3 text-sm leading-7 text-white/78", children: [_jsx("p", { children: "Review Queue \u0432\u0435\u0434\u0451\u0442 \u043A \u043C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0445 \u0441\u0430\u0431\u043C\u0438\u0442\u043E\u0432 \u0438 official-\u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438." }), _jsx("p", { children: "Official Forge \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u043D\u043E\u0432\u044B\u0439 \u0430\u0434\u043C\u0438\u043D\u0441\u043A\u0438\u0439 \u0434\u0440\u0430\u0444\u0442 \u0438 \u0441\u0440\u0430\u0437\u0443 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u043F\u0430\u0439\u043F\u043B\u0430\u0439\u043D \u0443\u0440\u043E\u0432\u043D\u044F." }), _jsx("p", { children: "Player Skin Lab \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u0437\u0430 \u0432\u0438\u0437\u0443\u0430\u043B\u044B cube, ball, ship \u0438 arrow \u0441 live test preview." }), _jsx("p", { children: "Users \u043D\u0443\u0436\u0435\u043D \u0434\u043B\u044F \u0440\u0443\u0447\u043D\u043E\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u043E\u0432 \u0438 \u043E\u0431\u0449\u0435\u0439 \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438." })] }) }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Queue Health" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: statsQuery.isLoading ? 'Loading...' : (stats?.submittedLevels ?? 0) > 0 ? 'Attention' : 'Clear' })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "System" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: statsQuery.isLoading ? 'Syncing...' : 'Ready' })] })] })] }) })] })] }));
}
