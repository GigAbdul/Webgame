import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel } from '../components/ui';
import { LevelEditor } from '../features/editor/level-editor';
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

  if (id && levelQuery.isLoading) {
    return <p className="text-white/70">Loading level editor...</p>;
  }

  const level = levelQuery.data?.level ?? null;

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Forge Workshop</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              {id ? 'Edit Level' : 'Create Level'}
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-white/82">
              The editor should feel like a real arcade workstation: tools on the left, a large stage in the center,
              settings on the right, and preview in its own dock.
            </p>
          </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="game-stat px-4 py-4">
                <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Save Flow</p>
                <p className="mt-2 font-display text-xl text-white">Draft -&gt; Test</p>
              </div>
              <div className="game-stat px-4 py-4">
                <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Publish Flow</p>
                <p className="mt-2 font-display text-xl text-white">Submit -&gt; Review</p>
              </div>
            </div>
        </div>
      </Panel>

      <LevelEditor
        initialLevel={level}
        onSave={(payload) => saveMutation.mutateAsync(payload).then(() => undefined)}
        onSubmit={
          id && user?.role !== 'ADMIN' && !level?.isOfficial
            ? () => submitMutation.mutateAsync().then(() => undefined)
            : undefined
        }
        sidebarSlot={
          <Panel className="game-screen bg-transparent">
            <div className="space-y-3">
              <h3 className="font-display text-2xl text-white">Workflow Notes</h3>
              <p className="text-sm leading-7 text-white/78">
                Stars are not entered by hand anymore. Admin moderation derives them from difficulty, while players just
                build the route, save a draft, and submit it for review.
              </p>
              {level ? (
                <p className="font-display text-[11px] tracking-[0.22em] text-[#ffd44a]">Current status: {level.status}</p>
              ) : (
                <p className="text-sm text-white/76">The first save creates a persistent draft in PostgreSQL.</p>
              )}
            </div>
          </Panel>
        }
      />
    </div>
  );
}
