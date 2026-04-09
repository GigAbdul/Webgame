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
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="default">Official Briefing</Badge>
              <Badge tone="accent">{difficulty.label}</Badge>
              <Badge tone="success">{rewardStars} Stars</Badge>
              {level.featured ? <Badge tone="success">Featured</Badge> : null}
            </div>

            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <DifficultyIcon difficulty={level.difficulty} size="lg" showStars />

              <div className="space-y-3">
                <p className="gd-stage-eyebrow">DashForge Route</p>
                <h2 className="font-display text-4xl leading-[0.92] text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.35)] md:text-6xl">
                  {level.title}
                </h2>
                <p className="max-w-3xl text-sm leading-8 text-white/80">
                  {level.description?.trim() || 'No extra briefing text yet. Open the route and read the stage through its gameplay language.'}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-white/72">
                  <span className="gd-stage-meta-pill">{formatThemeName(level.theme)}</span>
                  <span className="gd-stage-meta-pill">Builder {level.author?.username ?? 'Unknown'}</span>
                  <span className="gd-stage-meta-pill">First clear pays once</span>
                </div>
              </div>
            </div>
          </div>

          <div className="gd-stage-briefing-actions">
            <div className="gd-stage-reward gd-stage-reward-large">
              <span className="gd-stage-reward-value">{rewardStars}</span>
              <span className="gd-stage-reward-label">Star Reward</span>
            </div>

            <div className="space-y-3">
              {user ? (
                <Link to={`/play/${level.slug}`}>
                  <Button className="w-full">Launch Official Run</Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button className="w-full">Login To Launch</Button>
                </Link>
              )}

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

            <div className="space-y-2 text-sm leading-7 text-white/74">
              <p>Normal mode uses the same runtime as the official play screen.</p>
              <p>Stars are granted only on the first successful clear of this official route.</p>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <GameCanvas levelData={level.dataJson} attemptNumber={1} autoRestartOnFail />

        <div className="space-y-4">
          <Panel className="game-screen bg-transparent">
            <div className="space-y-4">
              <div>
                <p className="font-display text-[11px] tracking-[0.24em] text-[#ffd44a]">Run Brief</p>
                <h3 className="mt-2 font-display text-3xl text-white">What To Expect</h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <BriefChip label="Difficulty" value={difficulty.label} />
                <BriefChip label="Theme" value={formatThemeName(level.theme)} />
                <BriefChip label="Reward" value={`${rewardStars} Stars`} />
                <BriefChip label="Builder" value={level.author?.username ?? 'Unknown'} />
              </div>

              <p className="text-sm leading-7 text-white/78">
                Use this screen as your launch pad: preview the route, check its difficulty and reward, then jump into
                the official run when the rhythm feels right.
              </p>
            </div>
          </Panel>

          <Panel className="game-screen bg-transparent">
            <div className="space-y-3">
              <p className="font-display text-[11px] tracking-[0.24em] text-[#ffd44a]">Clear Rules</p>
              <p className="text-sm leading-7 text-white/78">
                Completion rewards are tracked on the server, official stages pay out only once, and replaying the route
                is still useful for timing, routing, and score-chasing.
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
