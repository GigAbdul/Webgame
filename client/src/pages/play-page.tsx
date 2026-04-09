import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Button, Panel } from '../components/ui';
import { GameCanvas } from '../features/game/game-canvas';
import { getDifficultyPresentation, getDisplayedStars } from '../features/levels/level-presentation';
import { apiRequest, ApiClientError } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { Level } from '../types/models';

export function PlayPage() {
  const { slugOrId = '' } = useParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = Boolean(user);
  const [runId, setRunId] = useState(0);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionSyncFailed, setSessionSyncFailed] = useState(false);
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
      setSessionSyncFailed(false);
      setActiveSessionId(payload.session.id);
    },
    onError: (error) => {
      setActiveSessionId(null);
      setSessionSyncFailed(true);

      if (error instanceof ApiClientError && error.statusCode === 401) {
        setResultMessage('Guest mode active. Sign in if you want stars and leaderboard progress.');
        return;
      }

      setResultMessage('Server sync is unavailable. You can still play locally, but this run will not count.');
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
    onError: () => {
      setResultMessage('Run cleared locally, but reward sync failed. Retry after signing in again if needed.');
    },
  });

  const startSession = startSessionMutation.mutate;
  const guestPlayable = !isAuthenticated || sessionSyncFailed;

  useEffect(() => {
    setActiveSessionId(null);
    setSessionSyncFailed(false);
    setResultMessage('');
  }, [isAuthenticated, slugOrId]);

  useEffect(() => {
    if (!levelQuery.data?.level.id) {
      return;
    }

    if (!isAuthenticated) {
      setActiveSessionId(null);
      setSessionSyncFailed(false);
      return;
    }

    startSession(levelQuery.data.level.id);
  }, [levelQuery.data?.level.id, isAuthenticated, runId, startSession]);

  const restartRun = () => {
    setResultMessage('');
    setActiveSessionId(null);
    setSessionSyncFailed(false);
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
  const isTrackedRun = isAuthenticated && Boolean(activeSessionId);
  const runtimeStatusLabel = isTrackedRun ? 'Tracked Run' : 'Guest Run';

  return (
    <div className="play-screen">
      <Panel className="game-screen bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-8">
          <div className="play-hero">
            <p className="arcade-eyebrow">{isTrackedRun ? 'Official Run Mode' : 'Guest Practice Mode'}</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              {level.title}
            </h2>
            <p className="text-sm leading-8 text-white/82">
              {isAuthenticated
                ? 'Signed-in runs sync with the server for official completion rewards and leaderboard progress.'
                : 'You can play without an account. Guest clears are local practice only and do not enter the leaderboard.'}
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
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Mode</p>
              <p className="mt-2 font-display text-xl text-white">{runtimeStatusLabel}</p>
            </div>
          </div>
        </div>
      </Panel>

      {resultMessage ? (
        <Panel className="game-screen bg-transparent">
          <div className="play-result-banner">
            <p className="play-result-copy">{resultMessage}</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={restartRun}>Run Again</Button>
              {isAuthenticated ? (
                <Link to="/leaderboard">
                  <Button variant="secondary">View Rank</Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button variant="secondary">Create Account</Button>
                </Link>
              )}
            </div>
          </div>
        </Panel>
      ) : null}

      {guestPlayable || activeSessionId ? (
        <GameCanvas
          key={activeSessionId ? `${activeSessionId}-${attemptNumber}` : `guest-${runId}-${attemptNumber}`}
          levelData={level.dataJson}
          runId={activeSessionId ?? `guest-${runId}`}
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
              return;
            }

            setResultMessage('Guest clear confirmed. Sign in if you want stars and leaderboard placement.');
          }}
        />
      ) : (
        <Panel className="arcade-runtime-frame game-screen bg-transparent">
          <div className="play-placeholder">
            <div className="arcade-runtime-bar flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-[11px] tracking-[0.24em] text-[#ffd44a]">Runtime</p>
                  <span className="arcade-badge arcade-badge--default">Syncing</span>
                </div>
                <h3 className="font-display text-2xl text-[#caff45]">{level.dataJson.meta.theme}</h3>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
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
                <span>Reward sync</span>
                <span>Leaderboard tracking</span>
              </div>
            </div>

            <div className="arcade-runtime-stage">
              <div className="play-placeholder-stage">
                <p className="font-display text-sm tracking-[0.24em] text-white/78">Preparing tracked gameplay session...</p>
              </div>
            </div>

            <p className="arcade-runtime-footer text-xs leading-6 text-white/72">
              Signed-in runs wait for a secure session so completions can grant official rewards correctly.
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}
