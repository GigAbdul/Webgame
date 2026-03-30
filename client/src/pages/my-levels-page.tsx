import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, EmptyState, Panel } from '../components/ui';
import { apiRequest } from '../services/api';
import type { Level } from '../types/models';

export function MyLevelsPage() {
  const queryClient = useQueryClient();

  const levelsQuery = useQuery({
    queryKey: ['my-levels'],
    queryFn: () => apiRequest<{ levels: Level[] }>('/api/levels/mine'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/levels/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-levels'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const levels = levelsQuery.data?.levels ?? [];

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="flex flex-col gap-5 px-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Forge Queue</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              My Levels
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-white/82">
              Здесь лежат все твои драфты, отправленные уровни и уже опубликованные работы. Это должен быть workshop list,
              а не скучная таблица.
            </p>
          </div>

          <Link to="/editor/new">
            <Button>Create New Level</Button>
          </Link>
        </div>
      </Panel>

      {levels.length ? (
        <div className="grid gap-4">
          {levels.map((level) => (
            <Panel key={level.id} className="game-screen bg-transparent">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <p className="font-display text-[11px] tracking-[0.24em] text-[#ffd44a]">{level.status}</p>
                  <h3 className="font-display text-3xl text-white">{level.title}</h3>
                  <p className="text-sm text-white/78">
                    v{level.versionNumber} • {level.theme}
                    {level.isOfficial ? ` • ${level.starsReward} stars` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link to={`/editor/${level.id}`}>
                    <Button variant="secondary">Open Editor</Button>
                  </Link>
                  {!level.isOfficial ? (
                    <Button
                      variant="danger"
                      onClick={() => deleteMutation.mutate(level.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No levels in your workshop"
          description="Собери свой первый драфт, протестируй его в рантайме и отправь на review."
          action={
            <Link to="/editor/new" className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a] hover:text-white">
              Start Your First Draft
            </Link>
          }
        />
      )}
    </div>
  );
}
