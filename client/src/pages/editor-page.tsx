import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { LevelEditor } from '../features/editor/level-editor';
import { readLocalEditorDraft } from '../features/editor/local-draft-storage';
import { apiRequest, type ApiUploadProgress } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { Level } from '../types/models';
import { ViewportFit } from '../components/viewport-fit';

export function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [forceLocalDraftMode, setForceLocalDraftMode] = useState(false);

  const levelQuery = useQuery({
    queryKey: ['level-editor', id],
    queryFn: () => apiRequest<{ level: Level }>(`/api/levels/${id}`),
    enabled: Boolean(id),
  });

  const saveMutation = useMutation({
    mutationFn: ({
      onUploadProgress,
      ...payload
    }: {
      title: string;
      description: string;
      theme: string;
      dataJson: Level['dataJson'];
      onUploadProgress?: (progress: ApiUploadProgress) => void;
    }) =>
      apiRequest<{ level: Level }>(`/api/levels/${id}`, {
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
    mutationFn: () =>
      apiRequest<{ level: Level }>(`/api/levels/${id}/submit`, {
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
    return (
      <ViewportFit className="viewport-fit-frame--editor">
        <div className="editor-page-shell">
          <div className="editor-page-loading-screen">
            <div className="play-screen-loading-card">
              <p className="play-screen-loading-kicker">Loading</p>
              <p>Loading level editor...</p>
              <div className="loading-bar" aria-hidden="true">
                <div className="loading-bar-fill loading-bar-fill--indeterminate" />
              </div>
            </div>
          </div>
        </div>
      </ViewportFit>
    );
  }

  if (id && levelQuery.isError && !forceLocalDraftMode) {
    const errorMessage = levelQuery.error instanceof Error ? levelQuery.error.message : 'Failed to load the editor.';

    return (
      <ViewportFit className="viewport-fit-frame--editor">
        <div className="editor-page-shell">
          <div className="editor-page-loading-screen">
            <div className="play-screen-loading-card">
              <p className="play-screen-loading-kicker">Editor Error</p>
              <p>We couldn't load this level into the editor.</p>
              <p className="text-sm text-white/70">{errorMessage}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  className="arcade-button bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  onClick={() => void levelQuery.refetch()}
                >
                  Retry
                </button>
                {hasLocalDraft ? (
                  <button
                    type="button"
                    className="arcade-button bg-white/12 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/18"
                    onClick={() => setForceLocalDraftMode(true)}
                  >
                    Open Local Draft
                  </button>
                ) : null}
                <button
                  type="button"
                  className="arcade-button bg-white/12 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/18"
                  onClick={() => navigate('/my-levels')}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </ViewportFit>
    );
  }

  const level = forceLocalDraftMode ? null : (levelQuery.data?.level ?? null);
  const handleCloseEditor = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(id ? `/my-levels/${id}` : '/my-levels');
  };

  return (
    <ViewportFit className="viewport-fit-frame--editor">
      <div className="editor-page-shell">
        <LevelEditor
          initialLevel={level}
          draftStorageKey={id ?? 'new'}
          onClose={handleCloseEditor}
          onSave={(payload, options) =>
            saveMutation
              .mutateAsync({
                ...payload,
                onUploadProgress: (progress) => {
                  options?.onUploadProgress?.(progress.percent);
                },
              })
              .then(() => undefined)
          }
          onSubmit={
            id && user?.role !== 'ADMIN' && !level?.isOfficial
              ? () => submitMutation.mutateAsync().then(() => undefined)
              : undefined
          }
        />
      </div>
    </ViewportFit>
  );
}
