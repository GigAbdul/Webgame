import { useQuery } from '@tanstack/react-query';
import { Panel } from '../components/ui';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { LeaderboardEntry } from '../types/models';

export function LeaderboardPage() {
  const user = useAuthStore((state) => state.user);

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => apiRequest<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard'),
  });

  const myRankQuery = useQuery({
    queryKey: ['leaderboard-me'],
    queryFn: () => apiRequest<{ entry: LeaderboardEntry | null }>('/api/leaderboard/me'),
    enabled: Boolean(user),
  });

  const leaderboard = leaderboardQuery.data?.leaderboard ?? [];

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Podium</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              Star
              <br />
              Rankings
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-white/82">
              Полноценный arcade leaderboard: топ-3 как пьедестал, ниже полный список игроков по total earned stars.
            </p>
          </div>

          {myRankQuery.data?.entry ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="game-stat px-4 py-4 sm:col-span-3">
                <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Your Standing</p>
                <p className="mt-2 font-display text-3xl text-white">
                  #{myRankQuery.data.entry.rank} • {myRankQuery.data.entry.username}
                </p>
              </div>
              <div className="game-stat px-4 py-4">
                <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Stars</p>
                <p className="mt-2 font-display text-4xl text-white">{myRankQuery.data.entry.totalStars}</p>
              </div>
              <div className="game-stat px-4 py-4">
                <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Clears</p>
                <p className="mt-2 font-display text-4xl text-white">{myRankQuery.data.entry.completedOfficialLevels}</p>
              </div>
            </div>
          ) : null}
        </div>
      </Panel>

      {leaderboard.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {leaderboard.slice(0, 3).map((entry, index) => (
            <Panel
              key={entry.id}
              className={
                index === 0
                  ? 'game-screen bg-[linear-gradient(180deg,rgba(255,212,74,0.28),rgba(44,8,84,0.94))]'
                  : index === 1
                    ? 'game-screen bg-[linear-gradient(180deg,rgba(116,251,255,0.22),rgba(44,8,84,0.94))]'
                    : 'game-screen bg-[linear-gradient(180deg,rgba(255,87,121,0.24),rgba(44,8,84,0.94))]'
              }
            >
              <p className="font-display text-[10px] tracking-[0.24em] text-[#ffd44a]">Rank #{entry.rank}</p>
              <h3 className="mt-3 font-display text-3xl text-white">{entry.username}</h3>
              <p className="mt-4 font-display text-5xl text-[#caff45]">{entry.totalStars}</p>
              <p className="mt-2 text-sm text-white/76">{entry.completedOfficialLevels} official clears</p>
            </Panel>
          ))}
        </div>
      ) : null}

      <Panel className="game-screen overflow-hidden bg-transparent p-0">
        <div className="overflow-x-auto">
          <table className="arcade-table min-w-full text-left text-sm">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Stars</th>
                <th>Official Clears</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => {
                const isCurrentUser = user?.id === entry.id;

                return (
                  <tr key={entry.id} className={isCurrentUser ? 'bg-[#caff45]/10' : undefined}>
                    <td className="font-display text-[#ffd44a]">#{entry.rank}</td>
                    <td className="font-display text-white">{entry.username}</td>
                    <td className="text-white/82">{entry.totalStars}</td>
                    <td className="text-white/82">{entry.completedOfficialLevels}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
