import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Panel, StatCard } from '../components/ui';
import { apiRequest } from '../services/api';

export function AdminDashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () =>
      apiRequest<{ stats: { users: number; levels: number; officialLevels: number; submittedLevels: number } }>(
        '/api/admin/stats',
      ),
  });

  const stats = statsQuery.data?.stats;

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Admin Room</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              Publish
              <br />
              Control
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-white/82">
              Админка тоже должна выглядеть как часть игры: publish control room, очередь модерации и быстрый доступ к
              official content.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Official Sync</p>
              <p className="mt-2 font-display text-xl text-white">Stars Live</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Moderation</p>
              <p className="mt-2 font-display text-xl text-white">Queue Ready</p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Users" value={stats?.users ?? '-'} />
        <StatCard label="Levels" value={stats?.levels ?? '-'} />
        <StatCard label="Official" value={stats?.officialLevels ?? '-'} />
        <StatCard label="Submitted" value={stats?.submittedLevels ?? '-'} />
      </div>

      <Panel className="game-screen bg-transparent">
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/levels">
            <Button>Review Levels</Button>
          </Link>
          <Link to="/admin/create-official">
            <Button variant="secondary">Create Official Level</Button>
          </Link>
          <Link to="/admin/users">
            <Button variant="ghost">View Users</Button>
          </Link>
        </div>
      </Panel>
    </div>
  );
}
