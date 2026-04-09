import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { DifficultyIcon } from '../features/levels/difficulty-icon';
import { getDisplayedStars } from '../features/levels/level-presentation';
import { apiRequest } from '../services/api';
import type { Level } from '../types/models';

export function LevelsPage() {
  const levelsQuery = useQuery({
    queryKey: ['official-levels'],
    queryFn: () => apiRequest<{ levels: Level[] }>('/api/levels/official'),
  });

  const levelList = levelsQuery.data?.levels ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const initializedRef = useRef(false);
  const selectedLevel = levelList[selectedIndex] ?? null;

  useEffect(() => {
    if (!levelList.length) {
      initializedRef.current = false;
      setSelectedIndex(0);
      return;
    }

    if (initializedRef.current) {
      setSelectedIndex((current) => Math.min(current, levelList.length - 1));
      return;
    }

    const featuredIndex = levelList.findIndex((level) => level.featured);
    initializedRef.current = true;
    setSelectedIndex(featuredIndex >= 0 ? featuredIndex : 0);
  }, [levelList]);

  useEffect(() => {
    if (!levelList.length) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedIndex((current) => (current <= 0 ? levelList.length - 1 : current - 1));
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedIndex((current) => (current >= levelList.length - 1 ? 0 : current + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [levelList]);

  const selectNextLevel = () => {
    if (!levelList.length) {
      return;
    }

    setSelectedIndex((current) => (current >= levelList.length - 1 ? 0 : current + 1));
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

      {selectedLevel ? (
        <>
          <Link
            to={`/play/${selectedLevel.slug}`}
            className="gd-classic-play-button"
            aria-label={`Play ${selectedLevel.title}`}
          >
            <span className="gd-classic-play-button-icon" />
          </Link>

          <Link to="/" className="gd-classic-back-button" aria-label="Back to home">
            <span className="gd-classic-back-button-icon" />
          </Link>

          <button
            type="button"
            className="gd-classic-next-button"
            onClick={selectNextLevel}
            aria-label="Next level"
          >
            &gt;&gt;
          </button>

          <div className="gd-classic-level-shell">
            <section className="gd-classic-level-hero">
              <div className="gd-classic-level-hero-main">
                <DifficultyIcon difficulty={selectedLevel.difficulty} size="lg" />

                <div className="gd-classic-level-title-wrap">
                  <h1 className="gd-classic-level-title">{selectedLevel.title}</h1>
                </div>

                <div className="gd-classic-level-stars">
                  <span className="gd-classic-level-stars-count">{getDisplayedStars(selectedLevel)}</span>
                  <span className="gd-classic-level-stars-mark" aria-hidden="true" />
                </div>
              </div>

              <div className="gd-classic-level-coins" aria-hidden="true">
                <span className="gd-classic-level-coin" />
                <span className="gd-classic-level-coin" />
                <span className="gd-classic-level-coin" />
              </div>
            </section>

            <div className="gd-classic-level-bars">
              <ProgressLane label="Normal Mode" progress={0} />
              <ProgressLane label="Practice Mode" progress={0} />
            </div>

            <Link
              to={`/levels/${selectedLevel.slug}`}
              className="gd-classic-soundtrack-button"
              aria-label={`Open details for ${selectedLevel.title}`}
            >
              Download The Soundtracks
            </Link>

            <div className="gd-classic-level-dots" aria-label="Level selection">
              {levelList.map((level, index) => (
                <button
                  key={`${level.id}-dot`}
                  type="button"
                  className={`gd-classic-level-dot${index === selectedIndex ? ' is-active' : ''}`}
                  onClick={() => setSelectedIndex(index)}
                  aria-label={`Go to ${level.title}`}
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

      {!levelsQuery.isLoading && !selectedLevel ? (
        <div className="gd-classic-level-feedback">
          <p>No official levels yet.</p>
        </div>
      ) : null}
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
