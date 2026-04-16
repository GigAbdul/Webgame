import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, Panel } from '../components/ui';
import { apiRequest } from '../services/api';
export function AdminLevelsPage() {
    const levelsQuery = useQuery({
        queryKey: ['admin-levels'],
        queryFn: () => apiRequest('/api/admin/levels'),
    });
    const levels = levelsQuery.data?.levels ?? [];
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Panel, { className: "game-screen bg-transparent p-0", children: _jsxs("div", { className: "flex flex-col gap-5 px-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-8", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "font-display text-[11px] tracking-[0.3em] text-[#ffd44a]", children: "Moderation Queue" }), _jsxs("h2", { className: "font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl", children: ["Review", _jsx("br", {}), "Levels"] })] }), _jsx(Link, { to: "/admin/create-official", children: _jsx(Button, { children: "Create Official Level" }) })] }) }), _jsx("div", { className: "grid gap-4", children: levels.map((level) => (_jsx(Panel, { className: "game-screen bg-transparent", children: _jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Badge, { tone: level.isOfficial ? 'success' : 'default', children: level.status }), _jsx(Badge, { tone: "accent", children: level.author?.username ?? 'unknown' })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-display text-3xl text-white", children: level.title }), _jsx("p", { className: "mt-2 max-w-3xl text-sm leading-7 text-white/78", children: level.description })] })] }), _jsx(Link, { to: `/admin/levels/${level.id}`, children: _jsx(Button, { variant: "secondary", children: "Open Admin Detail" }) })] }) }, level.id))) })] }));
}
