import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { LevelEditor } from '../features/editor/level-editor';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import { ViewportFit } from '../components/viewport-fit';
export function EditorPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const levelQuery = useQuery({
        queryKey: ['level-editor', id],
        queryFn: () => apiRequest(`/api/levels/${id}`),
        enabled: Boolean(id),
    });
    const saveMutation = useMutation({
        mutationFn: (payload) => apiRequest(`/api/levels/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
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
    if (id && levelQuery.isLoading) {
        return (_jsx(ViewportFit, { className: "viewport-fit-frame--editor", children: _jsx("div", { className: "editor-page-shell", children: _jsx("div", { className: "editor-page-loading-screen", children: _jsxs("div", { className: "play-screen-loading-card", children: [_jsx("p", { className: "play-screen-loading-kicker", children: "Loading" }), _jsx("p", { children: "Loading level editor..." }), _jsx("div", { className: "loading-bar", "aria-hidden": "true", children: _jsx("div", { className: "loading-bar-fill loading-bar-fill--indeterminate" }) })] }) }) }) }));
    }
    const level = levelQuery.data?.level ?? null;
    const handleCloseEditor = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate(id ? `/my-levels/${id}` : '/my-levels');
    };
    return (_jsx(ViewportFit, { className: "viewport-fit-frame--editor", children: _jsx("div", { className: "editor-page-shell", children: _jsx(LevelEditor, { initialLevel: level, draftStorageKey: id ?? 'new', onClose: handleCloseEditor, onSave: (payload) => saveMutation.mutateAsync(payload).then(() => undefined), onSubmit: id && user?.role !== 'ADMIN' && !level?.isOfficial
                    ? () => submitMutation.mutateAsync().then(() => undefined)
                    : undefined }) }) }));
}
