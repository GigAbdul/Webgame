import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { resolveLevelMusic } from '../features/game/level-music';
import { apiRequest } from '../services/api';
import type { Level } from '../types/models';

type FilterMode = 'ALL' | 'DRAFTS' | 'QUEUE';

const FILTER_OPTIONS: Array<{ id: FilterMode; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'DRAFTS', label: 'Drafts' },
  { id: 'QUEUE', label: 'Queue' },
];

function formatUpdatedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getLevelStatusCopy(level: Level) {
  if (level.isOfficial || level.status === 'OFFICIAL') {
    return 'Official';
  }

  if (level.status === 'SUBMITTED') {
    return 'In Review';
  }

  if (level.status === 'ARCHIVED') {
    return 'Archived';
  }

  return 'Draft';
}

function getVerificationCopy(level: Level) {
  if (level.isOfficial || level.status === 'OFFICIAL') {
    return 'Official';
  }

  if (level.status === 'SUBMITTED') {
    return 'In Review';
  }

  if (level.status === 'ARCHIVED') {
    return 'Archived';
  }

  return 'Unverified';
}

function getLengthCopy(lengthUnits: number) {
  if (lengthUnits <= 120) {
    return 'Tiny';
  }

  if (lengthUnits <= 180) {
    return 'Short';
  }

  if (lengthUnits <= 260) {
    return 'Medium';
  }

  if (lengthUnits <= 360) {
    return 'Long';
  }

  return 'XL';
}

function matchesFilter(level: Level, filterMode: FilterMode) {
  if (filterMode === 'DRAFTS') {
    return level.status === 'DRAFT';
  }

  if (filterMode === 'QUEUE') {
    return level.status !== 'DRAFT';
  }

  return true;
}

function MyLevelsBackIcon() {
  return (
    <svg viewBox="0 0 64 64" className="gd-my-levels-icon-svg" aria-hidden="true">
      <path
        d="M41 14 19 32l22 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 32h26" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function MyLevelsSearchIcon() {
  return (
    <svg viewBox="0 0 64 64" className="gd-my-levels-icon-svg" aria-hidden="true">
      <circle cx="27" cy="27" r="14" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M38 38l12 12" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

function MyLevelsFolderIcon() {
  return (
    <svg viewBox="0 0 88 64" className="gd-my-levels-icon-svg" aria-hidden="true">
      <path
        d="M8 20h22l7-8h16c3.8 0 7 3.2 7 7v5H8Z"
        fill="#ffd44a"
        stroke="#0f1b31"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M6 22h76v30c0 3.3-2.7 6-6 6H12c-3.3 0-6-2.7-6-6Z"
        fill="url(#folderBody)"
        stroke="#0f1b31"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="folderBody" x1="44" y1="22" x2="44" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd44a" />
          <stop offset="1" stopColor="#ffb624" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MyLevelsCardIcon() {
  return (
    <svg viewBox="0 0 64 64" className="gd-my-levels-icon-svg" aria-hidden="true">
      <rect x="12" y="10" width="40" height="44" rx="8" fill="#8c4f1d" stroke="#5d3415" strokeWidth="4" />
      <rect x="18" y="16" width="28" height="32" rx="6" fill="#b77535" />
      <circle cx="32" cy="30" r="8" fill="#2bcfff" />
      <path d="M23 18h18M23 42h18" fill="none" stroke="#f9dfc0" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function MyLevelsPlusIcon() {
  return (
    <svg viewBox="0 0 64 64" className="gd-my-levels-icon-svg" aria-hidden="true">
      <path d="M32 14v36M14 32h36" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function MyLevelsTrashIcon() {
  return (
    <svg viewBox="0 0 64 64" className="gd-my-levels-icon-svg" aria-hidden="true">
      <path d="M22 16h20l2 6H20l2-6Z" fill="#f6f8fc" stroke="#343434" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M18 22h28v28c0 3-2 5-5 5H23c-3 0-5-2-5-5Z" fill="#cdced4" stroke="#343434" strokeWidth="4" strokeLinejoin="round" />
      <path d="M25 28v18M32 28v18M39 28v18" fill="none" stroke="#343434" strokeWidth="4" strokeLinecap="round" />
      <path d="M16 22h32" fill="none" stroke="#343434" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

function MyLevelsSelectAllIcon() {
  return (
    <svg viewBox="0 0 64 64" className="gd-my-levels-icon-svg" aria-hidden="true">
      <rect x="10" y="12" width="16" height="16" rx="3" fill="#ffffff" stroke="#3d3d3d" strokeWidth="4" />
      <rect x="10" y="36" width="16" height="16" rx="3" fill="#ffffff" stroke="#3d3d3d" strokeWidth="4" />
      <path d="M35 20h18M35 44h18" fill="none" stroke="#3d3d3d" strokeWidth="6" strokeLinecap="round" />
      <path d="m13 21 5 5 10-11" fill="none" stroke="#64cd22" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13 45 5 5 10-11" fill="none" stroke="#64cd22" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MyLevelsClockIcon() {
  return (
    <svg viewBox="0 0 48 48" className="gd-my-levels-icon-svg" aria-hidden="true">
      <circle cx="24" cy="24" r="18" fill="#ffffff" stroke="#111316" strokeWidth="4" />
      <path d="M24 13v12l7 6" fill="none" stroke="#111316" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 8v4M24 36v4M8 24h4M36 24h4" fill="none" stroke="#111316" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function MyLevelsMusicIcon() {
  return (
    <svg viewBox="0 0 48 48" className="gd-my-levels-icon-svg" aria-hidden="true">
      <path d="M18 10v20c0 3-2.3 5.5-5.5 5.5S7 33 7 30s2.3-5.5 5.5-5.5c1.1 0 2.2.3 3.2.8V13.8l18-4.3v17.7c0 3-2.3 5.5-5.5 5.5S22.7 30 22.7 27s2.3-5.5 5.5-5.5c1.1 0 2.1.3 3 .7V12.7Z" fill="#ffffff" stroke="#111316" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function MyLevelsInfoIcon() {
  return (
    <svg viewBox="0 0 48 48" className="gd-my-levels-icon-svg" aria-hidden="true">
      <circle cx="24" cy="24" r="18" fill="url(#infoFill)" stroke="#0d1a26" strokeWidth="4" />
      <path d="M24 21v12M24 15h.01" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      <defs>
        <linearGradient id="infoFill" x1="24" y1="6" x2="24" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#56fbff" />
          <stop offset="1" stopColor="#00b7ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MyLevelsCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="gd-my-levels-icon-svg" aria-hidden="true">
      <path d="m5 12 4.2 4.2L19 6.4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MyLevelsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
  const [searchValue, setSearchValue] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [checkedLevelIds, setCheckedLevelIds] = useState<string[]>([]);

  const levelsQuery = useQuery({
    queryKey: ['my-levels'],
    queryFn: () => apiRequest<{ levels: Level[] }>('/api/levels/mine'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) =>
      Promise.all(
        ids.map((id) =>
          apiRequest(`/api/levels/${id}`, {
            method: 'DELETE',
          }),
        ),
      ),
    onSuccess: async () => {
      setCheckedLevelIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-levels'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ]);
    },
  });

  const levels = levelsQuery.data?.levels ?? [];
  const trimmedSearch = searchValue.trim().toLowerCase();
  const currentFilterLabel = FILTER_OPTIONS.find((filter) => filter.id === filterMode)?.label ?? 'All';
  const filteredLevels = levels.filter((level) => {
    if (!matchesFilter(level, filterMode)) {
      return false;
    }

    if (!trimmedSearch) {
      return true;
    }

    return level.title.toLowerCase().includes(trimmedSearch);
  });
  const mutableFilteredLevels = filteredLevels.filter((level) => !level.isOfficial && level.status !== 'OFFICIAL');
  const mutableFilteredLevelIds = mutableFilteredLevels.map((level) => level.id);
  const checkedVisibleLevelIds = checkedLevelIds.filter((id) => mutableFilteredLevelIds.includes(id));
  const allVisibleLevelsChecked = Boolean(mutableFilteredLevelIds.length) && mutableFilteredLevelIds.every((id) => checkedLevelIds.includes(id));
  const selectedLevel = filteredLevels.find((level) => level.id === selectedLevelId) ?? null;

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    searchInputRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    const visibleIds = new Set(mutableFilteredLevelIds);
    setCheckedLevelIds((current) => {
      const next = current.filter((id) => visibleIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [mutableFilteredLevelIds]);

  useEffect(() => {
    if (!filteredLevels.length) {
      if (selectedLevelId !== null) {
        setSelectedLevelId(null);
      }
      return;
    }

    const hasSelectedLevel = filteredLevels.some((level) => level.id === selectedLevelId);
    if (!hasSelectedLevel) {
      setSelectedLevelId(filteredLevels[0].id);
    }
  }, [filteredLevels, selectedLevelId]);

  const openSelectedCard = () => {
    if (!selectedLevel) {
      return;
    }

    navigate(`/my-levels/${selectedLevel.id}`);
  };

  const handleDeleteSelected = () => {
    if (!checkedVisibleLevelIds.length) {
      return;
    }

    deleteMutation.mutate(checkedVisibleLevelIds);
  };

  const toggleLevelChecked = (levelId: string) => {
    setCheckedLevelIds((current) => (current.includes(levelId) ? current.filter((id) => id !== levelId) : [...current, levelId]));
  };

  const toggleSelectAllVisible = () => {
    if (!mutableFilteredLevelIds.length) {
      return;
    }

    setCheckedLevelIds((current) => {
      if (mutableFilteredLevelIds.every((id) => current.includes(id))) {
        return current.filter((id) => !mutableFilteredLevelIds.includes(id));
      }

      return Array.from(new Set([...current, ...mutableFilteredLevelIds]));
    });
  };

  return (
    <div className="gd-my-levels-page">
      <div className="gd-my-levels-scene" aria-hidden="true">
        <div className="gd-my-levels-grid" />
        <div className="gd-my-levels-corner gd-my-levels-corner--left" />
        <div className="gd-my-levels-corner gd-my-levels-corner--right" />
      </div>

      <Link to="/" className="gd-my-levels-side-arrow" aria-label="Back to home">
        <span className="gd-my-levels-side-arrow-icon">
          <MyLevelsBackIcon />
        </span>
      </Link>

      <button
        type="button"
        className="gd-my-levels-square-button gd-my-levels-square-button--search"
        onClick={() => {
          if (isSearchOpen) {
            setIsSearchOpen(false);
            setSearchValue('');
            return;
          }

          setIsSearchOpen(true);
        }}
        aria-label={isSearchOpen ? 'Hide search' : 'Search levels'}
        aria-pressed={isSearchOpen}
      >
        <span className="gd-my-levels-search-icon">
          <MyLevelsSearchIcon />
        </span>
      </button>

      <div className="gd-my-levels-folder-counter" aria-label={`${filteredLevels.length} levels in this view`}>
        <span className="gd-my-levels-folder-icon" aria-hidden="true">
          <MyLevelsFolderIcon />
        </span>
        <span className="gd-my-levels-folder-count">{filteredLevels.length}</span>
      </div>

      <button
        type="button"
        className="gd-my-levels-round-button gd-my-levels-round-button--card"
        onClick={openSelectedCard}
        disabled={!selectedLevel}
        aria-label="Open selected level card"
      >
        <span className="gd-my-levels-book-icon" aria-hidden="true">
          <MyLevelsCardIcon />
        </span>
        <span className="gd-my-levels-round-button-copy">Card</span>
      </button>

      <button
        type="button"
        className="gd-my-levels-round-button gd-my-levels-round-button--new"
        onClick={() => navigate('/my-levels/new')}
        aria-label="Create a new level"
      >
        <span className="gd-my-levels-plus-icon" aria-hidden="true">
          <MyLevelsPlusIcon />
        </span>
        <span className="gd-my-levels-round-button-copy">New</span>
      </button>

      <div className="gd-my-levels-shell">
        <section className="gd-my-levels-frame">
          <header className="gd-my-levels-titlebar">
            <h1 className="gd-my-levels-title">MY LEVELS</h1>
          </header>

          <div className="gd-my-levels-board">
            {isSearchOpen ? (
              <div className="gd-my-levels-search-row">
                <input
                  ref={searchInputRef}
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  className="gd-my-levels-search-input"
                  placeholder="Search by level title"
                  aria-label="Search levels by title"
                />

                {searchValue ? (
                  <button
                    type="button"
                    className="gd-my-levels-search-clear"
                    onClick={() => setSearchValue('')}
                    aria-label="Clear search"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            ) : null}

            {levelsQuery.isLoading ? (
              <div className="gd-my-levels-feedback">
                <p>Loading your levels...</p>
              </div>
            ) : null}

            {levelsQuery.isError ? (
              <div className="gd-my-levels-feedback gd-my-levels-feedback--action">
                <p>Could not load your levels.</p>
                <button type="button" className="gd-my-levels-empty-button" onClick={() => void levelsQuery.refetch()}>
                  Retry
                </button>
              </div>
            ) : null}

            {!levelsQuery.isLoading && !levelsQuery.isError && filteredLevels.length ? (
              <div className="gd-my-levels-list" role="listbox" aria-label="My levels" aria-multiselectable="true">
                {filteredLevels.map((level) => {
                  const isSelected = level.id === selectedLevelId;
                  const isChecked = checkedLevelIds.includes(level.id);
                  const musicLabel = resolveLevelMusic(level.dataJson.meta).label;
                  const levelLength = getLengthCopy(level.dataJson.meta.lengthUnits);
                  const verificationCopy = getVerificationCopy(level);
                  const canDeleteLevel = !level.isOfficial && level.status !== 'OFFICIAL';
                  const rowTone =
                    level.isOfficial || level.status === 'OFFICIAL'
                      ? 'is-official'
                      : level.status === 'DRAFT'
                        ? 'is-draft'
                        : 'is-queue';

                  return (
                    <article
                      key={level.id}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      className={`gd-my-levels-row ${rowTone}${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setSelectedLevelId(level.id)}
                      onDoubleClick={() => navigate(`/my-levels/${level.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedLevelId(level.id);
                        }
                      }}
                    >
                      <div className="gd-my-levels-row-main">
                        <span className="gd-my-levels-row-title">{level.title}</span>
                        <div className="gd-my-levels-row-stats">
                          <span className="gd-my-levels-row-stat">
                            <span className="gd-my-levels-row-stat-icon" aria-hidden="true">
                              <MyLevelsClockIcon />
                            </span>
                            <span>{levelLength}</span>
                          </span>
                          <span className="gd-my-levels-row-stat">
                            <span className="gd-my-levels-row-stat-icon" aria-hidden="true">
                              <MyLevelsMusicIcon />
                            </span>
                            <span>{musicLabel}</span>
                          </span>
                          <span className="gd-my-levels-row-stat">
                            <span className="gd-my-levels-row-stat-icon" aria-hidden="true">
                              <MyLevelsInfoIcon />
                            </span>
                            <span>{verificationCopy}</span>
                          </span>
                        </div>
                        <span className="gd-my-levels-row-copy">
                          {getLevelStatusCopy(level)} | Updated {formatUpdatedDate(level.updatedAt)}
                        </span>
                      </div>

                      <div className="gd-my-levels-row-actions">
                        <button
                          type="button"
                          className={`gd-my-levels-row-check${isChecked ? ' is-checked' : ''}`}
                          aria-label={isChecked ? `Unselect ${level.title}` : `Select ${level.title}`}
                          aria-pressed={isChecked}
                          disabled={!canDeleteLevel}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleLevelChecked(level.id);
                          }}
                        >
                          {isChecked ? (
                            <span className="gd-my-levels-row-check-icon" aria-hidden="true">
                              <MyLevelsCheckIcon />
                            </span>
                          ) : null}
                        </button>

                        <button
                          type="button"
                          className="gd-my-levels-row-view"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/my-levels/${level.id}`);
                          }}
                        >
                          View
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {!levelsQuery.isLoading && !levelsQuery.isError && !filteredLevels.length ? (
              <div className="gd-my-levels-empty">
                {trimmedSearch ? (
                  <p className="gd-my-levels-empty-copy">
                    No levels match <span className="gd-my-levels-empty-token">"{searchValue.trim()}"</span>.
                  </p>
                ) : filterMode === 'QUEUE' ? (
                  <p className="gd-my-levels-empty-copy">
                    Nothing has reached the <span className="gd-my-levels-empty-token">queue</span> yet.
                  </p>
                ) : (
                  <p className="gd-my-levels-empty-copy">
                    Tap <span className="gd-my-levels-empty-token gd-my-levels-empty-token--green">new</span> to
                    create a <span className="gd-my-levels-empty-token gd-my-levels-empty-token--blue">level</span>!
                  </p>
                )}

                <button
                  type="button"
                  className="gd-my-levels-empty-button"
                  onClick={() => {
                    if (trimmedSearch) {
                      setSearchValue('');
                      return;
                    }

                    navigate('/my-levels/new');
                  }}
                >
                  {trimmedSearch ? 'Clear Search' : 'Create Level'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="gd-my-levels-bottom">
            <button
              type="button"
              className="gd-my-levels-mini-button gd-my-levels-mini-button--delete"
              onClick={handleDeleteSelected}
              disabled={!checkedVisibleLevelIds.length || deleteMutation.isPending}
              aria-label="Delete selected levels"
            >
              <span className="gd-my-levels-trash-icon" aria-hidden="true">
                <MyLevelsTrashIcon />
              </span>
            </button>

              <button
                type="button"
                className="gd-my-levels-mini-button gd-my-levels-mini-button--select"
                onClick={toggleSelectAllVisible}
                disabled={!mutableFilteredLevelIds.length}
                aria-label={allVisibleLevelsChecked ? 'Clear selected levels' : 'Select all visible levels'}
              >
              <span className="gd-my-levels-edit-icon" aria-hidden="true">
                <MyLevelsSelectAllIcon />
              </span>
            </button>

            <div className="gd-my-levels-filter-bar" role="tablist" aria-label="Level filters">
              {FILTER_OPTIONS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={filterMode === filter.id}
                  className={`gd-my-levels-filter-button${filterMode === filter.id ? ' is-active' : ''}`}
                  onClick={() => setFilterMode(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="gd-my-levels-bottom-core" aria-hidden="true" />

            <div className="gd-my-levels-bottom-copy">
              {checkedVisibleLevelIds.length
                ? `${checkedVisibleLevelIds.length} selected for deletion`
                : selectedLevel
                ? `${selectedLevel.title} - ${getLevelStatusCopy(selectedLevel)}`
                : `${currentFilterLabel} - ${filteredLevels.length} levels`}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
