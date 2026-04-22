import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { LevelEditor } from '../features/editor/level-editor';
import { readLocalEditorDraft } from '../features/editor/local-draft-storage';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import { ViewportFit } from '../components/viewport-fit';
export function EditorPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const [forceLocalDraftMode, setForceLocalDraftMode] = useState(false);
    const levelQuery = useQuery({
        queryKey: ['level-editor', id],
        queryFn: () => apiRequest(`/api/levels/${id}`),
        enabled: Boolean(id),
    });
    const saveMutation = useMutation({
        mutationFn: ({ onUploadProgress, ...payload }) => apiRequest(`/api/levels/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
            onUploadProgress,
        }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['my-levels'] });
            void queryClient.invalidateQueries({ queryKey: ['profile'] });
            void queryClient.invalidateQueries({ queryKey: ['level-setup', id] });
        },
    });
    const submitMutation = useMutation({
        mutationFn: () => apiRequest(`/api/levels/${id}/submit`, {
            method: 'POST',
        }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['my-levels'] });
            void queryClient.invalidateQueries({ queryKey: ['level-editor', id] });
        },
    });
    useEffect(() => {
        document.body.classList.add('editor-route-active');
        return () => {
            document.body.classList.remove('editor-route-active');
        };
    }, []);
    useEffect(() => {
        setForceLocalDraftMode(false);
    }, [id]);
    const localDraft = useMemo(() => (id ? readLocalEditorDraft(id) : null), [id]);
    const hasLocalDraft = Boolean(localDraft);
    if (id && levelQuery.isLoading) {
        return (_jsx(ViewportFit, { className: "viewport-fit-frame--editor", children: _jsx("div", { className: "editor-page-shell", children: _jsx("div", { className: "editor-page-loading-screen", children: _jsxs("div", { className: "play-screen-loading-card", children: [_jsx("p", { className: "play-screen-loading-kicker", children: "Loading" }), _jsx("p", { children: "Loading level editor..." }), _jsx("div", { className: "loading-bar", "aria-hidden": "true", children: _jsx("div", { className: "loading-bar-fill loading-bar-fill--indeterminate" }) })] }) }) }) }));
    }
    if (id && levelQuery.isError && !forceLocalDraftMode) {
        const errorMessage = levelQuery.error instanceof Error ? levelQuery.error.message : 'Failed to load the editor.';
        return (_jsx(ViewportFit, { className: "viewport-fit-frame--editor", children: _jsx("div", { className: "editor-page-shell", children: _jsx("div", { className: "editor-page-loading-screen", children: _jsxs("div", { className: "play-screen-loading-card", children: [_jsx("p", { className: "play-screen-loading-kicker", children: "Editor Error" }), _jsx("p", { children: "We couldn't load this level into the editor." }), _jsx("p", { className: "text-sm text-white/70", children: errorMessage }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center justify-center gap-3", children: [_jsx("button", { type: "button", className: "arcade-button bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200", onClick: () => void levelQuery.refetch(), children: "Retry" }), hasLocalDraft ? (_jsx("button", { type: "button", className: "arcade-button bg-white/12 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/18", onClick: () => setForceLocalDraftMode(true), children: "Open Local Draft" })) : null, _jsx("button", { type: "button", className: "arcade-button bg-white/12 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/18", onClick: () => navigate('/my-levels'), children: "Back" })] })] }) }) }) }));
    }
    const level = forceLocalDraftMode ? null : (levelQuery.data?.level ?? null);
    const handleCloseEditor = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate(id ? `/my-levels/${id}` : '/my-levels');
    };
    return (_jsx(ViewportFit, { className: "viewport-fit-frame--editor", children: _jsx("div", { className: "editor-page-shell", children: _jsx(LevelEditor, { initialLevel: level, draftStorageKey: id ?? 'new', onClose: handleCloseEditor, onSave: (payload, options) => saveMutation
                    .mutateAsync({
                    ...payload,
                    onUploadProgress: (progress) => {
                        options?.onUploadProgress?.(progress.percent);
                    },
                })
                    .then(() => undefined), onSubmit: id && user?.role !== 'ADMIN' && !level?.isOfficial
                    ? () => submitMutation.mutateAsync().then(() => undefined)
                    : undefined }) }) }));
}
