import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, FieldLabel, Input, Panel, Select, Textarea } from '../components/ui';
import { GameCanvas } from '../features/game/game-canvas';
import { DifficultyIcon } from '../features/levels/difficulty-icon';
import {
  difficultyOptions,
  getDifficultyPresentation,
  getDifficultyStars,
  getDisplayedStars,
} from '../features/levels/level-presentation';
import { apiRequest } from '../services/api';
import type { Difficulty, Level, LevelStatus } from '../types/models';
import { SystemStatePage } from './system-state-page';

const statuses: LevelStatus[] = ['DRAFT', 'SUBMITTED', 'OFFICIAL', 'ARCHIVED'];

export function AdminLevelPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'NORMAL' as Difficulty,
    status: 'DRAFT' as LevelStatus,
    featured: false,
    isVisible: true,
  });

  const levelQuery = useQuery({
    queryKey: ['admin-level', id],
    queryFn: () => apiRequest<{ level: Level }>(`/api/admin/levels/${id}`),
    enabled: Boolean(id),
  });

  useEffect(() => {
    const level = levelQuery.data?.level;

    if (!level) {
      return;
    }

    setForm({
      title: level.title,
      description: level.description,
      difficulty: level.difficulty ?? 'NORMAL',
      status: level.status,
      featured: level.featured,
      isVisible: level.isVisible,
    });
  }, [levelQuery.data?.level]);

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/levels/${id}/official-settings`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-level', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-levels'] });
      void queryClient.invalidateQueries({ queryKey: ['official-levels'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/levels/${id}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({
          difficulty: form.difficulty,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-level', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-levels'] });
      void queryClient.invalidateQueries({ queryKey: ['official-levels'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/levels/${id}/archive`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-level', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-levels'] });
      void queryClient.invalidateQueries({ queryKey: ['official-levels'] });
    },
  });

  const recalcMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/levels/${id}/recalculate-stars`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-level', id] });
    },
  });

  const level = levelQuery.data?.level;
  const activeDifficulty = level?.difficulty ?? form.difficulty;
  const difficultyPreview = getDifficultyPresentation(activeDifficulty);
  const previewStars = getDifficultyStars(activeDifficulty);
  const displayedLevelStars = level ? getDisplayedStars(level) : previewStars;

  if (levelQuery.isLoading) {
    return (
      <SystemStatePage
        eyebrow="Control Room"
        title="Loading"
        description="Fetching moderation controls, preview data, current status, and reward settings."
      />
    );
  }

  if (!level) {
    return (
      <SystemStatePage
        eyebrow="Control Room"
        title="Level Missing"
        description="This admin level record could not be opened. Return to the queue and choose another submission."
        primaryAction={{ label: 'Admin Levels', to: '/admin/levels' }}
        secondaryAction={{ label: 'Dashboard', to: '/admin' }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-8">
          <div className="admin-hero">
            <p className="arcade-eyebrow">Control Room</p>

            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <DifficultyIcon difficulty={activeDifficulty} size="lg" showStars />

              <div className="space-y-4">
                <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
                  {level.title}
                </h2>
                <p className="max-w-2xl text-sm leading-8 text-white/82">{level.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={level.isOfficial ? 'success' : 'default'}>{level.status}</Badge>
                  <Badge tone="accent">{level.author?.username ?? 'Unknown Author'}</Badge>
                  <Badge>{difficultyPreview.label}</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Stars</p>
              <p className="mt-2 font-display text-4xl text-white">{displayedLevelStars}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Difficulty</p>
              <p className="mt-2 font-display text-xl text-white">{difficultyPreview.label}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Theme</p>
              <p className="mt-2 font-display text-xl text-white">{level.theme}</p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <GameCanvas levelData={level.dataJson} attemptNumber={1} autoRestartOnFail className="h-fit" />

        <div className="control-room-grid">
          <Panel className="game-screen bg-transparent">
            <div className="space-y-4">
              <div>
                <p className="arcade-eyebrow">Official Settings</p>
                <h3 className="font-display text-3xl text-white">Moderation Controls</h3>
              </div>

              <div>
                <FieldLabel>Title</FieldLabel>
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </div>

              <div>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Difficulty</FieldLabel>
                  <Select
                    value={form.difficulty}
                    onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as Difficulty }))}
                  >
                    {difficultyOptions.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {getDifficultyPresentation(difficulty).label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <FieldLabel>Stars Reward</FieldLabel>
                  <div className="game-stat min-h-[56px] px-4 py-3">
                    <p className="font-display text-2xl text-white">{previewStars}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LevelStatus }))}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="toggle-row pt-7">
                  <label className="toggle-box">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))}
                    />
                    <span className="text-sm text-white/82">Featured slot</span>
                  </label>

                  <label className="toggle-box">
                    <input
                      type="checkbox"
                      checked={form.isVisible}
                      onChange={(event) => setForm((current) => ({ ...current, isVisible: event.target.checked }))}
                    />
                    <span className="text-sm text-white/82">Visible in catalog</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => saveSettingsMutation.mutate()}>Save Settings</Button>
                <Button variant="secondary" onClick={() => publishMutation.mutate()}>
                  Publish Official
                </Button>
                <Button variant="danger" onClick={() => archiveMutation.mutate()}>
                  Archive
                </Button>
                <Button variant="ghost" onClick={() => recalcMutation.mutate()}>
                  Recalculate Stars
                </Button>
              </div>
            </div>
          </Panel>

          <Panel className="game-screen bg-transparent">
            <div className="space-y-3">
              <p className="arcade-eyebrow">Moderation Notes</p>
              <p className="text-sm leading-7 text-white/78">
                Reward is derived from the selected difficulty icon. Every demon rank pays 10 stars, and recalculation syncs
                stored rewards plus total leaderboard values.
              </p>
              <Link to={`/editor/${level.id}`} className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a] hover:text-white">
                Open Level In Editor
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
