import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, FieldLabel, Input, Select } from '../components/ui';
import { createEmptyLevelData } from '../features/game/object-definitions';
import { GameCanvas } from '../features/game/game-canvas';
import { resolveLevelMusic } from '../features/game/level-music';
import { useSelectedPlayerSkinRecord } from '../features/game/player-skin-selection';
import { difficultyOptions, getDifficultyPresentation } from '../features/levels/level-presentation';
import { ApiClientError, apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { Difficulty, Level } from '../types/models';

const MAX_CUSTOM_MUSIC_FILE_SIZE_BYTES = 8 * 1024 * 1024;

function isDirectMusicSource(value: string) {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('blob:') ||
    value.startsWith('data:audio/')
  );
}

function getInitialMusicUrlInput(music: string) {
  return isDirectMusicSource(music) && !music.startsWith('data:audio/') ? music : '';
}

function inferMusicLabel(source: string) {
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    return 'Custom Track';
  }

  if (trimmedSource.startsWith('data:audio/')) {
    return 'Uploaded Track';
  }

  const lastSegment = trimmedSource.split('/').pop() ?? trimmedSource;
  return decodeURIComponent(lastSegment) || 'Custom Track';
}

function getVerificationCopy(level: Level) {
  if (level.isOfficial || level.status === 'OFFICIAL') {
    return 'Verified';
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

function getLevelIdCopy(level: Level) {
  return level.id.slice(0, 8).toUpperCase();
}

function getNextUnnamedTitle(levels: Level[]) {
  const unnamedPattern = /^unnamed(?:\s+(\d+))?$/i;
  const usedNumbers = new Set<number>();

  for (const level of levels) {
    const match = level.title.trim().match(unnamedPattern);

    if (!match) {
      continue;
    }

    usedNumbers.add(match[1] ? Number(match[1]) : 0);
  }

  let nextNumber = 0;
  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1;
  }

  return nextNumber === 0 ? 'Unnamed' : `Unnamed ${nextNumber}`;
}

export function LevelSetupPage() {
  const { id } = useParams();
  const isNewLevel = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const selectedPlayerSkinRecord = useSelectedPlayerSkinRecord();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [musicValue, setMusicValue] = useState('none');
  const [musicUrlInput, setMusicUrlInput] = useState('');
  const [musicLabelInput, setMusicLabelInput] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('NORMAL');
  const [publishAsOfficial, setPublishAsOfficial] = useState(false);
  const [message, setMessage] = useState('');
  const [isMusicPanelOpen, setIsMusicPanelOpen] = useState(false);
  const [isPublishPanelOpen, setIsPublishPanelOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRunSeed, setPreviewRunSeed] = useState(0);
  const [isEditorOpening, setIsEditorOpening] = useState(false);

  const levelQuery = useQuery({
    queryKey: ['level-setup', id],
    queryFn: () => apiRequest<{ level: Level }>(`/api/levels/${id}`),
    enabled: Boolean(id),
  });
  const myLevelsQuery = useQuery({
    queryKey: ['my-levels'],
    queryFn: () => apiRequest<{ levels: Level[] }>('/api/levels/mine'),
    enabled: isNewLevel && Boolean(user),
  });

  const level = levelQuery.data?.level ?? null;
  const resolvedMusic = useMemo(
    () =>
      resolveLevelMusic({
        gridSize: 32,
        lengthUnits: 120,
        theme: level?.theme ?? 'neon-grid',
        background: level?.theme ?? 'neon-grid',
        music: musicValue,
        musicLabel: musicLabelInput.trim() || undefined,
        version: 1,
      }),
    [level?.theme, musicLabelInput, musicValue],
  );
  const previewLevelData = useMemo(() => {
    if (!level) {
      return null;
    }

    const previewData = structuredClone(level.dataJson);
    const trimmedMusicSource = musicValue.trim();
    const normalizedMusicSource = trimmedMusicSource || 'none';
    const normalizedMusicLabel =
      musicLabelInput.trim() || (normalizedMusicSource !== 'none' ? inferMusicLabel(normalizedMusicSource) : '');

    previewData.meta.music = normalizedMusicSource;
    if (normalizedMusicLabel) {
      previewData.meta.musicLabel = normalizedMusicLabel;
    } else {
      delete previewData.meta.musicLabel;
    }

    return previewData;
  }, [level, musicLabelInput, musicValue]);
  const newLevelPreviewData = useMemo(() => {
    if (!isNewLevel) {
      return null;
    }

    const levelData = createEmptyLevelData('neon-grid');
    const trimmedMusicSource = musicValue.trim();
    const normalizedMusicSource = trimmedMusicSource || 'none';
    const normalizedMusicLabel =
      musicLabelInput.trim() || (normalizedMusicSource !== 'none' ? inferMusicLabel(normalizedMusicSource) : '');

    levelData.meta.music = normalizedMusicSource;
    if (normalizedMusicLabel) {
      levelData.meta.musicLabel = normalizedMusicLabel;
    } else {
      delete levelData.meta.musicLabel;
    }

    return levelData;
  }, [isNewLevel, musicLabelInput, musicValue]);

  useEffect(() => {
    if (isNewLevel) {
      setTitle('');
      setDescription('');
      setMusicValue('none');
      setMusicUrlInput('');
      setMusicLabelInput('Stereo Madness');
      setSelectedDifficulty('NORMAL');
      setPublishAsOfficial(false);
      return;
    }

    if (!level) {
      return;
    }

    setTitle(level.title);
    setDescription(level.description);
    setMusicValue(level.dataJson.meta.music?.trim() || 'none');
    setMusicUrlInput(getInitialMusicUrlInput(level.dataJson.meta.music?.trim() || 'none'));
    setMusicLabelInput(level.dataJson.meta.musicLabel ?? '');
    setSelectedDifficulty(level.difficulty ?? 'NORMAL');
    setPublishAsOfficial(level.isOfficial);
  }, [isNewLevel, level]);

  useEffect(() => {
    setIsMusicPanelOpen(false);
    setIsPublishPanelOpen(false);
    setIsPreviewOpen(false);
  }, [id]);

  useEffect(() => {
    document.body.classList.toggle('gd-draft-view-preview-open', isPreviewOpen);
    return () => {
      document.body.classList.remove('gd-draft-view-preview-open');
    };
  }, [isPreviewOpen]);

  const saveDraftMutation = useMutation({
    mutationFn: (payload: { title: string; description: string; theme: string; dataJson: Level['dataJson'] }) =>
      id
        ? apiRequest<{ level: Level }>(`/api/levels/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : apiRequest<{ level: Level }>('/api/levels', {
            method: 'POST',
            body: JSON.stringify(payload),
          }),
    onSuccess: async (payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-levels'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['level-setup', payload.level.id] }),
        queryClient.invalidateQueries({ queryKey: ['level-editor', payload.level.id] }),
      ]);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (levelId: string) =>
      apiRequest<{ level: Level }>(`/api/levels/${levelId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ difficulty: selectedDifficulty }),
      }),
    onSuccess: async (payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-levels'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['level-setup', payload.level.id] }),
        queryClient.invalidateQueries({ queryKey: ['admin-levels'] }),
      ]);
    },
  });

  const adminPublishMutation = useMutation({
    mutationFn: (levelId: string) =>
      apiRequest<{ level: Level }>(`/api/admin/levels/${levelId}/official-settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          difficulty: selectedDifficulty,
          status: publishAsOfficial ? 'OFFICIAL' : 'SUBMITTED',
          isVisible: publishAsOfficial,
        }),
      }),
    onSuccess: async (payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-levels'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['level-setup', payload.level.id] }),
        queryClient.invalidateQueries({ queryKey: ['official-levels'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-levels'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-level', payload.level.id] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (levelId: string) =>
      apiRequest(`/api/levels/${levelId}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-levels'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ]);
      navigate('/my-levels');
    },
  });

  const isWorking =
    saveDraftMutation.isPending ||
    submitMutation.isPending ||
    adminPublishMutation.isPending ||
    deleteMutation.isPending;
  const isBusy = isWorking || isEditorOpening;

  function buildLevelPayload(baseLevel?: Level | null, resolvedTitle?: string) {
    const levelData = baseLevel ? structuredClone(baseLevel.dataJson) : createEmptyLevelData('neon-grid');
    const trimmedMusicSource = musicValue.trim();
    const normalizedMusicSource = trimmedMusicSource || 'none';
    const normalizedMusicLabel =
      musicLabelInput.trim() || (normalizedMusicSource !== 'none' ? inferMusicLabel(normalizedMusicSource) : '');

    levelData.meta.music = normalizedMusicSource;
    if (normalizedMusicLabel) {
      levelData.meta.musicLabel = normalizedMusicLabel;
    } else {
      delete levelData.meta.musicLabel;
    }

    return {
      title: resolvedTitle ?? title.trim(),
      description: description.trim(),
      theme: baseLevel?.theme ?? 'neon-grid',
      dataJson: levelData,
    };
  }

  async function resolveDraftTitle() {
    const trimmedTitle = title.trim();

    if (trimmedTitle) {
      return trimmedTitle;
    }

    const knownLevels =
      myLevelsQuery.data?.levels ??
      (
        await queryClient.fetchQuery({
          queryKey: ['my-levels'],
          queryFn: () => apiRequest<{ levels: Level[] }>('/api/levels/mine'),
        })
      ).levels;
    const fallbackTitle = getNextUnnamedTitle(knownLevels);

    setTitle(fallbackTitle);
    return fallbackTitle;
  }

  async function saveMetadata() {
    const trimmedTitle = title.trim();

    if (trimmedTitle.length < 3) {
      throw new Error('Level title must be at least 3 characters long.');
    }

    return saveDraftMutation.mutateAsync(buildLevelPayload(level));
  }

  async function handleCreateAndOpenEditor() {
    setMessage('');
    setIsEditorOpening(true);

    try {
      const resolvedTitle = await resolveDraftTitle();
      const payload = await saveDraftMutation.mutateAsync(buildLevelPayload(null, resolvedTitle));
      navigate(`/editor/${payload.level.id}`);
    } catch (error) {
      setIsEditorOpening(false);
      setMessage(error instanceof Error ? error.message : 'Could not create the draft.');
    }
  }

  async function handleCreateDraftOnly() {
    setMessage('');

    try {
      const resolvedTitle = await resolveDraftTitle();
      const payload = await saveDraftMutation.mutateAsync(buildLevelPayload(null, resolvedTitle));
      navigate(`/my-levels/${payload.level.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the draft.');
    }
  }

  async function handleSaveMetadata() {
    setMessage('');

    try {
      await saveMetadata();
      setMessage('Level details saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the level details.');
    }
  }

  async function handleOpenEditor() {
    if (!level) {
      return;
    }

    if (level.isOfficial && user?.role !== 'ADMIN') {
      return;
    }

    setMessage('');
    setIsEditorOpening(true);

    try {
      await saveMetadata();
      navigate(`/editor/${level.id}`);
    } catch (error) {
      setIsEditorOpening(false);
      setMessage(error instanceof Error ? error.message : 'Could not open the editor.');
    }
  }

  async function handlePublish() {
    if (!level) {
      return;
    }

    setMessage('');

    try {
      await saveMetadata();

      if (user?.role === 'ADMIN') {
        await adminPublishMutation.mutateAsync(level.id);
        setMessage(publishAsOfficial ? 'Level published to Official Levels.' : 'Level sent to the review queue.');
        setIsPublishPanelOpen(false);
        return;
      }

      await submitMutation.mutateAsync(level.id);
      setMessage('Level submitted for admin review.');
      setIsPublishPanelOpen(false);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setMessage(error.message);
        return;
      }

      setMessage(error instanceof Error ? error.message : 'Could not publish the level.');
    }
  }

  function applyCustomMusicUrl() {
    const trimmedUrl = musicUrlInput.trim();
    setMusicValue(trimmedUrl || 'none');

    if (!musicLabelInput.trim() && trimmedUrl) {
      setMusicLabelInput(inferMusicLabel(trimmedUrl));
    }
  }

  function clearMusic() {
    setMusicValue('none');
    setMusicUrlInput('');
    setMusicLabelInput('');
  }

  function handleMusicFilePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (file.size > MAX_CUSTOM_MUSIC_FILE_SIZE_BYTES) {
      setMessage('Audio file is too large. Keep uploads under 8 MB.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setMessage('Could not read the selected music file.');
        return;
      }

      setMusicValue(reader.result);
      setMusicUrlInput('');
      if (!musicLabelInput.trim()) {
        setMusicLabelInput(file.name);
      }
      setMessage(`Custom music loaded: ${file.name}.`);
    };

    reader.onerror = () => {
      setMessage('Could not read the selected music file.');
    };

    reader.readAsDataURL(file);
  }

  function handleDeleteCurrentLevel() {
    if (!level || level.isOfficial || isBusy) {
      return;
    }

    const shouldDelete = window.confirm(`Delete "${level.title}" from your drafts?`);

    if (shouldDelete) {
      deleteMutation.mutate(level.id);
    }
  }

  if (!isNewLevel && levelQuery.isLoading) {
    return (
      <div className="gd-draft-view-page">
        <div className="gd-draft-view-feedback">Loading level view...</div>
      </div>
    );
  }

  if (!isNewLevel && !level) {
    return (
      <div className="gd-draft-view-page">
        <div className="gd-draft-view-feedback gd-draft-view-feedback--action">
          <p>Draft not found.</p>
          <Link to="/my-levels" className="gd-draft-view-feedback-button">
            Workshop
          </Link>
        </div>
      </div>
    );
  }

  const publishButtonLabel =
    user?.role === 'ADMIN'
      ? publishAsOfficial
        ? 'Publish Official'
        : 'Send To Review Queue'
      : level?.status === 'SUBMITTED'
        ? 'Awaiting Admin Review'
        : 'Publish For Review';

  if (!isNewLevel && level) {
    const canPublish = user?.role === 'ADMIN' || level.status === 'DRAFT';
    const canOpenEditor = user?.role === 'ADMIN' || !level.isOfficial;

    return (
      <div className="gd-draft-view-page gd-draft-view-page--arcade">
        <div className="gd-draft-view-scene" aria-hidden="true">
          <div className="gd-draft-view-grid" />
          <div className="gd-draft-view-corner gd-draft-view-corner--left" />
          <div className="gd-draft-view-corner gd-draft-view-corner--right" />
        </div>

        <Link to="/my-levels" className="gd-draft-view-back-button" aria-label="Back to my levels">
          <span className="gd-draft-view-back-icon" />
        </Link>

        <div className="gd-draft-view-side-stack gd-draft-view-side-stack--arcade">
          <button
            type="button"
            className="gd-draft-view-side-button gd-draft-view-side-button--danger"
            onClick={handleDeleteCurrentLevel}
            disabled={isBusy || level.isOfficial}
            aria-label="Delete draft"
          >
            <span className="gd-draft-view-side-icon gd-draft-view-side-icon--close" aria-hidden="true" />
          </button>

        </div>

        <div className="gd-draft-view-shell gd-draft-view-shell--arcade">
          <div className="gd-draft-view-title-frame">
            <input
              value={title}
              placeholder="Unnamed 0"
              onChange={(event) => setTitle(event.target.value)}
              className="gd-draft-view-title-input"
              aria-label="Level title"
            />
          </div>

          <div className="gd-draft-view-description-frame">
            <textarea
              value={description}
              placeholder="Description [Optional]"
              onChange={(event) => setDescription(event.target.value)}
              className="gd-draft-view-description-input"
              aria-label="Level description"
            />
          </div>

          <div className="gd-draft-view-action-row gd-draft-view-action-row--arcade">
            <DraftViewActionButton
              variant="editor"
              label="Editor"
              onClick={handleOpenEditor}
              disabled={isBusy || !canOpenEditor}
              hideLabel
            />
            <DraftViewActionButton
              variant="play"
              label="Play"
              onClick={() => {
                setPreviewRunSeed((current) => current + 1);
                setIsPreviewOpen(true);
              }}
              disabled={isBusy || !previewLevelData}
              hideLabel
            />
            <DraftViewActionButton
              variant="publish"
              label="Publish"
              onClick={() => setIsPublishPanelOpen(true)}
              disabled={isBusy}
              hideLabel
            />
          </div>

          {message ? <p className="gd-draft-view-message">{message}</p> : null}

          <DraftViewMetaRow
            lengthCopy={getLengthCopy(level.dataJson.meta.lengthUnits)}
            musicCopy={resolvedMusic.label}
            verificationCopy={getVerificationCopy(level)}
          />

          <DraftViewFooter versionCopy={`Version: ${level.versionNumber}`} idCopy={`ID: ${getLevelIdCopy(level)}`} />
        </div>

        {isEditorOpening ? <EditorLaunchOverlay /> : null}

        {isPreviewOpen && previewLevelData ? (
          <div className="gd-draft-view-preview-shell" role="dialog" aria-modal="true" aria-label="Draft preview">
            <div className="gd-draft-view-preview-actions" aria-label="Preview controls">
              <button
                type="button"
                className="gd-draft-view-preview-action"
                onClick={() => setPreviewRunSeed((current) => current + 1)}
                aria-label="Restart preview"
                title="Restart preview"
              >
                Restart
              </button>
              <button
                type="button"
                className="gd-draft-view-preview-action gd-draft-view-preview-action--close"
                onClick={() => setIsPreviewOpen(false)}
                aria-label="Close preview"
                title="Close preview"
              >
                Close
              </button>
            </div>
            <GameCanvas
              key={`draft-preview-${level.id}-${previewRunSeed}`}
              levelData={previewLevelData}
              attemptNumber={1}
              runId={`draft-preview-${level.id}-${previewRunSeed}`}
              autoRestartOnFail
              previewStartPosEnabled
              fullscreen
              className="gd-draft-view-preview-fullscreen"
              playerSkinOverrides={selectedPlayerSkinRecord}
              onExitToMenu={() => setIsPreviewOpen(false)}
            />
          </div>
        ) : null}

        {isMusicPanelOpen ? (
          <div className="gd-draft-view-modal" role="dialog" aria-modal="true" aria-label="Music setup">
            <div className="gd-draft-view-modal-card">
              <div className="gd-draft-view-modal-header">
                <div>
                  <p className="gd-draft-view-modal-eyebrow">Soundtrack</p>
                  <h2 className="gd-draft-view-modal-title">Music Setup</h2>
                </div>
                <button
                  type="button"
                  className="gd-draft-view-modal-close"
                  onClick={() => setIsMusicPanelOpen(false)}
                  aria-label="Close music setup"
                >
                  Close
                </button>
              </div>

              <div className="gd-draft-view-modal-grid">
                <div>
                  <FieldLabel>Track Label</FieldLabel>
                  <Input
                    value={musicLabelInput}
                    placeholder="Stereo Madness"
                    onChange={(event) => setMusicLabelInput(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Music URL</FieldLabel>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={musicUrlInput}
                      placeholder="https://example.com/track.mp3"
                      onChange={(event) => setMusicUrlInput(event.target.value)}
                    />
                    <Button variant="ghost" onClick={applyCustomMusicUrl} type="button">
                      Apply URL
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <label className="arcade-btn arcade-btn--ghost cursor-pointer">
                    <span>Upload Audio</span>
                    <input type="file" accept="audio/*" className="hidden" onChange={handleMusicFilePicked} />
                  </label>
                  <Button variant="ghost" onClick={clearMusic} type="button">
                    Clear Music
                  </Button>
                  <Button type="button" onClick={handleSaveMetadata} disabled={isBusy}>
                    Save Draft
                  </Button>
                </div>

                {resolvedMusic.src ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/60">Preview</p>
                    <audio controls preload="metadata" src={resolvedMusic.src} className="w-full" />
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-white/68">No custom audio attached yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {isPublishPanelOpen ? (
          <div className="gd-draft-view-modal" role="dialog" aria-modal="true" aria-label="Publish controls">
            <div className="gd-draft-view-modal-card">
              <div className="gd-draft-view-modal-header">
                <div>
                  <p className="gd-draft-view-modal-eyebrow">Release Step</p>
                  <h2 className="gd-draft-view-modal-title">
                    {user?.role === 'ADMIN' ? 'Publish Controls' : 'Publish Request'}
                  </h2>
                </div>
                <button
                  type="button"
                  className="gd-draft-view-modal-close"
                  onClick={() => setIsPublishPanelOpen(false)}
                  aria-label="Close publish controls"
                >
                  Close
                </button>
              </div>

              <div className="gd-draft-view-modal-grid">
                <p className="text-sm leading-7 text-white/80">
                  {user?.role === 'ADMIN'
                    ? 'Pick the release difficulty and decide whether this build goes straight into Official Levels or stays in the review queue.'
                    : 'Choose the difficulty you want this level to be rated at, then submit it for admin review.'}
                </p>

                <div>
                  <FieldLabel>Difficulty</FieldLabel>
                  <Select
                    value={selectedDifficulty}
                    onChange={(event) => setSelectedDifficulty(event.target.value as Difficulty)}
                  >
                    {difficultyOptions.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {getDifficultyPresentation(difficulty).label}
                      </option>
                    ))}
                  </Select>
                </div>

                {user?.role === 'ADMIN' ? (
                  <label className="toggle-box">
                    <input
                      type="checkbox"
                      checked={publishAsOfficial}
                      onChange={(event) => setPublishAsOfficial(event.target.checked)}
                    />
                    <span className="text-sm text-white/82">
                      Official release. If enabled, the level appears in `/levels`.
                    </span>
                  </label>
                ) : null}

                <div className="gd-draft-view-modal-actions">
                  <Button onClick={handlePublish} disabled={isBusy || !canPublish}>
                    {publishButtonLabel}
                  </Button>
                  <Button variant="ghost" onClick={handleSaveMetadata} disabled={isBusy}>
                    Save Draft
                  </Button>
                  {!canPublish ? <Badge tone="accent">Already submitted</Badge> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="gd-draft-view-page gd-draft-view-page--arcade">
      <div className="gd-draft-view-scene" aria-hidden="true">
        <div className="gd-draft-view-grid" />
        <div className="gd-draft-view-corner gd-draft-view-corner--left" />
        <div className="gd-draft-view-corner gd-draft-view-corner--right" />
      </div>

      <Link to="/my-levels" className="gd-draft-view-back-button" aria-label="Back to my levels">
        <span className="gd-draft-view-back-icon" />
      </Link>

      <div className="gd-draft-view-side-stack gd-draft-view-side-stack--arcade">
        <button
          type="button"
          className="gd-draft-view-side-button gd-draft-view-side-button--danger"
          onClick={() => navigate('/my-levels')}
          aria-label="Cancel new level creation"
        >
          <span className="gd-draft-view-side-icon gd-draft-view-side-icon--close" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="gd-draft-view-side-button"
          onClick={() =>
            setMessage(
              'Add the level name and optional description, preview the route if you want, then use Editor to create the draft and keep configuring it there.',
            )
          }
          aria-label="Show create level help"
        >
          <span className="gd-draft-view-side-copy">Help</span>
        </button>

        <button
          type="button"
          className="gd-draft-view-side-button"
          onClick={() => navigate('/my-levels')}
          aria-label="Return to my levels"
        >
          <span className="gd-draft-view-side-copy">Drafts</span>
        </button>
      </div>

      <div className="gd-draft-view-shell gd-draft-view-shell--arcade">
        <div className="gd-draft-view-title-frame">
          <input
            value={title}
            placeholder="Level Name"
            onChange={(event) => setTitle(event.target.value)}
            className="gd-draft-view-title-input"
            aria-label="Level title"
          />
        </div>

        <div className="gd-draft-view-description-frame">
          <textarea
            value={description}
            placeholder="Description [Optional]"
            onChange={(event) => setDescription(event.target.value)}
            className="gd-draft-view-description-input"
            aria-label="Level description"
          />
        </div>

        <div className="gd-draft-view-action-row gd-draft-view-action-row--arcade">
          <DraftViewActionButton
            variant="editor"
            label="Create And Edit"
            onClick={handleCreateAndOpenEditor}
            disabled={isBusy}
            hideLabel
          />
          <DraftViewActionButton
            variant="play"
            label="Play"
            onClick={() => {
              setPreviewRunSeed((current) => current + 1);
              setIsPreviewOpen(true);
            }}
            disabled={isBusy}
            hideLabel
          />
          <DraftViewActionButton
            variant="publish"
            label="Save Draft"
            onClick={handleCreateDraftOnly}
            disabled={isBusy}
            hideLabel
          />
        </div>

        {message ? <p className="gd-draft-view-message">{message}</p> : null}

        <DraftViewMetaRow
          lengthCopy={getLengthCopy(120)}
          musicCopy={resolvedMusic.label}
          verificationCopy="Unverified"
        />

        <DraftViewFooter versionCopy="Version: 1" idCopy="ID: NA" />
      </div>

      {isEditorOpening ? <EditorLaunchOverlay /> : null}

      {isPreviewOpen && newLevelPreviewData ? (
        <div className="gd-draft-view-preview-shell" role="dialog" aria-modal="true" aria-label="New level preview">
          <div className="gd-draft-view-preview-actions" aria-label="Preview controls">
            <button
              type="button"
              className="gd-draft-view-preview-action"
              onClick={() => setPreviewRunSeed((current) => current + 1)}
              aria-label="Restart preview"
              title="Restart preview"
            >
              Restart
            </button>
            <button
              type="button"
              className="gd-draft-view-preview-action gd-draft-view-preview-action--close"
              onClick={() => setIsPreviewOpen(false)}
              aria-label="Close preview"
              title="Close preview"
            >
              Close
            </button>
          </div>
          <GameCanvas
            key={`new-draft-preview-${previewRunSeed}`}
            levelData={newLevelPreviewData}
            attemptNumber={1}
            runId={`new-draft-preview-${previewRunSeed}`}
            autoRestartOnFail
            previewStartPosEnabled
            fullscreen
            className="gd-draft-view-preview-fullscreen"
            playerSkinOverrides={selectedPlayerSkinRecord}
            onExitToMenu={() => setIsPreviewOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

function EditorLaunchOverlay() {
  return (
    <div className="gd-draft-view-transition-overlay" role="status" aria-live="polite" aria-label="Opening editor">
      <div className="gd-draft-view-transition-card">
        <p className="play-screen-loading-kicker">Editor</p>
        <p className="gd-draft-view-transition-title">Opening editor...</p>
        <p className="gd-draft-view-transition-copy">Saving the draft and launching the build surface.</p>
        <div className="loading-bar" aria-hidden="true">
          <div className="loading-bar-fill loading-bar-fill--indeterminate" />
        </div>
      </div>
    </div>
  );
}

function DraftViewActionButton({
  variant,
  label,
  onClick,
  disabled = false,
  hideLabel = false,
}: {
  variant: 'editor' | 'play' | 'publish';
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <button
      type="button"
      className={`gd-draft-view-action-button gd-draft-view-action-button--${variant}${hideLabel ? ' gd-draft-view-action-button--icon-only' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <span className={`gd-draft-view-action-icon gd-draft-view-action-icon--${variant}`} aria-hidden="true" />
      {!hideLabel ? <span className="gd-draft-view-action-label">{label}</span> : null}
    </button>
  );
}

function DraftViewMetaRow({
  lengthCopy,
  musicCopy,
  verificationCopy,
}: {
  lengthCopy: string;
  musicCopy: string;
  verificationCopy: string;
}) {
  return (
    <div className="gd-draft-view-meta-row">
      <div className="gd-draft-view-meta-item">
        <svg viewBox="0 0 64 64" className="gd-draft-view-meta-icon" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="#ffffff" stroke="#1a1b32" strokeWidth="4" />
          <path d="M32 18v15l9 7" fill="none" stroke="#1a1b32" strokeWidth="5" strokeLinecap="round" />
          <circle cx="32" cy="32" r="3.8" fill="#1a1b32" />
        </svg>
        <span className="gd-draft-view-meta-copy">{lengthCopy}</span>
      </div>

      <div className="gd-draft-view-meta-item">
        <svg viewBox="0 0 64 64" className="gd-draft-view-meta-icon" aria-hidden="true">
          <path
            d="M16 12v27.5c0 4.7 3.8 8.5 8.5 8.5S33 44.2 33 39.5 29.2 31 24.5 31c-1.8 0-3.5.5-5 1.5V20.6l20-4.9v19.8c0 4.7 3.8 8.5 8.5 8.5S56.5 40.2 56.5 35.5 52.7 27 48 27c-1.6 0-3.1.4-4.5 1.2V10.3L16 12Z"
            fill="#ffffff"
            stroke="#1a1b32"
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </svg>
        <span className="gd-draft-view-meta-copy">{musicCopy}</span>
      </div>

      <div className="gd-draft-view-meta-item">
        <svg viewBox="0 0 64 64" className="gd-draft-view-meta-icon" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="#22dcff" stroke="#1a1b32" strokeWidth="4" />
          <path d="M32 20v4" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
          <circle cx="32" cy="43" r="3.5" fill="#ffffff" />
          <path d="M32 29v9" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <span className="gd-draft-view-meta-copy">{verificationCopy}</span>
      </div>
    </div>
  );
}

function DraftViewFooter({ versionCopy, idCopy }: { versionCopy: string; idCopy: string }) {
  return (
    <div className="gd-draft-view-footer gd-draft-view-footer--split">
      <div className="gd-draft-view-footer-chip">{versionCopy}</div>
      <div className="gd-draft-view-footer-chip">{idCopy}</div>
    </div>
  );
}
