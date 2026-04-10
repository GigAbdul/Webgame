import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { GameCanvas } from '../features/game/game-canvas';
import { apiRequest, ApiClientError } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { Level } from '../types/models';

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
    return (
      <div className="play-screen play-screen--fullscreen">
        <div className="play-screen-state">Loading level...</div>
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
      {resultMessage ? <div className="play-screen-toast">{resultMessage}</div> : null}
      {guestPlayable || activeSessionId ? (
        <GameCanvas
          key={activeSessionId ? `${activeSessionId}-${attemptNumber}` : `guest-${runId}-${attemptNumber}`}
          levelData={level.dataJson}
          runId={activeSessionId ?? `guest-${runId}`}
          attemptNumber={attemptNumber}
          fullscreen
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
        <div className="play-screen-state">Preparing tracked gameplay session...</div>
      )}
    </div>
  );
}
