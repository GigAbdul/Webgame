import { Link } from 'react-router-dom';
import type { Level } from '../../types/models';
import { Badge, Button, Panel } from '../../components/ui';

export function LevelCard({ level }: { level: Level }) {
  return (
    <Panel className="game-screen flex h-full flex-col justify-between gap-5 bg-transparent p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone={level.featured ? 'success' : 'default'}>
              {level.featured ? 'Featured' : level.status}
            </Badge>
            {level.difficulty ? <Badge tone="accent">{level.difficulty}</Badge> : null}
          </div>

          <div className="game-chip-gold px-3 py-2 text-center">
            <p className="font-display text-[9px] tracking-[0.22em] text-[#734700]/80">Stars</p>
            <p className="font-display text-xl leading-none text-[#734700]">{level.starsReward}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-display text-[11px] tracking-[0.28em] text-[#ffd44a]">Official Stage</p>
          <h3 className="font-display text-3xl leading-[0.95] text-[#caff45] drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]">
            {level.title}
          </h3>
          <p className="text-sm leading-7 text-white/78">{level.description}</p>
        </div>

        <div className="level-preview-track arcade-button border-[4px] border-[#39105f] bg-[linear-gradient(180deg,rgba(100,21,167,0.5),rgba(19,6,40,0.92))] p-4">
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-white/70">
              <span>{level.theme}</span>
              <span>Stage Preview</span>
            </div>
            <div className="relative mt-7 h-24">
              <div className="absolute bottom-0 left-0 right-0 h-3 bg-[#74fbff]/25" />
              <div className="absolute bottom-0 left-[7%] h-6 w-6 rotate-12 border-[4px] border-[#143000] bg-[#caff45] shadow-[0_0_0_3px_rgba(255,255,255,0.12)_inset]" />
              <div className="absolute bottom-0 left-[18%] h-3 w-[14%] bg-[#74fbff] shadow-[0_0_14px_rgba(116,251,255,0.35)]" />
              <div className="absolute bottom-0 left-[38%] h-10 w-[9%] bg-[#ffd44a]/90" />
              <div className="absolute bottom-0 left-[54%] h-0 w-0 border-b-[34px] border-l-[18px] border-r-[18px] border-b-[#ff5779] border-l-transparent border-r-transparent" />
              <div className="absolute bottom-0 left-[72%] h-14 w-[9%] bg-white/18" />
              <div className="absolute bottom-0 left-[88%] h-20 w-[4%] bg-[#caff45]/60" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-white/68">
                <span>Intensity</span>
                <span>{level.difficulty ?? 'Unrated'}</span>
              </div>
              <div className="progress-lane border-[#ffd44a]/25">
                <div
                  className="progress-lane-fill"
                  style={{ width: `${Math.min(100, 18 + level.starsReward * 8)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="game-stat px-4 py-3">
            <p className="font-display text-[10px] tracking-[0.2em] text-[#ffd44a]">Theme</p>
            <p className="mt-1 font-display text-lg text-white">{level.theme}</p>
          </div>
          <div className="game-stat px-4 py-3">
            <p className="font-display text-[10px] tracking-[0.2em] text-[#ffd44a]">Builder</p>
            <p className="mt-1 font-display text-lg text-white">{level.author?.username ?? 'Unknown'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[10px] tracking-[0.22em] text-white/68">First clear awards stars</p>
        <div className="flex gap-3">
          <Link to={`/levels/${level.slug}`}>
            <Button variant="secondary">Stage Info</Button>
          </Link>
          <Link to={`/levels/${level.slug}`}>
            <Button>Launch</Button>
          </Link>
        </div>
      </div>
    </Panel>
  );
}
