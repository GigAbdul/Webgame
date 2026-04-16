import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { GameCanvas } from '../features/game/game-canvas';
import { apiRequest, ApiClientError } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { Level } from '../types/models';

type CompletionOverlayState = {
  attemptNumber: number;
  completionTimeMs: number;
  rewardText: string;
  summaryText: string;
};

function formatCompletionTime(completionTimeMs: number) {
  const totalSeconds = Math.max(0, Math.floor(completionTimeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function PlayPage() {
  const { slugOrId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = Boolean(user);
  const [runId, setRunId] = useState(0);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionSyncFailed, setSessionSyncFailed] = useState(false);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [completionOverlay, setCompletionOverlay] = useState<CompletionOverlayState | null>(null);

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
      setCompletionOverlay((current) =>
        current
          ? {
              ...current,
              rewardText: payload.alreadyRewarded ? 'Reward Claimed' : `+${payload.starsAwarded} Stars`,
              summaryText: payload.alreadyRewarded
                ? `Reward was already claimed earlier. Total stars: ${payload.user.totalStars}.`
                : `Official clear synced. Total stars: ${payload.user.totalStars}.`,
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['leaderboard-me'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      setCompletionOverlay((current) =>
        current
          ? {
              ...current,
              rewardText: '+0 Stars',
              summaryText: 'Run cleared locally, but reward sync failed. Retry after signing in again if needed.',
            }
          : current,
      );
    },
  });

  const startSession = startSessionMutation.mutate;
  const guestPlayable = !isAuthenticated || sessionSyncFailed;

  useEffect(() => {
    setActiveSessionId(null);
    setSessionSyncFailed(false);
    setResultMessage('');
    setCompletionOverlay(null);
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
    setCompletionOverlay(null);
    setActiveSessionId(null);
    setSessionSyncFailed(false);
    setAttemptNumber((current) => current + 1);
    setRunId((current) => current + 1);
  };

  if (levelQuery.isLoading) {
    return (
      <div className="play-screen play-screen--fullscreen">
        <div className="play-screen-state">
          <div className="play-screen-loading-card">
            <p className="play-screen-loading-kicker">Loading</p>
            <p>Loading level...</p>
            <div className="loading-bar">
              <div className="loading-bar-fill loading-bar-fill--indeterminate" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const level = levelQuery.data?.level;

  if (!level) {
    return (
      <div className="play-screen play-screen--fullscreen">
        <div className="play-screen-state">Level not found.</div>
      </div>
    );
  }

  return (
    <div className="play-screen play-screen--fullscreen">
      {resultMessage && !completionOverlay ? <div className="play-screen-toast">{resultMessage}</div> : null}
      {guestPlayable || activeSessionId ? (
        <GameCanvas
          key={activeSessionId ? `${activeSessionId}-${attemptNumber}` : `guest-${runId}-${attemptNumber}`}
          levelData={level.dataJson}
          runId={activeSessionId ?? `guest-${runId}`}
          attemptNumber={attemptNumber}
          fullscreen
          suppressCompletionOverlay
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
            setCompletionOverlay({
              attemptNumber,
              completionTimeMs,
              rewardText: activeSessionId ? `+${level.starsReward} Stars` : 'Guest Clear',
              summaryText: activeSessionId
                ? 'Syncing official clear reward...'
                : 'Sign in if you want stars and leaderboard placement.',
            });

            if (activeSessionId) {
              completeSessionMutation.mutate({
                sessionId: activeSessionId,
                progressPercent,
                completionTimeMs,
              });
              return;
            }
          }}
          onExitToMenu={({ progressPercent }) => {
            if (activeSessionId) {
              failSessionMutation.mutate({
                sessionId: activeSessionId,
                progressPercent,
              });
            }

            navigate('/levels');
          }}
        />
      ) : (
        <div className="play-screen-state">
          <div className="play-screen-loading-card">
            <p className="play-screen-loading-kicker">Preparing</p>
            <p>Preparing tracked gameplay session...</p>
            <div className="loading-bar">
              <div className="loading-bar-fill loading-bar-fill--indeterminate" />
            </div>
          </div>
        </div>
      )}

      {completionOverlay ? (
        <div className="play-complete-overlay" role="dialog" aria-modal="true" aria-label="Level complete">
          <div className="play-complete-chain play-complete-chain--left" aria-hidden="true" />
          <div className="play-complete-chain play-complete-chain--right" aria-hidden="true" />

          <section className="play-complete-panel">
            <p className="play-complete-kicker">Stage Clear</p>
            <h2 className="play-complete-title">Level Complete!</h2>
            <p className="play-complete-level">{level.title}</p>

            <div className="play-complete-stats">
              <div className="play-complete-stat">
                <span>Attempts</span>
                <strong>{completionOverlay.attemptNumber}</strong>
              </div>
              <div className="play-complete-stat">
                <span>Time</span>
                <strong>{formatCompletionTime(completionOverlay.completionTimeMs)}</strong>
              </div>
              <div className="play-complete-stat">
                <span>Reward</span>
                <strong>{completionOverlay.rewardText}</strong>
              </div>
            </div>

            <p className="play-complete-summary">{completionOverlay.summaryText}</p>

            <div className="play-complete-actions">
              <button
                type="button"
                className="play-complete-action"
                onClick={restartRun}
                aria-label="Restart level"
                title="Restart level"
              >
                <span aria-hidden="true">↻</span>
              </button>
              <button
                type="button"
                className="play-complete-action play-complete-action--menu"
                onClick={() => navigate('/levels')}
                aria-label="Return to levels"
                title="Return to levels"
              >
                <span aria-hidden="true">≡</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
