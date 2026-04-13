import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { LevelEditor } from '../features/editor/level-editor';
import { moveLocalEditorDraft } from '../features/editor/local-draft-storage';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { Level } from '../types/models';

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
      id
        ? apiRequest<{ level: Level }>(`/api/levels/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : apiRequest<{ level: Level }>('/api/levels', {
            method: 'POST',
            body: JSON.stringify(payload),
          }),
    onSuccess: (payload) => {
      void queryClient.invalidateQueries({ queryKey: ['my-levels'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (!id) {
        moveLocalEditorDraft('new', payload.level.id);
        navigate(`/editor/${payload.level.id}`);
      }
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
    return <p className="text-white/70">Loading level editor...</p>;
  }

  const level = levelQuery.data?.level ?? null;

  return (
    <div className="editor-page-shell">
      <LevelEditor
        initialLevel={level}
        draftStorageKey={id ?? 'new'}
        onSave={(payload) => saveMutation.mutateAsync(payload).then(() => undefined)}
        onSubmit={
          id && user?.role !== 'ADMIN' && !level?.isOfficial
            ? () => submitMutation.mutateAsync().then(() => undefined)
            : undefined
        }
      />
    </div>
  );
}
