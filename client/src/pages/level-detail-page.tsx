import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Panel } from '../components/ui';
import { GameCanvas } from '../features/game/game-canvas';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { Level } from '../types/models';

export function LevelDetailPage() {
  const { slugOrId = '' } = useParams();
  const user = useAuthStore((state) => state.user);

  const levelQuery = useQuery({
    queryKey: ['official-level', slugOrId],
    queryFn: () => apiRequest<{ level: Level }>(`/api/levels/official/${slugOrId}`),
    enabled: Boolean(slugOrId),
  });

  const level = levelQuery.data?.level;

  if (levelQuery.isLoading) {
    return <p className="text-white/70">Loading level...</p>;
  }

  if (!level) {
    return <p className="text-white/70">Level not found.</p>;
  }

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Stage Briefing</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              {level.title}
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-white/82">{level.description}</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent">{level.difficulty ?? 'UNRATED'}</Badge>
              <Badge tone="success">{level.starsReward} Stars</Badge>
              <Badge>{level.theme}</Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Reward</p>
              <p className="mt-2 font-display text-4xl text-white">{level.starsReward}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Theme</p>
              <p className="mt-2 font-display text-xl text-white">{level.theme}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Builder</p>
              <p className="mt-2 font-display text-xl text-white">{level.author?.username ?? 'Unknown'}</p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <GameCanvas levelData={level.dataJson} attemptNumber={1} autoRestartOnFail />

        <div className="space-y-4">
          <Panel className="game-screen bg-transparent">
            <div className="space-y-4">
              <div>
                <p className="font-display text-[11px] tracking-[0.24em] text-[#ffd44a]">Mission</p>
                <h3 className="mt-2 font-display text-3xl text-white">Clear The Stage</h3>
              </div>

              <div className="space-y-3 text-sm leading-7 text-white/78">
                <p>Jump through spikes, portals and pads with the same runtime that powers the editor and official runs.</p>
                <p>
                  {user
                    ? 'Ты уже вошёл в аккаунт, так что первый успешный clear сразу отправит звёзды в профиль и лидерборд.'
                    : 'Чтобы звёзды засчитались в профиль и лидерборд, нужно зайти в аккаунт перед official run.'}
                </p>
              </div>

              <div className="grid gap-3">
                {user ? (
                  <Link to={`/play/${level.slug}`}>
                    <Button className="w-full">Play Official Run</Button>
                  </Link>
                ) : (
                  <Link to="/login">
                    <Button className="w-full">Login To Play</Button>
                  </Link>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Link to="/levels">
                    <Button variant="ghost" className="w-full">
                      Back To Stages
                    </Button>
                  </Link>
                  <Link to="/leaderboard">
                    <Button variant="secondary" className="w-full">
                      Leaderboard
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="game-screen bg-transparent">
            <div className="space-y-3">
              <p className="font-display text-[11px] tracking-[0.24em] text-[#ffd44a]">Run Notes</p>
              <p className="text-sm leading-7 text-white/78">
                First completion on an official stage pays the stored star reward once. Replays still count for practice, but
                they do not duplicate the reward.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
