import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { GameCanvas } from '../features/game/game-canvas';
import { useSelectedPlayerSkinRecord } from '../features/game/player-skin-selection';
import { apiRequest, ApiClientError } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { Level } from '../types/models';
import { ViewportFit } from '../components/viewport-fit';
import { SystemStatePage } from './system-state-page';

type CompletionOverlayState = {
  attemptNumber: number;
  jumpCount: number;
  completionTimeMs: number;
  verdictText: string;
  summaryText: string;
};

function formatCompletionTime(completionTimeMs: number) {
  const totalSeconds = Math.max(0, Math.floor(completionTimeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 64 64" className="play-complete-icon" aria-hidden="true">
      <path
        d="M20 22V10L8 22l12 12V22c1-3 4-8 12-8 10 0 18 8 18 18S42 50 32 50c-7 0-13-4-16-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToolsIcon() {
  return (
    <svg viewBox="0 0 64 64" className="play-complete-icon" aria-hidden="true">
      <path
        d="M19 14 50 45 44 51 13 20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M37 13c5 0 9 4 9 9 0 2-1 4-2 5L33 16c1-2 2-3 4-3ZM14 37c0 5 4 9 9 9 2 0 4-1 5-2L17 33c-2 1-3 2-3 4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 64 64" className="play-complete-icon" aria-hidden="true">
      <path d="M18 21h28M18 32h28M18 43h28" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function PlayPage() {
  const { slugOrId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = Boolean(user);
  const selectedPlayerSkinRecord = useSelectedPlayerSkinRecord();
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
              verdictText: payload.alreadyRewarded ? 'Reward Claimed!' : `+${payload.starsAwarded} Stars!`,
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
              verdictText: 'Reward Sync Failed',
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
      <ViewportFit className="viewport-fit-frame--play">
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
      </ViewportFit>
    );
  }

  const level = levelQuery.data?.level;

  if (!level) {
    return (
      <SystemStatePage
        eyebrow="Stage Missing"
        title="No Route"
        description="That level is not available for an official run anymore. Pick another stage from the arcade list."
        primaryAction={{ label: 'Levels', to: '/levels' }}
        secondaryAction={{ label: 'Home', to: '/' }}
      />
    );
  }

  return (
    <ViewportFit className="viewport-fit-frame--play">
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
            playerSkinOverrides={selectedPlayerSkinRecord}
            onFail={({ progressPercent }) => {
              if (activeSessionId) {
                failSessionMutation.mutate({
                  sessionId: activeSessionId,
                  progressPercent,
                });
              }
              restartRun();
            }}
            onComplete={({ progressPercent, completionTimeMs, jumpCount = 0 }) => {
              setCompletionOverlay({
                attemptNumber,
                jumpCount,
                completionTimeMs,
                verdictText: activeSessionId ? 'Level Verified!' : 'Guest Clear!',
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
            <section className="play-complete-shell">
              <div className="play-complete-chain play-complete-chain--left" aria-hidden="true" />
              <div className="play-complete-chain play-complete-chain--right" aria-hidden="true" />

              <div className="play-complete-frame">
                <div className="play-complete-topbar" aria-hidden="true">
                  <span className="play-complete-topcap play-complete-topcap--left" />
                  <span className="play-complete-topfill" />
                  <span className="play-complete-topcap play-complete-topcap--right" />
                </div>

                <div className="play-complete-panel">
                  <h2 className="play-complete-title">Level Complete!</h2>

                  <div className="play-complete-stats-copy" aria-label="Completion stats">
                    <p>Attempts: {completionOverlay.attemptNumber}</p>
                    <p>Jumps: {completionOverlay.jumpCount}</p>
                    <p>Time: {formatCompletionTime(completionOverlay.completionTimeMs)}</p>
                  </div>

                  <p className="play-complete-verdict">{completionOverlay.verdictText}</p>
                  <p className="play-complete-note">{completionOverlay.summaryText}</p>
                </div>

                <div className="play-complete-bottombar" aria-hidden="true">
                  <span className="play-complete-bottomcap play-complete-bottomcap--left" />
                  <span className="play-complete-bottomfill" />
                  <span className="play-complete-bottomcap play-complete-bottomcap--right" />
                </div>
              </div>

              <div className="play-complete-actions">
                <button
                  type="button"
                  className="play-complete-action"
                  onClick={restartRun}
                  aria-label="Restart level"
                  title="Restart level"
                >
                  <ReplayIcon />
                </button>
                <button
                  type="button"
                  className="play-complete-action play-complete-action--tools"
                  onClick={() => navigate(`/levels/${level.slug}`)}
                  aria-label="Open level details"
                  title="Open level details"
                >
                  <ToolsIcon />
                </button>
                <button
                  type="button"
                  className="play-complete-action play-complete-action--menu"
                  onClick={() => navigate('/levels')}
                  aria-label="Return to levels"
                  title="Return to levels"
                >
                  <MenuIcon />
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </ViewportFit>
  );
}
