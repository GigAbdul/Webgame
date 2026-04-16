import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../components/ui';
import { LevelEditor } from '../features/editor/level-editor';
import { moveLocalEditorDraft } from '../features/editor/local-draft-storage';
import { apiRequest } from '../services/api';
export function AdminCreateOfficialPage() {
    const navigate = useNavigate();
    const createMutation = useMutation({
        mutationFn: (payload) => apiRequest('/api/admin/levels/create-official', {
            method: 'POST',
            body: JSON.stringify({
                ...payload,
                publishNow: false,
                featured: false,
                isVisible: true,
            }),
        }),
        onSuccess: (payload) => {
            moveLocalEditorDraft('admin-official-new', payload.level.id);
            navigate(`/admin/levels/${payload.level.id}`);
        },
    });
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Panel, { className: "game-screen bg-transparent p-0", children: _jsxs("div", { className: "grid gap-6 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "font-display text-[11px] tracking-[0.3em] text-[#ffd44a]", children: "Admin Forge" }), _jsxs("h2", { className: "font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl", children: ["Create", _jsx("br", {}), "Official"] }), _jsx("p", { className: "max-w-2xl text-sm leading-8 text-white/82", children: "A new official stage starts as an admin draft, then receives its difficulty icon, automatic star reward, and final publish status." })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Step 1" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: "Build Draft" })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Step 2" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: "Tune & Publish" })] })] })] }) }), _jsx(LevelEditor, { draftStorageKey: "admin-official-new", saveLabel: "Save Admin Draft", onClose: () => navigate('/admin/levels'), onSave: (payload) => createMutation.mutateAsync(payload).then(() => undefined) })] }));
}
