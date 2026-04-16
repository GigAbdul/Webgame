import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { LevelEditor } from '../features/editor/level-editor';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { Level } from '../types/models';
import { ViewportFit } from '../components/viewport-fit';

export function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const levelQuery = useQuery({
    queryKey: ['level-editor', id],
    queryFn: () => apiRequest<{ level: Level }>(`/api/levels/${id}`),
    enabled: Boolean(id),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      theme: string;
      dataJson: Level['dataJson'];
    }) =>
      apiRequest<{ level: Level }>(`/api/levels/${id}`, {
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

  const level = levelQuery.data?.level ?? null;
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
          onSave={(payload) => saveMutation.mutateAsync(payload).then(() => undefined)}
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
