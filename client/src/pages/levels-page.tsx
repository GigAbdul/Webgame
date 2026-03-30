import { useQuery } from '@tanstack/react-query';
import { EmptyState, Panel } from '../components/ui';
import { LevelCard } from '../features/levels/level-card';
import { apiRequest } from '../services/api';
import type { Level } from '../types/models';

export function LevelsPage() {
  const levelsQuery = useQuery({
    queryKey: ['official-levels'],
    queryFn: () => apiRequest<{ levels: Level[] }>('/api/levels/official'),
  });

  const levels = levelsQuery.data?.levels ?? [];
  const featured = levels.filter((level) => level.featured).length;

  return (
    <div className="space-y-6">
      <Panel className="game-screen overflow-hidden bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Stage Select</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              Official
              <br />
              Levels
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-white/80">
              Выбирай уровень как в настоящем arcade menu: большие stage tiles, чёткая сложность, награда за
              первый clean clear и быстрый переход в play.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Stages</p>
              <p className="mt-2 font-display text-4xl text-white">{levels.length}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Featured</p>
              <p className="mt-2 font-display text-4xl text-white">{featured}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Reward</p>
              <p className="mt-2 font-display text-4xl text-white">Stars</p>
            </div>
          </div>
        </div>
      </Panel>

      {levelsQuery.isLoading ? (
        <Panel className="game-screen bg-transparent">
          <p className="font-display text-sm tracking-[0.24em] text-white/78">Loading official stages...</p>
        </Panel>
      ) : null}

      {levels.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {levels.map((level) => (
            <LevelCard key={level.id} level={level} />
          ))}
        </div>
      ) : null}

      {!levelsQuery.isLoading && !levels.length ? (
        <EmptyState
          title="No official levels yet"
          description="Сначала опубликуй уровень через admin moderation flow, и он сразу появится в stage select."
        />
      ) : null}
    </div>
  );
}
