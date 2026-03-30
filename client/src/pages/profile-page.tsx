import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { EmptyState, Panel, StatCard } from '../components/ui';
import { apiRequest } from '../services/api';
import type { ProfileResponse } from '../types/models';

export function ProfilePage() {
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiRequest<ProfileResponse>('/api/profile/me'),
  });

  const profile = profileQuery.data;

  if (profileQuery.isLoading) {
    return <p className="text-white/70">Loading profile...</p>;
  }

  if (!profile) {
    return <p className="text-white/70">Profile unavailable.</p>;
  }

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Pilot Profile</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              {profile.user.username}
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-white/82">
              Здесь должен ощущаться профиль игрока, а не кабинет: звёзды, clear-ы, свои уровни и последние награды в
              одном arcade dashboard.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Email</p>
              <p className="mt-2 text-sm text-white">{profile.user.email}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Role</p>
              <p className="mt-2 font-display text-xl text-white">{profile.user.role}</p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Stars" value={profile.user.totalStars} />
        <StatCard label="Official Clears" value={profile.user.completedOfficialLevels} />
        <StatCard label="Created Levels" value={profile.levels.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="game-screen bg-transparent">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-[11px] tracking-[0.24em] text-[#ffd44a]">Workshop</p>
                <h3 className="mt-1 font-display text-3xl text-white">My Levels</h3>
              </div>
              <Link to="/my-levels" className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a] hover:text-white">
                View All
              </Link>
            </div>

            {profile.levels.length ? (
              <div className="space-y-3">
                {profile.levels.slice(0, 5).map((level) => (
                  <div key={level.id} className="game-stat px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-lg text-white">{level.title}</p>
                      <span className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">{level.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/76">
                      Updated {new Date(level.updatedAt).toLocaleDateString()}
                      {level.isOfficial ? ` • ${level.starsReward} stars` : ' • Draft Pipeline'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No levels yet"
                description="Открой forge и собери свой первый маршрут."
                action={
                  <Link to="/editor/new" className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a] hover:text-white">
                    Open Editor
                  </Link>
                }
              />
            )}
          </div>
        </Panel>

        <Panel className="game-screen bg-transparent">
          <div className="space-y-4">
            <div>
              <p className="font-display text-[11px] tracking-[0.24em] text-[#ffd44a]">Star Feed</p>
              <h3 className="mt-1 font-display text-3xl text-white">Recent Rewards</h3>
            </div>

            {profile.recentRewards.length ? (
              <div className="space-y-3">
                {profile.recentRewards.map((reward) => (
                  <div key={`${reward.level.id}-${reward.awardedAt}`} className="game-stat px-4 py-4">
                    <p className="font-display text-lg text-white">{reward.level.title}</p>
                    <p className="mt-2 font-display text-xl text-[#ffd44a]">+{reward.starsAwarded} stars</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-white/78">No reward history yet. Clear official levels to start earning.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
