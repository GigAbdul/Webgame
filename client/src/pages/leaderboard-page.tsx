import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { LeaderboardEntry } from '../types/models';

type LeaderboardTab = 'TOP_100' | 'FRIENDS' | 'GLOBAL' | 'CREATORS';
type LeaderboardMetric = 'stars' | 'clears' | 'creators' | 'recent';

const TAB_OPTIONS: Array<{ id: LeaderboardTab; label: string }> = [
  { id: 'TOP_100', label: 'Top 100' },
  { id: 'FRIENDS', label: 'Friends' },
  { id: 'GLOBAL', label: 'Global' },
  { id: 'CREATORS', label: 'Creators' },
];

const METRIC_OPTIONS: Array<{ id: LeaderboardMetric; label: string; icon: string }> = [
  { id: 'stars', label: 'Stars', icon: 'star' },
  { id: 'clears', label: 'Clears', icon: 'moon' },
  { id: 'creators', label: 'Creators', icon: 'tools' },
  { id: 'recent', label: 'Recent', icon: 'clock' },
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

  if (metric === 'recent') {
    return entry.createdAt ? new Date(entry.createdAt).getTime() : 0;
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

function getNeighborhoodEntries(entries: LeaderboardEntry[], userId: string | undefined) {
  if (!userId) {
    return [];
  }

  const targetIndex = entries.findIndex((entry) => entry.id === userId);

  if (targetIndex === -1) {
    return [];
  }

  const start = Math.max(0, targetIndex - 4);
  const end = Math.min(entries.length, targetIndex + 5);
  return entries.slice(start, end);
}

function getJoinedCopy(createdAt?: string) {
  if (!createdAt) {
    return 'Now';
  }

  return new Date(createdAt).getFullYear().toString();
}

function getFooterCopy(input: {
  activeTab: LeaderboardTab;
  activeMetric: LeaderboardMetric;
  totalEntries: number;
  myRank: LeaderboardEntry | null | undefined;
}) {
  if (input.activeTab === 'FRIENDS') {
    return input.myRank
      ? `Your global star rank is #${input.myRank.rank}.`
      : 'Sign in to unlock friend comparisons and your saved rank.';
  }

  if (input.activeMetric === 'creators') {
    return `Showing ${input.totalEntries} players sorted by official levels authored.`;
  }

  if (input.activeMetric === 'clears') {
    return `Showing ${input.totalEntries} players sorted by official clears.`;
  }

  if (input.activeMetric === 'recent') {
    return `Showing ${input.totalEntries} players sorted by most recent account creation.`;
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

  const myRankQuery = useQuery({
    queryKey: ['leaderboard-me'],
    queryFn: () => apiRequest<{ entry: LeaderboardEntry | null }>('/api/leaderboard/me'),
    enabled: Boolean(user),
  });

  const effectiveMetric = activeTab === 'CREATORS' ? 'creators' : activeMetric;
  const leaderboard = leaderboardQuery.data?.leaderboard ?? [];
  const rankedEntries = useMemo(
    () =>
      [...leaderboard]
        .sort((left, right) => compareEntries(left, right, effectiveMetric))
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        })),
    [effectiveMetric, leaderboard],
  );

  const visibleEntries = useMemo(() => {
    if (activeTab === 'FRIENDS') {
      return getNeighborhoodEntries(rankedEntries, user?.id);
    }

    return rankedEntries.slice(0, 100);
  }, [activeTab, rankedEntries, user?.id]);

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
                if (metric.id === 'creators') {
                  setActiveTab('CREATORS');
                  return;
                }

                if (activeTab === 'CREATORS') {
                  setActiveTab('TOP_100');
                }
              }}
              aria-label={`Sort by ${metric.label}`}
              aria-pressed={isActive}
            >
              <span className={`gd-arcade-leaderboard-side-icon gd-arcade-leaderboard-side-icon--${metric.icon}`} />
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

            {!leaderboardQuery.isLoading && activeTab === 'FRIENDS' && !user ? (
              <div className="gd-arcade-leaderboard-feedback">
                <p>Sign in to unlock friend comparisons.</p>
              </div>
            ) : null}

            {!leaderboardQuery.isLoading && activeTab === 'FRIENDS' && user && !visibleEntries.length ? (
              <div className="gd-arcade-leaderboard-feedback">
                <p>Friend list is not wired yet. Your rank card will show here later.</p>
              </div>
            ) : null}

            {!leaderboardQuery.isLoading && activeTab !== 'FRIENDS' && !visibleEntries.length ? (
              <div className="gd-arcade-leaderboard-feedback">
                <p>No ranked players yet.</p>
              </div>
            ) : null}

            {!leaderboardQuery.isLoading && visibleEntries.length ? (
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
                            <LeaderboardStat icon="moon" value={formatNumber(entry.completedOfficialLevels)} />
                          </div>
                        </div>

                        <div className="gd-arcade-leaderboard-secondary-stats">
                          <LeaderboardMiniStat icon="diamond" value={`#${entry.rank}`} />
                          <LeaderboardMiniStat icon="coin" value={formatNumber(entry.officialLevelsAuthored)} />
                          <LeaderboardMiniStat icon="tools" value={getJoinedCopy(entry.createdAt)} />
                          <LeaderboardMiniStat icon="clock" value={isCurrentUser ? 'You' : 'Pilot'} />
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
                activeTab,
                activeMetric: effectiveMetric,
                totalEntries: visibleEntries.length,
                myRank: myRankQuery.data?.entry,
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LeaderboardStat({ icon, value }: { icon: string; value: string }) {
  return (
    <span className="gd-arcade-leaderboard-stat">
      <span className={`gd-arcade-leaderboard-stat-icon gd-arcade-leaderboard-stat-icon--${icon}`} aria-hidden="true" />
      <span className="gd-arcade-leaderboard-stat-value">{value}</span>
    </span>
  );
}

function LeaderboardMiniStat({ icon, value }: { icon: string; value: string }) {
  return (
    <span className="gd-arcade-leaderboard-mini-stat">
      <span className={`gd-arcade-leaderboard-stat-icon gd-arcade-leaderboard-stat-icon--${icon}`} aria-hidden="true" />
      <span className="gd-arcade-leaderboard-mini-value">{value}</span>
    </span>
  );
}
