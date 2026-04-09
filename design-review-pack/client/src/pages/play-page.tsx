import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Button, Panel } from '../components/ui';
import { GameCanvas } from '../features/game/game-canvas';
import { getDifficultyPresentation, getDisplayedStars } from '../features/levels/level-presentation';
import { apiRequest } from '../services/api';
import type { Level } from '../types/models';

export function PlayPage() {
  const { slugOrId = '' } = useParams();
  const queryClient = useQueryClient();
  const [runId, setRunId] = useState(0);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string>('');

  const levelQuery = useQuery({
    queryKey: ['play-level', slugOrId],
    queryFn: () => apiRequest<{ level: Level }>(`/api/levels/official/${slugOrId}`),
    enabled: Boolean(slugOrId),
  });

  const startSessionMutation = useMutation({
    mutationFn: (levelId: string) =>
      apiRequest<{ session: { id: string } }>('/api/game/sessions/start', {
        method: 'POST',
        body: JSON.stringify({ levelId, clientVersion: 'dashforge-web-1' }),
      }),
    onSuccess: (payload) => {
      setActiveSessionId(payload.session.id);
    },
  });

  const failSessionMutation = useMutation({
    mutationFn: (payload: { sessionId: string; progressPercent: number }) =>
      apiRequest(`/api/game/sessions/${payload.sessionId}/fail`, {
        method: 'POST',
        body: JSON.stringify({ progressPercent: payload.progressPercent }),
      }),
  });

  const completeSessionMutation = useMutation({
    mutationFn: (payload: {
      sessionId: string;
      progressPercent: number;
      completionTimeMs: number;
    }) =>
      apiRequest<{
        starsAwarded: number;
        alreadyRewarded: boolean;
        user: { totalStars: number; completedOfficialLevels: number };
      }>(`/api/game/sessions/${payload.sessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          progressPercent: payload.progressPercent,
          completionTimeMs: payload.completionTimeMs,
        }),
      }),
    onSuccess: (payload) => {
      setResultMessage(
        payload.alreadyRewarded
          ? `Stage cleared. Reward was already claimed earlier. Total stars: ${payload.user.totalStars}.`
          : `Official clear confirmed. +${payload.starsAwarded} stars, total ${payload.user.totalStars}.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['leaderboard-me'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const startSession = startSessionMutation.mutate;

  useEffect(() => {
    if (levelQuery.data?.level.id) {
      startSession(levelQuery.data.level.id);
    }
  }, [levelQuery.data?.level.id, runId, startSession]);

  const restartRun = () => {
    setResultMessage('');
    setActiveSessionId(null);
    setAttemptNumber((current) => current + 1);
    setRunId((current) => current + 1);
  };

  if (levelQuery.isLoading) {
    return <p className="text-white/70">Loading level...</p>;
  }

  const level = levelQuery.data?.level;

  if (!level) {
    return <p className="text-white/70">Level not found.</p>;
  }

  const difficulty = getDifficultyPresentation(level.difficulty);
  const rewardStars = getDisplayedStars(level);

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Official Run</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              {level.title}
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-white/82">
              Every attempt opens a fresh server-backed run session, so this screen now behaves like a real gameplay
              launch instead of a static preview.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Difficulty</p>
              <p className="mt-2 font-display text-xl text-white">{difficulty.label}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Reward</p>
              <p className="mt-2 font-display text-4xl text-white">{rewardStars}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Attempt</p>
              <p className="mt-2 font-display text-4xl text-white">{attemptNumber}</p>
            </div>
          </div>
        </div>
      </Panel>

      {resultMessage ? (
        <Panel className="game-screen flex flex-wrap items-center justify-between gap-4 bg-transparent">
          <p className="text-sm text-white/86">{resultMessage}</p>
          <div className="flex gap-3">
            <Button onClick={restartRun}>Run Again</Button>
            <Link to="/leaderboard">
              <Button variant="secondary">View Rank</Button>
            </Link>
          </div>
        </Panel>
      ) : null}

      {activeSessionId ? (
        <GameCanvas
          key={`${activeSessionId}-${attemptNumber}`}
          levelData={level.dataJson}
          runId={activeSessionId}
          attemptNumber={attemptNumber}
          onFail={({ progressPercent }) => {
            if (activeSessionId) {
              failSessionMutation.mutate({
                sessionId: activeSessionId,
                progressPercent,
              });
            }
            restartRun();
          }}
          onComplete={({ progressPercent, completionTimeMs }) => {
            if (activeSessionId) {
              completeSessionMutation.mutate({
                sessionId: activeSessionId,
                progressPercent,
                completionTimeMs,
              });
            }
          }}
        />
      ) : (
        <Panel className="arcade-runtime-frame game-screen bg-transparent">
          <div className="space-y-4">
            <div className="arcade-runtime-bar flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-[11px] tracking-[0.24em] text-[#ffd44a]">Runtime</p>
                  <span className="arcade-button inline-flex items-center bg-[linear-gradient(180deg,#7e2ae6,#5910be)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                    syncing
                  </span>
                </div>
                <h3 className="font-display text-2xl text-[#caff45]">{level.dataJson.meta.theme}</h3>
              </div>
              <div className="flex gap-3 text-sm">
                <div className="hud-pill px-4 py-2">
                  <p className="font-display text-[10px] uppercase tracking-[0.2em] text-[#ffd44a]">Attempt</p>
                  <p className="font-display text-sm text-white">{attemptNumber}</p>
                </div>
                <div className="hud-pill px-4 py-2">
                  <p className="font-display text-[10px] uppercase tracking-[0.2em] text-[#ffd44a]">Progress</p>
                  <p className="font-display text-sm text-white">0%</p>
                </div>
                <div className="hud-pill px-4 py-2">
                  <p className="font-display text-[10px] uppercase tracking-[0.2em] text-[#ffd44a]">Time</p>
                  <p className="font-display text-sm text-white">0.0s</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="progress-lane">
                <div className="progress-lane-fill w-0" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] text-white/70">
                <span>Secure run session</span>
                <span>Retry handshake</span>
                <span>Stage preserved</span>
              </div>
            </div>

            <div className="arcade-runtime-stage">
              <div className="flex aspect-video min-h-[320px] w-full items-center justify-center border-[4px] border-white/8 bg-[#130326] px-6 text-center md:min-h-[420px]">
                <p className="font-display text-sm tracking-[0.24em] text-white/78">
                  Preparing secure gameplay session...
                </p>
              </div>
            </div>

            <p className="arcade-runtime-footer text-xs leading-6 text-white/72">
              The next official attempt is being created on the server. The stage keeps its full height here so the
              page does not jump between retries.
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}
