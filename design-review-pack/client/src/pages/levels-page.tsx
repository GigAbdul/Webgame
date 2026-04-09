import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, Panel } from '../components/ui';
import { LevelCard } from '../features/levels/level-card';
import { formatStageNumber } from '../features/levels/level-presentation';
import { apiRequest } from '../services/api';
import type { Level } from '../types/models';

export function LevelsPage() {
  const levelsQuery = useQuery({
    queryKey: ['official-levels'],
    queryFn: () => apiRequest<{ levels: Level[] }>('/api/levels/official'),
  });

  const levels = levelsQuery.data?.levels;
  const levelList = levels ?? [];
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const stripRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const initializedRef = useRef(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!levels?.length) {
      initializedRef.current = false;
      setSelectedIndex(0);
      return;
    }

    if (initializedRef.current) {
      return;
    }

    const initialIndex = Math.max(
      0,
      levels.findIndex((level) => level.featured),
    );

    initializedRef.current = true;
    setSelectedIndex(initialIndex);

    requestAnimationFrame(() => {
      cardRefs.current[initialIndex]?.scrollIntoView({
        behavior: 'auto',
        inline: 'center',
        block: 'nearest',
      });
      stripRefs.current[initialIndex]?.scrollIntoView({
        behavior: 'auto',
        inline: 'center',
        block: 'nearest',
      });
    });
  }, [levels]);

  const scrollToIndex = (index: number) => {
    if (!levelList.length) {
      return;
    }

    const nextIndex = Math.max(0, Math.min(levelList.length - 1, index));
    setSelectedIndex(nextIndex);

    cardRefs.current[nextIndex]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
    stripRefs.current[nextIndex]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  };

  const handleScroll = () => {
    const container = scrollRef.current;

    if (!container || !levelList.length) {
      return;
    }

    const viewportCenter = container.scrollLeft + container.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cardRefs.current.forEach((card, index) => {
      if (!card) {
        return;
      }

      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(cardCenter - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== selectedIndex) {
      setSelectedIndex(closestIndex);
      stripRefs.current[closestIndex]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Panel className="gd-level-select-screen game-screen bg-transparent p-0">
        {levelsQuery.isLoading ? (
          <div className="gd-level-select-loading">
            <p className="font-display text-sm tracking-[0.24em] text-white/78">Loading official routes...</p>
          </div>
        ) : null}

        {!levelsQuery.isLoading && !levelList.length ? (
          <div className="p-6">
            <EmptyState
              title="No official levels yet"
              description="Publish a route through the admin flow and it will appear here as a launchable official stage."
            />
          </div>
        ) : null}

        {levelList.length ? (
          <div className="gd-level-select-layout">
            <div className="gd-level-select-frame">
              <button
                type="button"
                className="gd-level-selector-nav is-left"
                onClick={() => scrollToIndex(selectedIndex - 1)}
                disabled={selectedIndex <= 0}
                aria-label="Previous level"
              >
                <span>&lt;</span>
              </button>

              <div className="gd-level-scroll-shell">
                <div ref={scrollRef} className="gd-level-scroll scrollbar-soft" onScroll={handleScroll}>
                  {levelList.map((level, index) => (
                    <div
                      key={level.id}
                      ref={(node) => {
                        cardRefs.current[index] = node;
                      }}
                      className="gd-level-slide"
                    >
                      <LevelCard level={level} index={index} selected={index === selectedIndex} />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="gd-level-selector-nav is-right"
                onClick={() => scrollToIndex(selectedIndex + 1)}
                disabled={selectedIndex >= levelList.length - 1}
                aria-label="Next level"
              >
                <span>&gt;</span>
              </button>
            </div>

            <div className="gd-level-selector-dots" aria-label="Level position">
              {levelList.map((level, index) => (
                <button
                  key={`${level.id}-dot`}
                  type="button"
                  className={`gd-level-selector-dot${index === selectedIndex ? ' is-active' : ''}`}
                  onClick={() => scrollToIndex(index)}
                  aria-label={`Go to ${level.title}`}
                />
              ))}
            </div>

            <div className="gd-level-selector-strip scrollbar-soft">
              {levelList.map((level, index) => (
                <button
                  key={`${level.id}-chip`}
                  ref={(node) => {
                    stripRefs.current[index] = node;
                  }}
                  type="button"
                  className={`gd-level-selector-strip-chip${index === selectedIndex ? ' is-active' : ''}`}
                  onClick={() => scrollToIndex(index)}
                >
                  <span className="gd-level-selector-strip-number">{formatStageNumber(index)}</span>
                  <span className="truncate">{level.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
