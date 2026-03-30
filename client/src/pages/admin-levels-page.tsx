import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, Panel } from '../components/ui';
import { apiRequest } from '../services/api';
import type { Level } from '../types/models';

export function AdminLevelsPage() {
  const levelsQuery = useQuery({
    queryKey: ['admin-levels'],
    queryFn: () => apiRequest<{ levels: Level[] }>('/api/admin/levels'),
  });

  const levels = levelsQuery.data?.levels ?? [];

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="flex flex-col gap-5 px-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Moderation Queue</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              Review
              <br />
              Levels
            </h2>
          </div>

          <Link to="/admin/create-official">
            <Button>Create Official Level</Button>
          </Link>
        </div>
      </Panel>

      <div className="grid gap-4">
        {levels.map((level) => (
          <Panel key={level.id} className="game-screen bg-transparent">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={level.isOfficial ? 'success' : 'default'}>{level.status}</Badge>
                  <Badge tone="accent">{level.author?.username ?? 'unknown'}</Badge>
                </div>
                <div>
                  <h3 className="font-display text-3xl text-white">{level.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-white/78">{level.description}</p>
                </div>
              </div>

              <Link to={`/admin/levels/${level.id}`}>
                <Button variant="secondary">Open Admin Detail</Button>
              </Link>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
