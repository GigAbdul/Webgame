import type { AnimationEvent as ReactAnimationEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { DifficultyIcon } from '../features/levels/difficulty-icon';
import { getDisplayedStars } from '../features/levels/level-presentation';
import { apiRequest } from '../services/api';
import type { Level } from '../types/models';

const EMPTY_LEVELS: Level[] = [];
type LevelTransitionDirection = 'next' | 'previous';

export function LevelsPage() {
  const levelsQuery = useQuery({
    queryKey: ['official-levels'],
    queryFn: () => apiRequest<{ levels: Level[] }>('/api/levels/official'),
  });

  const levelList = levelsQuery.data?.levels ?? EMPTY_LEVELS;
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<LevelTransitionDirection>('next');
  const initializedRef = useRef(false);
  const displayedLevel = levelList[displayedIndex] ?? null;
  const incomingLevel = pendingIndex !== null ? levelList[pendingIndex] ?? null : null;
  const activeIndex = pendingIndex ?? displayedIndex;
  const isAnimating = pendingIndex !== null;
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < levelList.length - 1;

  useEffect(() => {
    if (!levelList.length) {
      initializedRef.current = false;
      setDisplayedIndex(0);
      setPendingIndex(null);
      return;
    }

    if (initializedRef.current) {
      setDisplayedIndex((current) => Math.min(current, levelList.length - 1));
      setPendingIndex((current) =>
        current === null ? null : Math.min(current, levelList.length - 1),
      );
      return;
    }

    const featuredIndex = levelList.findIndex((level) => level.featured);
    initializedRef.current = true;
    setDisplayedIndex(featuredIndex >= 0 ? featuredIndex : 0);
    setPendingIndex(null);
  }, [levelList]);

  useEffect(() => {
    if (!levelList.length) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isAnimating) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        if (displayedIndex <= 0) {
          return;
        }

        event.preventDefault();
        setTransitionDirection('previous');
        setPendingIndex(displayedIndex - 1);
      }

      if (event.key === 'ArrowRight') {
        if (displayedIndex >= levelList.length - 1) {
          return;
        }

        event.preventDefault();
        setTransitionDirection('next');
        setPendingIndex(displayedIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [displayedIndex, isAnimating, levelList]);

  const requestLevelChange = (targetIndex: number, direction?: LevelTransitionDirection) => {
    if (!levelList.length || isAnimating) {
      return;
    }

    if (targetIndex < 0 || targetIndex >= levelList.length || targetIndex === displayedIndex) {
      return;
    }

    setTransitionDirection(direction ?? (targetIndex > displayedIndex ? 'next' : 'previous'));
    setPendingIndex(targetIndex);
  };

  const selectNextLevel = () => {
    requestLevelChange(displayedIndex + 1, 'next');
  };

  const selectPreviousLevel = () => {
    requestLevelChange(displayedIndex - 1, 'previous');
  };

  const handleTransitionComplete = (event: ReactAnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || pendingIndex === null) {
      return;
    }

    setDisplayedIndex(pendingIndex);
    setPendingIndex(null);
  };

  return (
    <div className="gd-classic-level-page">
      <div className="gd-classic-level-scene" aria-hidden="true">
        <div className="gd-classic-level-glow" />
        <div className="gd-classic-level-grid" />
        <div className="gd-classic-level-floor" />
        <div className="gd-classic-level-corner gd-classic-level-corner--left" />
        <div className="gd-classic-level-corner gd-classic-level-corner--right" />
      </div>

      <Link to="/" className="gd-classic-menu-button" aria-label="Back to main menu">
        <span className="gd-classic-back-button-icon" />
      </Link>

      {displayedLevel ? (
        <>
          {canGoPrevious ? (
            <button
              type="button"
              className="gd-classic-back-button gd-classic-back-button--previous"
              onClick={selectPreviousLevel}
              aria-label="Previous level"
              disabled={isAnimating}
            >
              <span className="gd-classic-back-button-icon" />
            </button>
          ) : null}

          {canGoNext ? (
            <button
              type="button"
              className="gd-classic-back-button gd-classic-back-button--next"
              onClick={selectNextLevel}
              aria-label="Next level"
              disabled={isAnimating}
            >
              <span className="gd-classic-back-button-icon gd-classic-back-button-icon--next" />
            </button>
          ) : null}

          <div className="gd-classic-level-shell">
            <div className="gd-classic-level-carousel" aria-live="polite">
              <LevelPanel
                level={displayedLevel}
                className={
                  incomingLevel
                    ? `gd-classic-level-panel gd-classic-level-panel--exit gd-classic-level-panel--${transitionDirection}`
                    : 'gd-classic-level-panel gd-classic-level-panel--static'
                }
              />

              {incomingLevel ? (
                <LevelPanel
                  level={incomingLevel}
                  className={`gd-classic-level-panel gd-classic-level-panel--enter gd-classic-level-panel--${transitionDirection}`}
                  onAnimationEnd={handleTransitionComplete}
                />
              ) : null}
            </div>

            <div className="gd-classic-level-dots" aria-label="Level selection">
              {levelList.map((level, index) => (
                <button
                  key={`${level.id}-dot`}
                  type="button"
                  className={`gd-classic-level-dot${index === activeIndex ? ' is-active' : ''}`}
                  onClick={() => requestLevelChange(index)}
                  aria-label={`Go to ${level.title}`}
                  disabled={isAnimating && index === activeIndex}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {levelsQuery.isLoading ? (
        <div className="gd-classic-level-feedback">
          <p>Loading official levels...</p>
        </div>
      ) : null}

      {levelsQuery.isError ? (
        <div className="gd-classic-level-feedback gd-classic-level-feedback--action">
          <p>Could not load official levels.</p>
          <button type="button" onClick={() => void levelsQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {!levelsQuery.isLoading && !levelsQuery.isError && !displayedLevel ? (
        <div className="gd-classic-level-feedback">
          <p>No official levels yet.</p>
        </div>
      ) : null}
    </div>
  );
}

function LevelPanel({
  level,
  className,
  onAnimationEnd,
}: {
  level: Level;
  className: string;
  onAnimationEnd?: (event: ReactAnimationEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className={className} onAnimationEnd={onAnimationEnd}>
      <div className="gd-classic-level-panel-body">
        <Link
          to={`/play/${level.slug}`}
          className="gd-classic-level-hero gd-classic-level-hero--playable"
          aria-label={`Play ${level.title}`}
        >
          <div className="gd-classic-level-hero-main">
            <DifficultyIcon difficulty={level.difficulty} size="lg" />

            <div className="gd-classic-level-title-wrap">
              <h1 className="gd-classic-level-title">{level.title}</h1>
            </div>

            <div className="gd-classic-level-stars">
              <span className="gd-classic-level-stars-count">{getDisplayedStars(level)}</span>
              <span className="gd-classic-level-stars-mark" aria-hidden="true" />
            </div>
          </div>

          <div className="gd-classic-level-coins" aria-hidden="true">
            <span className="gd-classic-level-coin" />
            <span className="gd-classic-level-coin" />
            <span className="gd-classic-level-coin" />
          </div>
        </Link>

        <div className="gd-classic-level-bars">
          <ProgressLane label="Normal Mode" progress={0} />
          <ProgressLane label="Practice Mode" progress={0} />
        </div>

        <Link
          to={`/levels/${level.slug}`}
          className="gd-classic-soundtrack-button"
          aria-label={`Open details for ${level.title}`}
        >
          Stage Briefing
        </Link>
      </div>
    </div>
  );
}

function ProgressLane({
  label,
  progress,
}: {
  label: string;
  progress: number;
}) {
  return (
    <div className="gd-classic-progress-group">
      <p className="gd-classic-progress-label">{label}</p>
      <div className="gd-classic-progress-track">
        <div className="gd-classic-progress-fill" style={{ width: `${progress}%` }} />
        <span className="gd-classic-progress-value">{progress}%</span>
      </div>
    </div>
  );
}
