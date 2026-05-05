import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Flag, Hammer, Star, Trophy, UserRound, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { LeaderboardEntry } from '../types/models';

type LeaderboardTab = 'TOP_100' | 'GLOBAL' | 'CREATORS';
type LeaderboardMetric = 'stars' | 'clears' | 'creators';
type LeaderboardSideMetric = 'stars' | 'clears';
type LeaderboardSideIconName = 'star' | 'flag';
type LeaderboardPrimaryStatIconName = 'star' | 'flag';
type LeaderboardMiniStatIconName = 'rank' | 'builder' | 'calendar' | 'user';

const TAB_OPTIONS: Array<{ id: LeaderboardTab; label: string }> = [
  { id: 'TOP_100', label: 'Top 100' },
  { id: 'GLOBAL', label: 'Global' },
  { id: 'CREATORS', label: 'Creators' },
];

const METRIC_OPTIONS: Array<{ id: LeaderboardSideMetric; label: string; icon: LeaderboardSideIconName }> = [
  { id: 'stars', label: 'Stars', icon: 'star' },
  { id: 'clears', label: 'Clears', icon: 'flag' },
];

const numberFormatter = new Intl.NumberFormat('en-US');

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function getMetricValue(entry: LeaderboardEntry, metric: LeaderboardMetric) {
  if (metric === 'clears') {
    return entry.completedOfficialLevels;
  }

  if (metric === 'creators') {
    return entry.officialLevelsAuthored;
  }

  return entry.totalStars;
}

function compareEntries(left: LeaderboardEntry, right: LeaderboardEntry, metric: LeaderboardMetric) {
  const metricDelta = getMetricValue(right, metric) - getMetricValue(left, metric);

  if (metricDelta !== 0) {
    return metricDelta;
  }

  if (right.totalStars !== left.totalStars) {
    return right.totalStars - left.totalStars;
  }

  if (right.completedOfficialLevels !== left.completedOfficialLevels) {
    return right.completedOfficialLevels - left.completedOfficialLevels;
  }

  if (right.officialLevelsAuthored !== left.officialLevelsAuthored) {
    return right.officialLevelsAuthored - left.officialLevelsAuthored;
  }

  return left.username.localeCompare(right.username);
}

function getSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getAvatarTone(entry: LeaderboardEntry) {
  const seed = getSeed(entry.id);
  const hue = seed % 360;
  const accentHue = (hue + 48) % 360;
  return {
    '--lb-avatar-primary': `hsl(${hue} 76% 46%)`,
    '--lb-avatar-secondary': `hsl(${accentHue} 84% 58%)`,
  } as CSSProperties;
}

function getAvatarGlyph(entry: LeaderboardEntry) {
  return entry.username.trim().charAt(0).toUpperCase() || '?';
}

function getJoinedCopy(createdAt?: string) {
  if (!createdAt) {
    return 'Now';
  }

  return new Date(createdAt).getFullYear().toString();
}

function getFooterCopy(input: {
  activeMetric: LeaderboardMetric;
  totalEntries: number;
}) {
  if (input.activeMetric === 'creators') {
    return `Showing ${input.totalEntries} players sorted by rated levels built.`;
  }

  if (input.activeMetric === 'clears') {
    return `Showing ${input.totalEntries} players sorted by official clears.`;
  }

  return `Showing ${input.totalEntries} players sorted by total stars.`;
}

export function LeaderboardPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('TOP_100');
  const [activeMetric, setActiveMetric] = useState<LeaderboardMetric>('stars');

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => apiRequest<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard'),
  });

  const effectiveMetric = activeTab === 'CREATORS' ? 'creators' : activeMetric;
  const rankedEntries = useMemo(() => {
    const leaderboard = leaderboardQuery.data?.leaderboard ?? [];

    return [...leaderboard]
        .sort((left, right) => compareEntries(left, right, effectiveMetric))
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));
  }, [effectiveMetric, leaderboardQuery.data?.leaderboard]);

  const visibleEntries = useMemo(() => rankedEntries.slice(0, 100), [rankedEntries]);

  const currentUserId = user?.id ?? null;

  return (
    <div className="gd-arcade-leaderboard-page">
      <div className="gd-arcade-leaderboard-scene" aria-hidden="true">
        <div className="gd-arcade-leaderboard-grid" />
        <div className="gd-arcade-leaderboard-corner gd-arcade-leaderboard-corner--left" />
        <div className="gd-arcade-leaderboard-corner gd-arcade-leaderboard-corner--right" />
      </div>

      <Link to="/" className="gd-arcade-leaderboard-back-button" aria-label="Back to home">
        <span className="gd-arcade-leaderboard-back-icon" />
      </Link>

      <div className="gd-arcade-leaderboard-side-buttons" aria-label="Sort leaderboard">
        {METRIC_OPTIONS.map((metric) => {
          const isActive = effectiveMetric === metric.id;
          return (
            <button
              key={metric.id}
              type="button"
              className={`gd-arcade-leaderboard-side-button${isActive ? ' is-active' : ''}`}
              onClick={() => {
                setActiveMetric(metric.id);
                if (activeTab === 'CREATORS') {
                  setActiveTab('TOP_100');
                }
              }}
              aria-label={`Sort by ${metric.label}`}
              aria-pressed={isActive}
            >
              <LeaderboardSideIcon icon={metric.icon} />
            </button>
          );
        })}
      </div>

      <div className="gd-arcade-leaderboard-shell">
        <div className="gd-arcade-leaderboard-tabs" role="tablist" aria-label="Leaderboard categories">
          {TAB_OPTIONS.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`gd-arcade-leaderboard-tab${isActive ? ' is-active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'TOP_100' || tab.id === 'GLOBAL') {
                    setActiveMetric('stars');
                  }
                  if (tab.id === 'CREATORS') {
                    setActiveMetric('creators');
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <section className="gd-arcade-leaderboard-frame">
          <div className="gd-arcade-leaderboard-toprail" />

          <div className="gd-arcade-leaderboard-board">
            {leaderboardQuery.isLoading ? (
              <div className="gd-arcade-leaderboard-feedback">
                <p>Loading leaderboard...</p>
              </div>
            ) : null}

            {leaderboardQuery.isError ? (
              <div className="gd-arcade-leaderboard-feedback gd-arcade-leaderboard-feedback--action">
                <p>Could not load rankings.</p>
                <button type="button" onClick={() => void leaderboardQuery.refetch()}>
                  Retry
                </button>
              </div>
            ) : null}

            {!leaderboardQuery.isLoading && !leaderboardQuery.isError && !visibleEntries.length ? (
              <div className="gd-arcade-leaderboard-feedback">
                <p>No ranked players yet.</p>
              </div>
            ) : null}

            {!leaderboardQuery.isLoading && !leaderboardQuery.isError && visibleEntries.length ? (
              <div className="gd-arcade-leaderboard-list" role="list">
                {visibleEntries.map((entry) => {
                  const isCurrentUser = currentUserId === entry.id;

                  return (
                    <article
                      key={`${activeTab}-${effectiveMetric}-${entry.id}`}
                      className={`gd-arcade-leaderboard-row${isCurrentUser ? ' is-current-user' : ''}`}
                      role="listitem"
                    >
                      <div className="gd-arcade-leaderboard-rank-column">
                        <div className="gd-arcade-leaderboard-avatar" style={getAvatarTone(entry)}>
                          <span>{getAvatarGlyph(entry)}</span>
                        </div>
                        <span className="gd-arcade-leaderboard-rank-number">{entry.rank}</span>
                      </div>

                      <div className="gd-arcade-leaderboard-row-main">
                        <div className="gd-arcade-leaderboard-row-top">
                          <h2 className="gd-arcade-leaderboard-player-name">{entry.username}</h2>

                          <div className="gd-arcade-leaderboard-primary-stats">
                            <LeaderboardStat icon="star" value={formatNumber(entry.totalStars)} />
                            <LeaderboardStat icon="flag" value={formatNumber(entry.completedOfficialLevels)} />
                          </div>
                        </div>

                        <div className="gd-arcade-leaderboard-secondary-stats">
                          <LeaderboardMiniStat icon="rank" value={`#${entry.rank}`} />
                          <LeaderboardMiniStat
                            icon="builder"
                            value={formatNumber(entry.officialLevelsAuthored)}
                            label="Rated levels built"
                          />
                          <LeaderboardMiniStat icon="calendar" value={getJoinedCopy(entry.createdAt)} />
                          {isCurrentUser ? <LeaderboardMiniStat icon="user" value="You" /> : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="gd-arcade-leaderboard-bottom">
            <div className="gd-arcade-leaderboard-bottom-rail" />
            <div className="gd-arcade-leaderboard-bottom-core" aria-hidden="true" />
            <div className="gd-arcade-leaderboard-bottom-copy">
              {getFooterCopy({
                activeMetric: effectiveMetric,
                totalEntries: visibleEntries.length,
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LeaderboardStat({ icon, value }: { icon: LeaderboardPrimaryStatIconName; value: string }) {
  return (
    <span className="gd-arcade-leaderboard-stat">
      <LeaderboardPrimaryStatIcon icon={icon} />
      <span className="gd-arcade-leaderboard-stat-value">{value}</span>
    </span>
  );
}

function LeaderboardPrimaryStatIcon({ icon }: { icon: LeaderboardPrimaryStatIconName }) {
  const Icon = icon === 'star' ? Star : Flag;

  return (
    <Icon
      className={`gd-arcade-leaderboard-stat-svg gd-arcade-leaderboard-stat-svg--${icon}`}
      aria-hidden="true"
      focusable="false"
      strokeWidth={3}
    />
  );
}

function LeaderboardSideIcon({ icon }: { icon: LeaderboardSideIconName }) {
  const Icon = icon === 'star' ? Star : Flag;

  return (
    <Icon
      className={`gd-arcade-leaderboard-side-svg gd-arcade-leaderboard-side-svg--${icon}`}
      aria-hidden="true"
      focusable="false"
      strokeWidth={3}
    />
  );
}

function LeaderboardMiniStat({
  icon,
  value,
  label,
}: {
  icon: LeaderboardMiniStatIconName;
  value: string;
  label?: string;
}) {
  return (
    <span className="gd-arcade-leaderboard-mini-stat" aria-label={label} title={label}>
      <LeaderboardMiniStatIcon icon={icon} />
      <span className="gd-arcade-leaderboard-mini-value">{value}</span>
    </span>
  );
}

function LeaderboardMiniStatIcon({ icon }: { icon: LeaderboardMiniStatIconName }) {
  const icons: Record<LeaderboardMiniStatIconName, LucideIcon> = {
    rank: Trophy,
    builder: Hammer,
    calendar: CalendarDays,
    user: UserRound,
  };
  const Icon = icons[icon];

  return (
    <Icon
      className={`gd-arcade-leaderboard-mini-svg gd-arcade-leaderboard-mini-svg--${icon}`}
      aria-hidden="true"
      focusable="false"
      strokeWidth={3}
    />
  );
}
