import { useQuery } from '@tanstack/react-query';
import { Panel } from '../components/ui';
import { apiRequest } from '../services/api';
import type { User } from '../types/models';

export function AdminUsersPage() {
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiRequest<{ users: User[] }>('/api/admin/users'),
  });

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Player Roster</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              User
              <br />
              Overview
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-white/82">
              Read-only список игроков, полезный для sanity check seeded data и проверки лидерборда.
            </p>
          </div>
        </div>
      </Panel>

      <Panel className="game-screen overflow-hidden bg-transparent p-0">
        <div className="overflow-x-auto">
          <table className="arcade-table min-w-full text-left text-sm">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Stars</th>
                <th>Official Clears</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data?.users.map((user) => (
                <tr key={user.id}>
                  <td className="font-display text-white">{user.username}</td>
                  <td className="text-white/80">{user.role}</td>
                  <td className="text-white/80">{user.totalStars}</td>
                  <td className="text-white/80">{user.completedOfficialLevels}</td>
                  <td className="text-white/80">{user.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
