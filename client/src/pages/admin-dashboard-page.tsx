import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Panel } from '../components/ui';
import { apiRequest } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../utils/cn';

const adminToolCards = [
  {
    title: 'Review Queue',
    eyebrow: 'Moderation',
    description: 'Проверка сабмитов, official status, архивирование и publish controls.',
    route: '/admin/levels',
    accent: 'Queue',
  },
  {
    title: 'Official Forge',
    eyebrow: 'Build',
    description: 'Создание нового official-драфта и быстрый переход в редактор.',
    route: '/admin/create-official',
    accent: 'Create',
  },
  {
    title: 'Player Skin Lab',
    eyebrow: 'Cosmetics',
    description: 'Редактор скинов с preview-run, слоями и быстрым сохранением.',
    route: '/admin/player-skins',
    accent: 'Skins',
  },
  {
    title: 'Users',
    eyebrow: 'Accounts',
    description: 'Просмотр пользователей, ролей и состояния аккаунтов.',
    route: '/admin/users',
    accent: 'Users',
  },
] as const;

export function AdminDashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () =>
      apiRequest<{ stats: { users: number; levels: number; officialLevels: number; submittedLevels: number } }>(
        '/api/admin/stats',
      ),
  });

  const stats = statsQuery.data?.stats;
  const statusCards = useMemo(
    () => [
      {
        label: 'Users',
        value: stats?.users ?? '-',
        note: 'Accounts visible',
      },
      {
        label: 'Levels',
        value: stats?.levels ?? '-',
        note: 'Total stages',
      },
      {
        label: 'Official',
        value: stats?.officialLevels ?? '-',
        note: 'Published canon',
      },
      {
        label: 'Submitted',
        value: stats?.submittedLevels ?? '-',
        note: 'Needs review',
      },
    ],
    [stats],
  );

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Admin Room</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              Control
              <br />
              Room
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-white/82">
              Единая админ-панель в стиле skin lab: быстрые модули, сводка по очереди и прямой вход в рабочие
              инструменты без лишних переходов.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Moderation</p>
              <p className="mt-2 font-display text-xl text-white">
                {statsQuery.isLoading ? 'Loading...' : `${stats?.submittedLevels ?? 0} queued`}
              </p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Official Ops</p>
              <p className="mt-2 font-display text-xl text-white">
                {statsQuery.isLoading ? 'Loading...' : `${stats?.officialLevels ?? 0} live`}
              </p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Skin Pipeline</p>
              <p className="mt-2 font-display text-xl text-white">Editor Ready</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Quick Launch</p>
              <p className="mt-2 font-display text-xl text-white">4 modules</p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-4">
        {statusCards.map((card) => (
          <div key={card.label} className="game-stat px-4 py-4">
            <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">{card.label}</p>
            <p className="mt-2 font-display text-2xl text-white">{card.value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/58">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Panel className="game-screen bg-transparent">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="arcade-eyebrow">Admin Tools</p>
                <h3 className="font-display text-3xl text-white">Launch Modules</h3>
              </div>
              <Link
                to="/"
                className="rounded-[18px] border-[3px] border-[#163057] bg-[#0e1d36] px-4 py-2 text-xs uppercase tracking-[0.16em] text-white transition hover:brightness-110"
              >
                Back Home
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {adminToolCards.map((tool) => (
                <Link
                  key={tool.route}
                  to={tool.route}
                  className={cn(
                    'rounded-[24px] border-[4px] border-[#0f1b31] bg-[#12203c] px-4 py-4 text-left text-white transition hover:-translate-y-0.5 hover:border-[#caff45] hover:brightness-110',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-[#ffd44a]">{tool.eyebrow}</p>
                      <h4 className="mt-2 font-display text-2xl">{tool.title}</h4>
                    </div>
                    <Badge tone="accent">{tool.accent}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/76">{tool.description}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#79f7ff]">{tool.route}</p>
                </Link>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="game-screen bg-transparent">
          <div className="space-y-4">
            <div>
              <p className="arcade-eyebrow">Ops Notes</p>
              <h3 className="font-display text-3xl text-white">Workflow</h3>
            </div>

            <div className="rounded-[24px] border-[4px] border-[#0f1b31] bg-[#101a30] px-5 py-5">
              <div className="space-y-3 text-sm leading-7 text-white/78">
                <p>Review Queue ведёт к модерации пользовательских сабмитов и official-публикации.</p>
                <p>Official Forge создаёт новый админский драфт и сразу открывает рабочий пайплайн уровня.</p>
                <p>Player Skin Lab отвечает за визуалы cube, ball, ship и arrow с live test preview.</p>
                <p>Users нужен для ручной проверки аккаунтов и общей диагностики активности.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="game-stat px-4 py-4">
                <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Queue Health</p>
                <p className="mt-2 font-display text-xl text-white">
                  {statsQuery.isLoading ? 'Loading...' : (stats?.submittedLevels ?? 0) > 0 ? 'Attention' : 'Clear'}
                </p>
              </div>
              <div className="game-stat px-4 py-4">
                <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">System</p>
                <p className="mt-2 font-display text-xl text-white">
                  {statsQuery.isLoading ? 'Syncing...' : 'Ready'}
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
