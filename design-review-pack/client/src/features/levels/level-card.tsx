import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Level } from '../../types/models';
import { Button } from '../../components/ui';
import { DifficultyIcon } from './difficulty-icon';
import {
  formatStageNumber,
  formatThemeName,
  getDifficultyPresentation,
  getDisplayedStars,
} from './level-presentation';

type LevelCardProps = {
  level: Level;
  index: number;
  selected: boolean;
};

export function LevelCard({ level, index, selected }: LevelCardProps) {
  const difficulty = getDifficultyPresentation(level.difficulty);
  const rewardStars = getDisplayedStars(level);
  const themeLabel = formatThemeName(level.theme);
  const stageNumber = formatStageNumber(index);
  const rewardPercent = Math.max(18, Math.min(100, rewardStars * 10));
  const intensityPercent = Math.max(18, difficulty.meter);
  const rewardPips = rewardStars >= 10 ? 3 : rewardStars >= 6 ? 2 : rewardStars > 0 ? 1 : 0;
  const cardStyle = {
    '--gd-stage-primary': difficulty.primary,
    '--gd-stage-secondary': difficulty.secondary,
    '--gd-stage-highlight': difficulty.highlight,
    '--gd-stage-glow': difficulty.glow,
  } as CSSProperties;

  return (
    <article className={`gd-level-selector-card${selected ? ' is-active' : ''}`} style={cardStyle}>
      <div className="gd-level-selector-window">
        <div className="gd-level-selector-header">
          <span className="gd-level-selector-stage">Stage {stageNumber}</span>
          <span className="gd-level-selector-stars">
            {rewardStars} <span className="gd-level-selector-stars-mark">*</span>
          </span>
        </div>

        <div className="gd-level-selector-banner">
          <DifficultyIcon difficulty={level.difficulty} size="sm" />

          <div className="min-w-0 flex-1">
            <h3 className="gd-level-selector-title">{level.title}</h3>
            <p className="gd-level-selector-subtitle">
              {difficulty.label} / {themeLabel}
            </p>
            <p className="gd-level-selector-note">by {level.author?.username ?? 'Unknown'} / official route</p>
          </div>

          <div className="gd-level-selector-pips" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, pipIndex) => (
              <span
                key={`${level.id}-pip-${pipIndex}`}
                className={`gd-level-selector-pip${pipIndex < rewardPips ? ' is-active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="gd-level-selector-bars">
          <SelectorBar label="Official Reward" value={`${rewardStars} Stars`} percent={rewardPercent} />
          <SelectorBar label="Route Pressure" value={difficulty.label} percent={intensityPercent} />
        </div>

        <div className="gd-level-selector-footer">
          <div className="gd-level-selector-meta">
            <span className="gd-level-selector-chip">{themeLabel}</span>
            {level.featured ? <span className="gd-level-selector-chip is-featured">Featured</span> : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to={`/levels/${level.slug}`}>
              <Button variant="secondary">Briefing</Button>
            </Link>
            <Link to={`/play/${level.slug}`}>
              <Button>Launch</Button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function SelectorBar({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <div className="gd-level-selector-bar-block">
      <div className="gd-level-selector-bar-copy">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="gd-level-selector-bar">
        <div className="gd-level-selector-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
