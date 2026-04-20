import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, FieldLabel, Input, Select } from '../components/ui';
import { createEmptyLevelData } from '../features/game/object-definitions';
import { GameCanvas } from '../features/game/game-canvas';
import { resolveLevelMusic } from '../features/game/level-music';
import { useSelectedPlayerSkinRecord } from '../features/game/player-skin-selection';
import { difficultyOptions, getDifficultyPresentation } from '../features/levels/level-presentation';
import { ApiClientError, apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
const MAX_CUSTOM_MUSIC_FILE_SIZE_BYTES = 8 * 1024 * 1024;
function isDirectMusicSource(value) {
    return (value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('/') ||
        value.startsWith('blob:') ||
        value.startsWith('data:audio/'));
}
function getInitialMusicUrlInput(music) {
    return isDirectMusicSource(music) && !music.startsWith('data:audio/') ? music : '';
}
function inferMusicLabel(source) {
    const trimmedSource = source.trim();
    if (!trimmedSource) {
        return 'Custom Track';
    }
    if (trimmedSource.startsWith('data:audio/')) {
        return 'Uploaded Track';
    }
    const lastSegment = trimmedSource.split('/').pop() ?? trimmedSource;
    return decodeURIComponent(lastSegment) || 'Custom Track';
}
function getVerificationCopy(level) {
    if (level.isOfficial || level.status === 'OFFICIAL') {
        return 'Verified';
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
function getLevelIdCopy(level) {
    return level.id.slice(0, 8).toUpperCase();
}
function getNextUnnamedTitle(levels) {
    const unnamedPattern = /^unnamed(?:\s+(\d+))?$/i;
    const usedNumbers = new Set();
    for (const level of levels) {
        const match = level.title.trim().match(unnamedPattern);
        if (!match) {
            continue;
        }
        usedNumbers.add(match[1] ? Number(match[1]) : 0);
    }
    let nextNumber = 0;
    while (usedNumbers.has(nextNumber)) {
        nextNumber += 1;
    }
    return nextNumber === 0 ? 'Unnamed' : `Unnamed ${nextNumber}`;
}
export function LevelSetupPage() {
    const { id } = useParams();
    const isNewLevel = !id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const selectedPlayerSkinRecord = useSelectedPlayerSkinRecord();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [musicValue, setMusicValue] = useState('none');
    const [musicUrlInput, setMusicUrlInput] = useState('');
    const [musicLabelInput, setMusicLabelInput] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('NORMAL');
    const [publishAsOfficial, setPublishAsOfficial] = useState(false);
    const [message, setMessage] = useState('');
    const [isMusicPanelOpen, setIsMusicPanelOpen] = useState(false);
    const [isPublishPanelOpen, setIsPublishPanelOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewRunSeed, setPreviewRunSeed] = useState(0);
    const [isEditorOpening, setIsEditorOpening] = useState(false);
    const levelQuery = useQuery({
        queryKey: ['level-setup', id],
        queryFn: () => apiRequest(`/api/levels/${id}`),
        enabled: Boolean(id),
    });
    const myLevelsQuery = useQuery({
        queryKey: ['my-levels'],
        queryFn: () => apiRequest('/api/levels/mine'),
        enabled: isNewLevel && Boolean(user),
    });
    const level = levelQuery.data?.level ?? null;
    const selectedDifficultyPresentation = getDifficultyPresentation(selectedDifficulty);
    const resolvedMusic = useMemo(() => resolveLevelMusic({
        gridSize: 32,
        lengthUnits: 120,
        theme: level?.theme ?? 'neon-grid',
        background: level?.theme ?? 'neon-grid',
        music: musicValue,
        musicLabel: musicLabelInput.trim() || undefined,
        version: 1,
    }), [level?.theme, musicLabelInput, musicValue]);
    const previewLevelData = useMemo(() => {
        if (!level) {
            return null;
        }
        const previewData = structuredClone(level.dataJson);
        const trimmedMusicSource = musicValue.trim();
        const normalizedMusicSource = trimmedMusicSource || 'none';
        const normalizedMusicLabel = musicLabelInput.trim() || (normalizedMusicSource !== 'none' ? inferMusicLabel(normalizedMusicSource) : '');
        previewData.meta.music = normalizedMusicSource;
        if (normalizedMusicLabel) {
            previewData.meta.musicLabel = normalizedMusicLabel;
        }
        else {
            delete previewData.meta.musicLabel;
        }
        return previewData;
    }, [level, musicLabelInput, musicValue]);
    const newLevelPreviewData = useMemo(() => {
        if (!isNewLevel) {
            return null;
        }
        return buildLevelPayload(null).dataJson;
    }, [description, isNewLevel, musicLabelInput, musicValue, title]);
    useEffect(() => {
        if (isNewLevel) {
            setTitle('');
            setDescription('');
            setMusicValue('none');
            setMusicUrlInput('');
            setMusicLabelInput('Stereo Madness');
            setSelectedDifficulty('NORMAL');
            setPublishAsOfficial(false);
            return;
        }
        if (!level) {
            return;
        }
        setTitle(level.title);
        setDescription(level.description);
        setMusicValue(level.dataJson.meta.music?.trim() || 'none');
        setMusicUrlInput(getInitialMusicUrlInput(level.dataJson.meta.music?.trim() || 'none'));
        setMusicLabelInput(level.dataJson.meta.musicLabel ?? '');
        setSelectedDifficulty(level.difficulty ?? 'NORMAL');
        setPublishAsOfficial(level.isOfficial);
    }, [isNewLevel, level]);
    useEffect(() => {
        setIsMusicPanelOpen(false);
        setIsPublishPanelOpen(false);
        setIsPreviewOpen(false);
    }, [id]);
    useEffect(() => {
        document.body.classList.toggle('gd-draft-view-preview-open', isPreviewOpen);
        return () => {
            document.body.classList.remove('gd-draft-view-preview-open');
        };
    }, [isPreviewOpen]);
    const saveDraftMutation = useMutation({
        mutationFn: (payload) => id
            ? apiRequest(`/api/levels/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            })
            : apiRequest('/api/levels', {
                method: 'POST',
                body: JSON.stringify(payload),
            }),
        onSuccess: async (payload) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['my-levels'] }),
                queryClient.invalidateQueries({ queryKey: ['profile'] }),
                queryClient.invalidateQueries({ queryKey: ['level-setup', payload.level.id] }),
                queryClient.invalidateQueries({ queryKey: ['level-editor', payload.level.id] }),
            ]);
        },
    });
    const submitMutation = useMutation({
        mutationFn: (levelId) => apiRequest(`/api/levels/${levelId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ difficulty: selectedDifficulty }),
        }),
        onSuccess: async (payload) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['my-levels'] }),
                queryClient.invalidateQueries({ queryKey: ['profile'] }),
                queryClient.invalidateQueries({ queryKey: ['level-setup', payload.level.id] }),
                queryClient.invalidateQueries({ queryKey: ['admin-levels'] }),
            ]);
        },
    });
    const adminPublishMutation = useMutation({
        mutationFn: (levelId) => apiRequest(`/api/admin/levels/${levelId}/official-settings`, {
            method: 'PATCH',
            body: JSON.stringify({
                difficulty: selectedDifficulty,
                status: publishAsOfficial ? 'OFFICIAL' : 'SUBMITTED',
                isVisible: publishAsOfficial,
            }),
        }),
        onSuccess: async (payload) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['my-levels'] }),
                queryClient.invalidateQueries({ queryKey: ['profile'] }),
                queryClient.invalidateQueries({ queryKey: ['level-setup', payload.level.id] }),
                queryClient.invalidateQueries({ queryKey: ['official-levels'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-levels'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-level', payload.level.id] }),
            ]);
        },
    });
    const deleteMutation = useMutation({
        mutationFn: (levelId) => apiRequest(`/api/levels/${levelId}`, {
            method: 'DELETE',
        }),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['my-levels'] }),
                queryClient.invalidateQueries({ queryKey: ['profile'] }),
            ]);
            navigate('/my-levels');
        },
    });
    const isWorking = saveDraftMutation.isPending ||
        submitMutation.isPending ||
        adminPublishMutation.isPending ||
        deleteMutation.isPending;
    const isBusy = isWorking || isEditorOpening;
    function buildLevelPayload(baseLevel, resolvedTitle) {
        const levelData = baseLevel ? structuredClone(baseLevel.dataJson) : createEmptyLevelData('neon-grid');
        const trimmedMusicSource = musicValue.trim();
        const normalizedMusicSource = trimmedMusicSource || 'none';
        const normalizedMusicLabel = musicLabelInput.trim() || (normalizedMusicSource !== 'none' ? inferMusicLabel(normalizedMusicSource) : '');
        levelData.meta.music = normalizedMusicSource;
        if (normalizedMusicLabel) {
            levelData.meta.musicLabel = normalizedMusicLabel;
        }
        else {
            delete levelData.meta.musicLabel;
        }
        return {
            title: resolvedTitle ?? title.trim(),
            description: description.trim(),
            theme: baseLevel?.theme ?? 'neon-grid',
            dataJson: levelData,
        };
    }
    async function resolveDraftTitle() {
        const trimmedTitle = title.trim();
        if (trimmedTitle) {
            return trimmedTitle;
        }
        const knownLevels = myLevelsQuery.data?.levels ??
            (await queryClient.fetchQuery({
                queryKey: ['my-levels'],
                queryFn: () => apiRequest('/api/levels/mine'),
            })).levels;
        const fallbackTitle = getNextUnnamedTitle(knownLevels);
        setTitle(fallbackTitle);
        return fallbackTitle;
    }
    async function saveMetadata() {
        const trimmedTitle = title.trim();
        if (trimmedTitle.length < 3) {
            throw new Error('Level title must be at least 3 characters long.');
        }
        return saveDraftMutation.mutateAsync(buildLevelPayload(level));
    }
    async function handleCreateAndOpenEditor() {
        setMessage('');
        setIsEditorOpening(true);
        try {
            const resolvedTitle = await resolveDraftTitle();
            const payload = await saveDraftMutation.mutateAsync(buildLevelPayload(null, resolvedTitle));
            navigate(`/editor/${payload.level.id}`);
        }
        catch (error) {
            setIsEditorOpening(false);
            setMessage(error instanceof Error ? error.message : 'Could not create the draft.');
        }
    }
    async function handleCreateDraftOnly() {
        setMessage('');
        try {
            const resolvedTitle = await resolveDraftTitle();
            const payload = await saveDraftMutation.mutateAsync(buildLevelPayload(null, resolvedTitle));
            navigate(`/my-levels/${payload.level.id}`);
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : 'Could not create the draft.');
        }
    }
    async function handleSaveMetadata() {
        setMessage('');
        try {
            await saveMetadata();
            setMessage('Level details saved.');
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : 'Could not save the level details.');
        }
    }
    async function handleOpenEditor() {
        if (!level) {
            return;
        }
        if (level.isOfficial && user?.role !== 'ADMIN') {
            return;
        }
        setMessage('');
        setIsEditorOpening(true);
        try {
            await saveMetadata();
            navigate(`/editor/${level.id}`);
        }
        catch (error) {
            setIsEditorOpening(false);
            setMessage(error instanceof Error ? error.message : 'Could not open the editor.');
        }
    }
    async function handlePublish() {
        if (!level) {
            return;
        }
        setMessage('');
        try {
            await saveMetadata();
            if (user?.role === 'ADMIN') {
                await adminPublishMutation.mutateAsync(level.id);
                setMessage(publishAsOfficial ? 'Level published to Official Levels.' : 'Level sent to the review queue.');
                setIsPublishPanelOpen(false);
                return;
            }
            await submitMutation.mutateAsync(level.id);
            setMessage('Level submitted for admin review.');
            setIsPublishPanelOpen(false);
        }
        catch (error) {
            if (error instanceof ApiClientError) {
                setMessage(error.message);
                return;
            }
            setMessage(error instanceof Error ? error.message : 'Could not publish the level.');
        }
    }
    function applyCustomMusicUrl() {
        const trimmedUrl = musicUrlInput.trim();
        setMusicValue(trimmedUrl || 'none');
        if (!musicLabelInput.trim() && trimmedUrl) {
            setMusicLabelInput(inferMusicLabel(trimmedUrl));
        }
    }
    function clearMusic() {
        setMusicValue('none');
        setMusicUrlInput('');
        setMusicLabelInput('');
    }
    function handleMusicFilePicked(event) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }
        if (file.size > MAX_CUSTOM_MUSIC_FILE_SIZE_BYTES) {
            setMessage('Audio file is too large. Keep uploads under 8 MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                setMessage('Could not read the selected music file.');
                return;
            }
            setMusicValue(reader.result);
            setMusicUrlInput('');
            if (!musicLabelInput.trim()) {
                setMusicLabelInput(file.name);
            }
            setMessage(`Custom music loaded: ${file.name}.`);
        };
        reader.onerror = () => {
            setMessage('Could not read the selected music file.');
        };
        reader.readAsDataURL(file);
    }
    function handleDeleteCurrentLevel() {
        if (!level || level.isOfficial || isBusy) {
            return;
        }
        const shouldDelete = window.confirm(`Delete "${level.title}" from your drafts?`);
        if (shouldDelete) {
            deleteMutation.mutate(level.id);
        }
    }
    if (!isNewLevel && levelQuery.isLoading) {
        return (_jsx("div", { className: "gd-draft-view-page", children: _jsx("div", { className: "gd-draft-view-feedback", children: "Loading level view..." }) }));
    }
    if (!isNewLevel && !level) {
        return (_jsx("div", { className: "gd-draft-view-page", children: _jsx("div", { className: "gd-draft-view-feedback", children: "Level not found." }) }));
    }
    const publishButtonLabel = user?.role === 'ADMIN'
        ? publishAsOfficial
            ? 'Publish Official'
            : 'Send To Review Queue'
        : level?.status === 'SUBMITTED'
            ? 'Awaiting Admin Review'
            : 'Publish For Review';
    if (!isNewLevel && level) {
        const canPublish = user?.role === 'ADMIN' || level.status === 'DRAFT';
        const canOpenEditor = user?.role === 'ADMIN' || !level.isOfficial;
        return (_jsxs("div", { className: "gd-draft-view-page gd-draft-view-page--arcade", children: [_jsxs("div", { className: "gd-draft-view-scene", "aria-hidden": "true", children: [_jsx("div", { className: "gd-draft-view-grid" }), _jsx("div", { className: "gd-draft-view-corner gd-draft-view-corner--left" }), _jsx("div", { className: "gd-draft-view-corner gd-draft-view-corner--right" })] }), _jsx(Link, { to: "/my-levels", className: "gd-draft-view-back-button", "aria-label": "Back to my levels", children: _jsx("span", { className: "gd-draft-view-back-icon" }) }), _jsxs("div", { className: "gd-draft-view-side-stack gd-draft-view-side-stack--arcade", children: [_jsx("button", { type: "button", className: "gd-draft-view-side-button gd-draft-view-side-button--danger", onClick: handleDeleteCurrentLevel, disabled: isBusy || level.isOfficial, "aria-label": "Delete draft", children: _jsx("span", { className: "gd-draft-view-side-icon gd-draft-view-side-icon--close", "aria-hidden": "true" }) }), _jsx("button", { type: "button", className: "gd-draft-view-side-button", onClick: () => setIsMusicPanelOpen(true), "aria-label": "Open music setup", children: _jsx("span", { className: "gd-draft-view-side-copy", children: "Music" }) }), _jsx("button", { type: "button", className: "gd-draft-view-side-button", onClick: handleSaveMetadata, disabled: isBusy, "aria-label": "Save level details", children: _jsx("span", { className: "gd-draft-view-side-icon gd-draft-view-side-icon--save", "aria-hidden": "true" }) })] }), _jsxs("div", { className: "gd-draft-view-shell gd-draft-view-shell--arcade", children: [_jsx("div", { className: "gd-draft-view-title-frame", children: _jsx("input", { value: title, placeholder: "Unnamed 0", onChange: (event) => setTitle(event.target.value), className: "gd-draft-view-title-input", "aria-label": "Level title" }) }), _jsx("div", { className: "gd-draft-view-description-frame", children: _jsx("textarea", { value: description, placeholder: "Description [Optional]", onChange: (event) => setDescription(event.target.value), className: "gd-draft-view-description-input", "aria-label": "Level description" }) }), _jsxs("div", { className: "gd-draft-view-action-row gd-draft-view-action-row--arcade", children: [_jsx(DraftViewActionButton, { variant: "editor", label: "Editor", onClick: handleOpenEditor, disabled: isBusy || !canOpenEditor, hideLabel: true }), _jsx(DraftViewActionButton, { variant: "play", label: "Play", onClick: () => {
                                        setPreviewRunSeed((current) => current + 1);
                                        setIsPreviewOpen(true);
                                    }, disabled: isBusy || !previewLevelData, hideLabel: true }), _jsx(DraftViewActionButton, { variant: "publish", label: "Publish", onClick: () => setIsPublishPanelOpen(true), disabled: isBusy, hideLabel: true })] }), message ? _jsx("p", { className: "gd-draft-view-message", children: message }) : null, _jsx(DraftViewMetaRow, { lengthCopy: getLengthCopy(level.dataJson.meta.lengthUnits), musicCopy: resolvedMusic.label, verificationCopy: getVerificationCopy(level) }), _jsx(DraftViewFooter, { versionCopy: `Version: ${level.versionNumber}`, idCopy: `ID: ${getLevelIdCopy(level)}` })] }), isEditorOpening ? _jsx(EditorLaunchOverlay, {}) : null, isPreviewOpen && previewLevelData ? (_jsxs("div", { className: "gd-draft-view-preview-shell", role: "dialog", "aria-modal": "true", "aria-label": "Draft preview", children: [_jsxs("div", { className: "gd-draft-view-preview-actions", "aria-label": "Preview controls", children: [_jsx("button", { type: "button", className: "gd-draft-view-preview-action", onClick: () => setPreviewRunSeed((current) => current + 1), "aria-label": "Restart preview", title: "Restart preview", children: "Restart" }), _jsx("button", { type: "button", className: "gd-draft-view-preview-action gd-draft-view-preview-action--close", onClick: () => setIsPreviewOpen(false), "aria-label": "Close preview", title: "Close preview", children: "Close" })] }), _jsx(GameCanvas, { levelData: previewLevelData, attemptNumber: 1, runId: `draft-preview-${level.id}-${previewRunSeed}`, autoRestartOnFail: true, previewStartPosEnabled: true, fullscreen: true, className: "gd-draft-view-preview-fullscreen", playerSkinOverrides: selectedPlayerSkinRecord, onExitToMenu: () => setIsPreviewOpen(false) }, `draft-preview-${level.id}-${previewRunSeed}`)] })) : null, isMusicPanelOpen ? (_jsx("div", { className: "gd-draft-view-modal", role: "dialog", "aria-modal": "true", "aria-label": "Music setup", children: _jsxs("div", { className: "gd-draft-view-modal-card", children: [_jsxs("div", { className: "gd-draft-view-modal-header", children: [_jsxs("div", { children: [_jsx("p", { className: "gd-draft-view-modal-eyebrow", children: "Soundtrack" }), _jsx("h2", { className: "gd-draft-view-modal-title", children: "Music Setup" })] }), _jsx("button", { type: "button", className: "gd-draft-view-modal-close", onClick: () => setIsMusicPanelOpen(false), "aria-label": "Close music setup", children: "Close" })] }), _jsxs("div", { className: "gd-draft-view-modal-grid", children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Track Label" }), _jsx(Input, { value: musicLabelInput, placeholder: "Stereo Madness", onChange: (event) => setMusicLabelInput(event.target.value) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(FieldLabel, { children: "Music URL" }), _jsxs("div", { className: "flex flex-col gap-2 sm:flex-row", children: [_jsx(Input, { value: musicUrlInput, placeholder: "https://example.com/track.mp3", onChange: (event) => setMusicUrlInput(event.target.value) }), _jsx(Button, { variant: "ghost", onClick: applyCustomMusicUrl, type: "button", children: "Apply URL" })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("label", { className: "arcade-btn arcade-btn--ghost cursor-pointer", children: [_jsx("span", { children: "Upload Audio" }), _jsx("input", { type: "file", accept: "audio/*", className: "hidden", onChange: handleMusicFilePicked })] }), _jsx(Button, { variant: "ghost", onClick: clearMusic, type: "button", children: "Clear Music" }), _jsx(Button, { type: "button", onClick: handleSaveMetadata, disabled: isBusy, children: "Save Draft" })] }), resolvedMusic.src ? (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.18em] text-white/60", children: "Preview" }), _jsx("audio", { controls: true, preload: "metadata", src: resolvedMusic.src, className: "w-full" })] })) : (_jsx("p", { className: "text-sm leading-7 text-white/68", children: "No custom audio attached yet." }))] })] }) })) : null, isPublishPanelOpen ? (_jsx("div", { className: "gd-draft-view-modal", role: "dialog", "aria-modal": "true", "aria-label": "Publish controls", children: _jsxs("div", { className: "gd-draft-view-modal-card", children: [_jsxs("div", { className: "gd-draft-view-modal-header", children: [_jsxs("div", { children: [_jsx("p", { className: "gd-draft-view-modal-eyebrow", children: "Release Step" }), _jsx("h2", { className: "gd-draft-view-modal-title", children: user?.role === 'ADMIN' ? 'Publish Controls' : 'Publish Request' })] }), _jsx("button", { type: "button", className: "gd-draft-view-modal-close", onClick: () => setIsPublishPanelOpen(false), "aria-label": "Close publish controls", children: "Close" })] }), _jsxs("div", { className: "gd-draft-view-modal-grid", children: [_jsx("p", { className: "text-sm leading-7 text-white/80", children: user?.role === 'ADMIN'
                                            ? 'Pick the release difficulty and decide whether this build goes straight into Official Levels or stays in the review queue.'
                                            : 'Choose the difficulty you want this level to be rated at, then submit it for admin review.' }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Difficulty" }), _jsx(Select, { value: selectedDifficulty, onChange: (event) => setSelectedDifficulty(event.target.value), children: difficultyOptions.map((difficulty) => (_jsx("option", { value: difficulty, children: getDifficultyPresentation(difficulty).label }, difficulty))) })] }), user?.role === 'ADMIN' ? (_jsxs("label", { className: "toggle-box", children: [_jsx("input", { type: "checkbox", checked: publishAsOfficial, onChange: (event) => setPublishAsOfficial(event.target.checked) }), _jsx("span", { className: "text-sm text-white/82", children: "Official release. If enabled, the level appears in `/levels`." })] })) : null, _jsxs("div", { className: "gd-draft-view-modal-actions", children: [_jsx(Button, { onClick: handlePublish, disabled: isBusy || !canPublish, children: publishButtonLabel }), _jsx(Button, { variant: "ghost", onClick: handleSaveMetadata, disabled: isBusy, children: "Save Draft" }), !canPublish ? _jsx(Badge, { tone: "accent", children: "Already submitted" }) : null] })] })] }) })) : null] }));
    }
    return (_jsxs("div", { className: "gd-draft-view-page gd-draft-view-page--arcade", children: [_jsxs("div", { className: "gd-draft-view-scene", "aria-hidden": "true", children: [_jsx("div", { className: "gd-draft-view-grid" }), _jsx("div", { className: "gd-draft-view-corner gd-draft-view-corner--left" }), _jsx("div", { className: "gd-draft-view-corner gd-draft-view-corner--right" })] }), _jsx(Link, { to: "/my-levels", className: "gd-draft-view-back-button", "aria-label": "Back to my levels", children: _jsx("span", { className: "gd-draft-view-back-icon" }) }), _jsxs("div", { className: "gd-draft-view-side-stack gd-draft-view-side-stack--arcade", children: [_jsx("button", { type: "button", className: "gd-draft-view-side-button gd-draft-view-side-button--danger", onClick: () => navigate('/my-levels'), "aria-label": "Cancel new level creation", children: _jsx("span", { className: "gd-draft-view-side-icon gd-draft-view-side-icon--close", "aria-hidden": "true" }) }), _jsx("button", { type: "button", className: "gd-draft-view-side-button", onClick: () => setMessage('Add the level name and optional description, preview the route if you want, then use Editor to create the draft and keep configuring it there.'), "aria-label": "Show create level help", children: _jsx("span", { className: "gd-draft-view-side-copy", children: "Help" }) }), _jsx("button", { type: "button", className: "gd-draft-view-side-button", onClick: () => navigate('/my-levels'), "aria-label": "Return to my levels", children: _jsx("span", { className: "gd-draft-view-side-copy", children: "Drafts" }) })] }), _jsxs("div", { className: "gd-draft-view-shell gd-draft-view-shell--arcade", children: [_jsx("div", { className: "gd-draft-view-title-frame", children: _jsx("input", { value: title, placeholder: "Level Name", onChange: (event) => setTitle(event.target.value), className: "gd-draft-view-title-input", "aria-label": "Level title" }) }), _jsx("div", { className: "gd-draft-view-description-frame", children: _jsx("textarea", { value: description, placeholder: "Description [Optional]", onChange: (event) => setDescription(event.target.value), className: "gd-draft-view-description-input", "aria-label": "Level description" }) }), _jsxs("div", { className: "gd-draft-view-action-row gd-draft-view-action-row--arcade", children: [_jsx(DraftViewActionButton, { variant: "editor", label: "Create And Edit", onClick: handleCreateAndOpenEditor, disabled: isBusy, hideLabel: true }), _jsx(DraftViewActionButton, { variant: "play", label: "Play", onClick: () => {
                                    setPreviewRunSeed((current) => current + 1);
                                    setIsPreviewOpen(true);
                                }, disabled: isBusy, hideLabel: true }), _jsx(DraftViewActionButton, { variant: "publish", label: "Save Draft", onClick: handleCreateDraftOnly, disabled: isBusy, hideLabel: true })] }), message ? _jsx("p", { className: "gd-draft-view-message", children: message }) : null, _jsx(DraftViewMetaRow, { lengthCopy: getLengthCopy(120), musicCopy: resolvedMusic.label, verificationCopy: "Unverified" }), _jsx(DraftViewFooter, { versionCopy: "Version: 1", idCopy: "ID: NA" })] }), isEditorOpening ? _jsx(EditorLaunchOverlay, {}) : null, isPreviewOpen && newLevelPreviewData ? (_jsxs("div", { className: "gd-draft-view-preview-shell", role: "dialog", "aria-modal": "true", "aria-label": "New level preview", children: [_jsxs("div", { className: "gd-draft-view-preview-actions", "aria-label": "Preview controls", children: [_jsx("button", { type: "button", className: "gd-draft-view-preview-action", onClick: () => setPreviewRunSeed((current) => current + 1), "aria-label": "Restart preview", title: "Restart preview", children: "Restart" }), _jsx("button", { type: "button", className: "gd-draft-view-preview-action gd-draft-view-preview-action--close", onClick: () => setIsPreviewOpen(false), "aria-label": "Close preview", title: "Close preview", children: "Close" })] }), _jsx(GameCanvas, { levelData: newLevelPreviewData, attemptNumber: 1, runId: `new-draft-preview-${previewRunSeed}`, autoRestartOnFail: true, previewStartPosEnabled: true, fullscreen: true, className: "gd-draft-view-preview-fullscreen", playerSkinOverrides: selectedPlayerSkinRecord, onExitToMenu: () => setIsPreviewOpen(false) }, `new-draft-preview-${previewRunSeed}`)] })) : null] }));
}
function EditorLaunchOverlay() {
    return (_jsx("div", { className: "gd-draft-view-transition-overlay", role: "status", "aria-live": "polite", "aria-label": "Opening editor", children: _jsxs("div", { className: "gd-draft-view-transition-card", children: [_jsx("p", { className: "play-screen-loading-kicker", children: "Editor" }), _jsx("p", { className: "gd-draft-view-transition-title", children: "Opening editor..." }), _jsx("p", { className: "gd-draft-view-transition-copy", children: "Saving the draft and launching the build surface." }), _jsx("div", { className: "loading-bar", "aria-hidden": "true", children: _jsx("div", { className: "loading-bar-fill loading-bar-fill--indeterminate" }) })] }) }));
}
function DraftViewActionButton({ variant, label, onClick, disabled = false, hideLabel = false, }) {
    return (_jsxs("button", { type: "button", className: `gd-draft-view-action-button gd-draft-view-action-button--${variant}${hideLabel ? ' gd-draft-view-action-button--icon-only' : ''}`, onClick: onClick, disabled: disabled, "aria-label": label, title: label, children: [_jsx("span", { className: `gd-draft-view-action-icon gd-draft-view-action-icon--${variant}`, "aria-hidden": "true" }), !hideLabel ? _jsx("span", { className: "gd-draft-view-action-label", children: label }) : null] }));
}
function DraftViewMetaRow({ lengthCopy, musicCopy, verificationCopy, }) {
    return (_jsxs("div", { className: "gd-draft-view-meta-row", children: [_jsxs("div", { className: "gd-draft-view-meta-item", children: [_jsxs("svg", { viewBox: "0 0 64 64", className: "gd-draft-view-meta-icon", "aria-hidden": "true", children: [_jsx("circle", { cx: "32", cy: "32", r: "26", fill: "#ffffff", stroke: "#1a1b32", strokeWidth: "4" }), _jsx("path", { d: "M32 18v15l9 7", fill: "none", stroke: "#1a1b32", strokeWidth: "5", strokeLinecap: "round" }), _jsx("circle", { cx: "32", cy: "32", r: "3.8", fill: "#1a1b32" })] }), _jsx("span", { className: "gd-draft-view-meta-copy", children: lengthCopy })] }), _jsxs("div", { className: "gd-draft-view-meta-item", children: [_jsx("svg", { viewBox: "0 0 64 64", className: "gd-draft-view-meta-icon", "aria-hidden": "true", children: _jsx("path", { d: "M16 12v27.5c0 4.7 3.8 8.5 8.5 8.5S33 44.2 33 39.5 29.2 31 24.5 31c-1.8 0-3.5.5-5 1.5V20.6l20-4.9v19.8c0 4.7 3.8 8.5 8.5 8.5S56.5 40.2 56.5 35.5 52.7 27 48 27c-1.6 0-3.1.4-4.5 1.2V10.3L16 12Z", fill: "#ffffff", stroke: "#1a1b32", strokeWidth: "4", strokeLinejoin: "round" }) }), _jsx("span", { className: "gd-draft-view-meta-copy", children: musicCopy })] }), _jsxs("div", { className: "gd-draft-view-meta-item", children: [_jsxs("svg", { viewBox: "0 0 64 64", className: "gd-draft-view-meta-icon", "aria-hidden": "true", children: [_jsx("circle", { cx: "32", cy: "32", r: "26", fill: "#22dcff", stroke: "#1a1b32", strokeWidth: "4" }), _jsx("path", { d: "M32 20v4", stroke: "#ffffff", strokeWidth: "5", strokeLinecap: "round" }), _jsx("circle", { cx: "32", cy: "43", r: "3.5", fill: "#ffffff" }), _jsx("path", { d: "M32 29v9", stroke: "#ffffff", strokeWidth: "5", strokeLinecap: "round" })] }), _jsx("span", { className: "gd-draft-view-meta-copy", children: verificationCopy })] })] }));
}
function DraftViewFooter({ versionCopy, idCopy }) {
    return (_jsxs("div", { className: "gd-draft-view-footer gd-draft-view-footer--split", children: [_jsx("div", { className: "gd-draft-view-footer-chip", children: versionCopy }), _jsx("div", { className: "gd-draft-view-footer-chip", children: idCopy })] }));
}
