import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Panel } from '../components/ui';
import { GameCanvas } from '../features/game/game-canvas';
import { DifficultyIcon } from '../features/levels/difficulty-icon';
import { formatThemeName, getDifficultyPresentation, getDisplayedStars } from '../features/levels/level-presentation';
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
    return (
      <Panel className="game-screen bg-transparent">
        <p className="font-display text-sm tracking-[0.24em] text-white/78">Loading stage briefing...</p>
      </Panel>
    );
  }

  if (!level) {
    return (
      <Panel className="game-screen bg-transparent">
        <p className="font-display text-sm tracking-[0.24em] text-white/78">Stage not found.</p>
      </Panel>
    );
  }

  const difficulty = getDifficultyPresentation(level.difficulty);
  const rewardStars = getDisplayedStars(level);
  const detailStyle = {
    '--gd-stage-primary': difficulty.primary,
    '--gd-stage-secondary': difficulty.secondary,
    '--gd-stage-highlight': difficulty.highlight,
    '--gd-stage-glow': difficulty.glow,
  } as CSSProperties;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <article className="gd-stage-briefing-card" style={detailStyle}>
        <div className="gd-stage-briefing-grid">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="default">Official Briefing</Badge>
              <Badge tone="accent">{difficulty.label}</Badge>
              <Badge tone="success">{rewardStars} Stars</Badge>
              {level.featured ? <Badge tone="success">Featured</Badge> : null}
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <DifficultyIcon difficulty={level.difficulty} size="lg" showStars />

              <div className="space-y-4">
                <p className="gd-stage-eyebrow">Stage Launch Brief</p>
                <h2 className="font-display text-4xl leading-[0.9] text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.35)] md:text-6xl">
                  {level.title}
                </h2>
                <p className="max-w-3xl text-sm leading-8 text-white/82">
                  {level.description?.trim() ||
                    'No extra briefing copy yet. Read the route through its layout, timing, and difficulty rhythm.'}
                </p>

                <div className="gd-stage-meta">
                  <span className="gd-stage-meta-pill">{formatThemeName(level.theme)}</span>
                  <span className="gd-stage-meta-pill">Builder {level.author?.username ?? 'Unknown'}</span>
                  <span className="gd-stage-meta-pill">Reward pays on first clear</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <BriefChip label="Difficulty" value={difficulty.label} />
              <BriefChip label="Reward" value={`${rewardStars} Stars`} />
              <BriefChip label="Theme" value={formatThemeName(level.theme)} />
            </div>
          </div>

          <div className="gd-stage-briefing-actions">
            <div className="gd-stage-reward gd-stage-reward-large">
              <span className="gd-stage-reward-value">{rewardStars}</span>
              <span className="gd-stage-reward-label">Official Reward</span>
            </div>

            <Panel className="game-screen bg-transparent">
              <div className="space-y-4">
                <div>
                  <p className="arcade-eyebrow">Launch Window</p>
                  <h3 className="font-display text-3xl text-white">Ready To Run</h3>
                </div>

                <p className="text-sm leading-7 text-white/80">
                  The live run uses the same runtime as the official play screen. Signed-in runs are tracked for rewards and
                  leaderboard progress, while guests can still jump in and practice freely.
                </p>

                <div className="grid gap-3">
                  <Link to={`/play/${level.slug}`}>
                    <Button className="w-full">{user ? 'Launch Official Run' : 'Play As Guest'}</Button>
                  </Link>

                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/levels">
                      <Button variant="ghost" className="w-full">
                        Back To Select
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
                <p className="arcade-eyebrow">Clear Rules</p>
              <p className="text-sm leading-7 text-white/78">
                  Stars are granted only on the first successful official clear for signed-in pilots. Guest runs are great
                  for routing, timing, and learning the lane, but they do not enter the leaderboard.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <GameCanvas levelData={level.dataJson} attemptNumber={1} autoRestartOnFail />

        <div className="space-y-4">
          <Panel className="game-screen bg-transparent">
            <div className="space-y-4">
              <div>
                <p className="arcade-eyebrow">Route Brief</p>
                <h3 className="font-display text-3xl text-white">What To Expect</h3>
              </div>

              <p className="text-sm leading-7 text-white/78">
                Use this screen as your launch pad: preview the route, check its reward band, and get a feel for the stage
                before entering the official session wrapper.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <BriefChip label="Builder" value={level.author?.username ?? 'Unknown'} />
                <BriefChip label="Featured" value={level.featured ? 'Yes' : 'No'} />
                <BriefChip label="Session" value="Server Backed" />
                <BriefChip label="Restart" value="Instant Retry" />
              </div>
            </div>
          </Panel>

          <Panel className="game-screen bg-transparent">
            <div className="space-y-3">
              <p className="arcade-eyebrow">Why This Screen Exists</p>
              <p className="text-sm leading-7 text-white/78">
                The goal is to make stage launch feel deliberate: one clean briefing card, a readable live preview, and a
                strong launch button instead of raw metadata blocks.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function BriefChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="game-stat px-4 py-4">
      <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">{label}</p>
      <p className="mt-2 font-display text-xl text-white">{value}</p>
    </div>
  );
}
