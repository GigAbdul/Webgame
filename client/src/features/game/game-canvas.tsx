import { useEffect, useMemo, useRef, useState } from 'react';
import { getObjectFillColor, getObjectPaintGroupId, getObjectStrokeColor } from './object-definitions';
import {
  SHIP_FALL_ACCELERATION,
  SHIP_FLIGHT_CEILING_Y,
  SHIP_FLIGHT_FLOOR_Y,
  SHIP_MAX_VERTICAL_SPEED,
  SHIP_THRUST_ACCELERATION,
  SHIP_VISUAL_BOUND_PADDING,
  getPlayerModeDescription,
  getPlayerModeLabel,
} from './player-mode-config';
import { readStoredMusicVolume, resolveLevelMusic } from './level-music';
import { drawStageObjectSprite } from './object-renderer';
import { getStageThemePalette } from './stage-theme-palette';
import type { LevelData, LevelObject } from '../../types/models';
import { Panel } from '../../components/ui';
import { cn } from '../../utils/cn';

type GameCanvasProps = {
  levelData: LevelData;
  attemptNumber?: number;
  runId?: string | number;
  autoRestartOnFail?: boolean;
  fullscreen?: boolean;
  previewStartPosEnabled?: boolean;
  className?: string;
  onFail?: (payload: { progressPercent: number; completionTimeMs: number }) => void;
  onComplete?: (payload: { progressPercent: number; completionTimeMs: number }) => void;
  onExitToMenu?: (payload: { progressPercent: number }) => void;
};

type PlayerState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  rotation: number;
  grounded: boolean;
  gravity: number;
  speedMultiplier: number;
  mode: LevelData['player']['mode'];
};

type TrailPoint = {
  x: number;
  y: number;
  alpha: number;
  size: number;
};

type PreviewBootstrap = {
  startX: number;
  startY: number;
  speedMultiplier: number;
  gravity: number;
  mode: LevelData['player']['mode'];
  elapsedMs: number;
};

const solidTypes = new Set(['GROUND_BLOCK', 'HALF_GROUND_BLOCK', 'PLATFORM_BLOCK', 'HALF_PLATFORM_BLOCK']);
const hazardTypes = new Set(['SPIKE', 'SAW_BLADE', 'ARROW_RAMP_ASC', 'ARROW_RAMP_DESC']);
const JUMP_BUFFER_MS = 130;
const COYOTE_TIME_MS = 110;
const AUTO_RESTART_DELAY_MS = 850;
const BASE_HORIZONTAL_SPEED = 6.15;
const BASE_GRAVITY_ACCELERATION = 55;
const DEFAULT_JUMP_VELOCITY = 15.5;
const AIR_ROTATION_SPEED = Math.PI * 1.6;
const QUARTER_TURN = Math.PI / 2;
const ARROW_VERTICAL_SPEED_FACTOR = 1;
const RUNTIME_BUCKET_WIDTH_UNITS = 8;
const GAMEPLAY_INPUT_CODES = new Set(['Space', 'ArrowUp', 'KeyW']);

export function GameCanvas({
  levelData,
  attemptNumber = 1,
  runId = 0,
  autoRestartOnFail = false,
  fullscreen = false,
  previewStartPosEnabled = false,
  className,
  onFail,
  onComplete,
  onExitToMenu,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onFailRef = useRef(onFail);
  const onCompleteRef = useRef(onComplete);
  const inputHeldRef = useRef(false);
  const keyboardInputHeldRef = useRef(false);
  const activePointerIdsRef = useRef<Set<number>>(new Set());
  const pauseMenuOpenRef = useRef(false);
  const pauseSettingsOpenRef = useRef(false);
  const pauseStartedAtRef = useRef<number | null>(null);
  const pausedDurationMsRef = useRef(0);
  const screenShakeEnabledRef = useRef(true);
  const [hud, setHud] = useState({
    progressPercent: 0,
    status: 'running' as 'running' | 'failed' | 'completed',
    elapsedMs: 0,
  });
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const [isPauseSettingsOpen, setIsPauseSettingsOpen] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [isScreenShakeEnabled, setIsScreenShakeEnabled] = useState(true);
  const playerModeLabel = getPlayerModeLabel(levelData.player.mode);
  const resolvedMusic = useMemo(() => resolveLevelMusic(levelData.meta), [levelData.meta]);
  const musicOffsetMs = Math.max(0, Number(levelData.meta.musicOffsetMs ?? 0) || 0);
  const previewStartPos = useMemo(() => {
    if (!previewStartPosEnabled) {
      return null;
    }

    for (let index = levelData.objects.length - 1; index >= 0; index -= 1) {
      const object = levelData.objects[index];

      if (object.type === 'START_POS') {
        return {
          x: object.x,
          y: object.y,
        };
      }
    }

    return null;
  }, [levelData.objects, previewStartPosEnabled]);
  const previewBootstrap = useMemo(
    () => buildPreviewBootstrap(levelData, previewStartPos),
    [levelData, previewStartPos],
  );
  const runtimeMusicOffsetMs = musicOffsetMs + previewBootstrap.elapsedMs;
  const statusLabel =
    hud.status === 'completed' ? 'Stage Clear' : hud.status === 'failed' ? 'Attempt Lost' : 'In Run';

  const closePauseMenu = () => {
    if (!pauseMenuOpenRef.current) {
      return;
    }

    if (pauseStartedAtRef.current !== null) {
      pausedDurationMsRef.current += performance.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }

    pauseMenuOpenRef.current = false;
    pauseSettingsOpenRef.current = false;
    setIsPauseMenuOpen(false);
    setIsPauseSettingsOpen(false);
    if (audioRef.current) {
      audioRef.current.volume = readStoredMusicVolume();
      void audioRef.current.play().catch(() => {});
    }
  };

  const togglePauseSettings = () => {
    const nextOpen = !pauseSettingsOpenRef.current;
    pauseSettingsOpenRef.current = nextOpen;
    setIsPauseSettingsOpen(nextOpen);
  };

  const handleExitToMenu = () => {
    closePauseMenu();
    onExitToMenu?.({
      progressPercent: hud.progressPercent,
    });
  };

  const levelBounds = useMemo(() => {
    const maxY = Math.max(
      ...levelData.objects.map((object) => object.y + object.h),
      levelData.player.startY + 4,
      levelData.finish.y + 3,
    );
    const maxX = Math.max(
      ...levelData.objects.map((object) => object.x + object.w),
      levelData.finish.x + 4,
      levelData.meta.lengthUnits,
    );

    return { maxX, maxY };
  }, [levelData]);

  useEffect(() => {
    onFailRef.current = onFail;
    onCompleteRef.current = onComplete;
  }, [onComplete, onFail]);

  useEffect(() => {
    screenShakeEnabledRef.current = isScreenShakeEnabled;
  }, [isScreenShakeEnabled]);

  useEffect(() => {
    pauseMenuOpenRef.current = false;
    pauseSettingsOpenRef.current = false;
    pauseStartedAtRef.current = null;
    pausedDurationMsRef.current = 0;
    setIsPauseMenuOpen(false);
    setIsPauseSettingsOpen(false);
  }, [levelData, runId]);

  useEffect(() => {
    const currentAudio = audioRef.current;
    const offsetSeconds = runtimeMusicOffsetMs / 1000;

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      audioRef.current = null;
    }

    if (!resolvedMusic.src) {
      return;
    }

    const nextAudio = new Audio(resolvedMusic.src);
    nextAudio.loop = true;
    nextAudio.preload = 'auto';
    nextAudio.volume = readStoredMusicVolume();
    audioRef.current = nextAudio;

    const applyMusicOffset = () => {
      if (!audioRef.current || audioRef.current !== nextAudio) {
        return;
      }

      if (!Number.isFinite(offsetSeconds) || offsetSeconds <= 0) {
        nextAudio.currentTime = 0;
        return;
      }

      const duration = Number.isFinite(nextAudio.duration) && nextAudio.duration > 0 ? nextAudio.duration : null;
      const safeOffset = duration ? Math.min(offsetSeconds, Math.max(0, duration - 0.05)) : offsetSeconds;
      nextAudio.currentTime = safeOffset;
    };

    nextAudio.addEventListener('loadedmetadata', applyMusicOffset);
    if (nextAudio.readyState >= 1) {
      applyMusicOffset();
    }

    void nextAudio.play().catch(() => {});

    return () => {
      nextAudio.removeEventListener('loadedmetadata', applyMusicOffset);
      nextAudio.pause();
      nextAudio.src = '';

      if (audioRef.current === nextAudio) {
        audioRef.current = null;
      }
    };
  }, [resolvedMusic.src, runId, runtimeMusicOffsetMs]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const isExternallyManagedRun = Boolean(onFail || onComplete);
    const isLowPowerDevice =
      typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820);
    const isMobilePreviewPerformanceMode = fullscreen && autoRestartOnFail && previewStartPosEnabled && isLowPowerDevice;
    const width = isMobilePreviewPerformanceMode ? 800 : 960;
    const height = isMobilePreviewPerformanceMode ? 450 : 540;
    canvas.width = width;
    canvas.height = height;

    const cell = (36 * width) / 960;
    const verticalOffset = Math.max(40, height - levelBounds.maxY * cell - 50);
    const player: PlayerState = {
      x: previewBootstrap.startX,
      y: previewBootstrap.startY,
      w: 0.82,
      h: 0.82,
      vy: 0,
      rotation: 0,
      grounded: false,
      gravity: previewBootstrap.gravity,
      speedMultiplier: previewBootstrap.speedMultiplier,
      mode: previewBootstrap.mode,
    };

    const activeTriggers = new Set<string>();
    const usedOrbs = new Set<string>();
    const trail: TrailPoint[] = [];
    const sourceObjects = levelData.objects.map((object) => structuredClone(object));
    let runtimeObjects = sourceObjects.map((object) => structuredClone(object));
    let runtimeObjectBuckets = buildRuntimeObjectBuckets(runtimeObjects);
    let runtimeObjectMap = new Map(runtimeObjects.map((object) => [object.id, object] as const));
    let runtimePaintGroups = buildRuntimePaintGroupMap(runtimeObjects);
    const alphaOverrides = new Map<string, number>();
    const disabledObjectIds = new Set<string>();
    const pulseOverrides = new Map<
      string,
      {
        fillColor?: string;
        strokeColor?: string;
        until: number;
      }
    >();
    const moveAnimations = new Map<
      string,
      {
        startX: number;
        startY: number;
        targetX: number;
        targetY: number;
        startedAt: number;
        durationMs: number;
      }
    >();
    let animationFrame = 0;
    let lastTimestamp = 0;
    let startTime = performance.now() - previewBootstrap.elapsedMs;
    let jumpBufferedUntil = 0;
    let lastGroundedAt = 0;
    let currentStatus: 'running' | 'failed' | 'completed' = 'running';
    let lastHudCommit = 0;
    let cameraX = 0;
    let shakeTime = 0;
    let shakePower = 0;
    let restartTimeout = 0;

    const syncInputHeldState = () => {
      inputHeldRef.current = keyboardInputHeldRef.current || activePointerIdsRef.current.size > 0;
    };

    const releaseAllHeldInput = () => {
      keyboardInputHeldRef.current = false;
      activePointerIdsRef.current.clear();
      syncInputHeldState();
    };

    const rebuildRuntimeObjectBuckets = () => {
      runtimeObjectBuckets = buildRuntimeObjectBuckets(runtimeObjects);
    };

    const rebuildRuntimeObjectMaps = () => {
      runtimeObjectMap = new Map(runtimeObjects.map((object) => [object.id, object] as const));
      runtimePaintGroups = buildRuntimePaintGroupMap(runtimeObjects);
      rebuildRuntimeObjectBuckets();
    };

    const getRuntimeObjectsInRange = (minX: number, maxX: number) => {
      if (!runtimeObjects.length) {
        return [] as LevelObject[];
      }

      const startBucket = Math.floor(minX / RUNTIME_BUCKET_WIDTH_UNITS);
      const endBucket = Math.floor(maxX / RUNTIME_BUCKET_WIDTH_UNITS);
      const seen = new Set<number>();
      const indices: number[] = [];

      for (let bucket = startBucket; bucket <= endBucket; bucket += 1) {
        const bucketEntries = runtimeObjectBuckets.get(bucket);

        if (!bucketEntries) {
          continue;
        }

        for (const index of bucketEntries) {
          if (seen.has(index)) {
            continue;
          }

          seen.add(index);
          const object = runtimeObjects[index];

          if (!objectIntersectsHorizontalRange(object, minX, maxX)) {
            continue;
          }

          indices.push(index);
        }
      }

      indices.sort((left, right) => left - right);
      return indices.map((index) => runtimeObjects[index]);
    };

    const resetRuntimeObjects = () => {
      runtimeObjects = sourceObjects.map((object) => structuredClone(object));
      rebuildRuntimeObjectMaps();
      alphaOverrides.clear();
      disabledObjectIds.clear();
      pulseOverrides.clear();
      moveAnimations.clear();
    };

    const restartMusicFromOffset = () => {
      if (!audioRef.current) {
        return;
      }

      const nextTime = runtimeMusicOffsetMs / 1000;
      audioRef.current.currentTime = Number.isFinite(nextTime) && nextTime > 0 ? nextTime : 0;
      audioRef.current.volume = readStoredMusicVolume();
      void audioRef.current.play().catch(() => {});
    };

    const getRuntimeObject = (objectId: string) => runtimeObjectMap.get(objectId) ?? null;
    const getObjectsInPaintGroup = (groupId: number) => runtimePaintGroups.get(groupId) ?? [];
    const isRuntimeObjectDisabled = (object: LevelObject) => disabledObjectIds.has(object.id);
    const getRuntimeAlpha = (object: LevelObject) => clamp(alphaOverrides.get(object.id) ?? 1, 0, 1);
    const getRuntimeVisuals = (object: LevelObject) => {
      const pulse = pulseOverrides.get(object.id);
      return {
        fillColor: pulse?.fillColor ?? getObjectFillColor(object, levelData.meta.colorGroups),
        strokeColor: pulse?.strokeColor ?? getObjectStrokeColor(object, levelData.meta.colorGroups),
        alpha: getRuntimeAlpha(object),
      };
    };
    const isArrowProtectedByDashBlock = (solidObject: LevelObject, minX: number, maxX: number) =>
      getRuntimeObjectsInRange(minX, maxX).some(
        (object) =>
          object.type === 'DASH_BLOCK' &&
          !isRuntimeObjectDisabled(object) &&
          aabbIntersects(player.x, player.y, player.w, player.h, object.x, object.y, object.w, object.h) &&
          aabbIntersects(object.x, object.y, object.w, object.h, solidObject.x, solidObject.y, solidObject.w, solidObject.h),
      );

    const resetRun = (timestamp = performance.now()) => {
      if (restartTimeout) {
        window.clearTimeout(restartTimeout);
      }

      startTime = timestamp - previewBootstrap.elapsedMs;
      lastTimestamp = timestamp;
      jumpBufferedUntil = 0;
      lastGroundedAt = 0;
      player.x = previewBootstrap.startX;
      player.y = previewBootstrap.startY;
      player.vy = 0;
      player.rotation = 0;
      player.gravity = previewBootstrap.gravity;
      player.speedMultiplier = previewBootstrap.speedMultiplier;
      player.mode = previewBootstrap.mode;
      player.grounded = false;
      releaseAllHeldInput();
      restartMusicFromOffset();
      currentStatus = 'running';
      resetRuntimeObjects();
      activeTriggers.clear();
      usedOrbs.clear();
      trail.length = 0;
      pauseMenuOpenRef.current = false;
      pauseSettingsOpenRef.current = false;
      pauseStartedAtRef.current = null;
      pausedDurationMsRef.current = 0;
      setIsPauseMenuOpen(false);
      setIsPauseSettingsOpen(false);
      setHud({
        progressPercent: clampProgress((player.x / levelBounds.maxX) * 100),
        status: 'running',
        elapsedMs: previewBootstrap.elapsedMs,
      });
    };

    const bumpCamera = (power = 8, duration = 0.18) => {
      if (!screenShakeEnabledRef.current) {
        return;
      }

      shakePower = Math.max(shakePower, power);
      shakeTime = Math.max(shakeTime, duration);
    };

    const launchPlayer = (velocity: number) => {
      player.vy = velocity;
      player.grounded = false;
      lastGroundedAt = -Infinity;
    };

    const tryImmediateCubeJump = (timestamp = performance.now()) => {
      if (currentStatus !== 'running' || player.mode !== 'cube') {
        return false;
      }

      const jumpVelocity = -DEFAULT_JUMP_VELOCITY * Math.sign(player.gravity || 1);
      const canGroundJump = player.grounded || timestamp - lastGroundedAt <= COYOTE_TIME_MS;

      if (!canGroundJump) {
        return false;
      }

      launchPlayer(jumpVelocity);
      jumpBufferedUntil = 0;
      return true;
    };

    const ensureAudioPlayback = () => {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      audio.volume = readStoredMusicVolume();

      if (audio.paused) {
        if (audio.currentTime < runtimeMusicOffsetMs / 1000) {
          audio.currentTime = runtimeMusicOffsetMs / 1000;
        }
        void audio.play().catch(() => {});
      }
    };

    const queueJump = (timestamp = performance.now()) => {
      if (currentStatus !== 'running') {
        return;
      }

      if (tryImmediateCubeJump(timestamp)) {
        return;
      }

      jumpBufferedUntil = timestamp + JUMP_BUFFER_MS;
    };

    const keyListener = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && fullscreen && currentStatus === 'running') {
        event.preventDefault();

        if (pauseMenuOpenRef.current) {
          if (pauseStartedAtRef.current !== null) {
            pausedDurationMsRef.current += performance.now() - pauseStartedAtRef.current;
            pauseStartedAtRef.current = null;
          }

          pauseMenuOpenRef.current = false;
          pauseSettingsOpenRef.current = false;
          setIsPauseMenuOpen(false);
          setIsPauseSettingsOpen(false);
          return;
        }

        pauseMenuOpenRef.current = true;
        pauseStartedAtRef.current = performance.now();
        audioRef.current?.pause();
        setIsPauseMenuOpen(true);
        return;
      }

      if (pauseMenuOpenRef.current) {
        event.preventDefault();
        return;
      }

      if (GAMEPLAY_INPUT_CODES.has(event.code)) {
        event.preventDefault();
        keyboardInputHeldRef.current = true;
        syncInputHeldState();
        ensureAudioPlayback();
        if (player.mode === 'cube') {
          queueJump();
        }
      }

      if (event.code === 'KeyR' && !isExternallyManagedRun) {
        event.preventDefault();
        resetRun();
      }

      if (
        (event.code === 'Enter' || event.code === 'NumpadEnter') &&
        currentStatus !== 'running' &&
        !isExternallyManagedRun
      ) {
        event.preventDefault();
        resetRun();
      }
    };

    const keyUpListener = (event: KeyboardEvent) => {
      if (GAMEPLAY_INPUT_CODES.has(event.code)) {
        keyboardInputHeldRef.current = false;
        syncInputHeldState();
      }
    };

    const pointerDownListener = (event: PointerEvent) => {
      if (pauseMenuOpenRef.current) {
        return;
      }

      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      activePointerIdsRef.current.add(event.pointerId);
      syncInputHeldState();
      ensureAudioPlayback();

      if (currentStatus === 'running') {
        if (player.mode === 'cube') {
          queueJump();
        }
        return;
      }

      if (!isExternallyManagedRun) {
        resetRun();
      }
    };

    const releaseHeldInput = (event?: PointerEvent) => {
      if (event && activePointerIdsRef.current.has(event.pointerId)) {
        activePointerIdsRef.current.delete(event.pointerId);
      } else if (!event) {
        activePointerIdsRef.current.clear();
      }
      syncInputHeldState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        releaseAllHeldInput();
      }
    };

    const handleTouchRelease = () => {
      activePointerIdsRef.current.clear();
      syncInputHeldState();
    };

    const handleWindowBlur = () => {
      releaseAllHeldInput();
    };

    window.addEventListener('keydown', keyListener);
    window.addEventListener('keyup', keyUpListener);
    window.addEventListener('pointerup', releaseHeldInput);
    window.addEventListener('pointercancel', releaseHeldInput);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', releaseAllHeldInput);
    window.addEventListener('touchend', handleTouchRelease, { passive: true });
    window.addEventListener('touchcancel', handleTouchRelease, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    canvas.addEventListener('pointerdown', pointerDownListener);

    const markFailed = (elapsedMs: number) => {
      if (currentStatus !== 'running') {
        return;
      }

      currentStatus = 'failed';
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = runtimeMusicOffsetMs / 1000;
      }
      bumpCamera(12, 0.24);
      const progressPercent = clampProgress((player.x / levelBounds.maxX) * 100);

      setHud({
        progressPercent,
        status: 'failed',
        elapsedMs,
      });
      onFailRef.current?.({
        progressPercent,
        completionTimeMs: elapsedMs,
      });

      if (autoRestartOnFail) {
        restartTimeout = window.setTimeout(() => {
          resetRun();
        }, AUTO_RESTART_DELAY_MS);
      }
    };

    const markCompleted = (elapsedMs: number) => {
      if (currentStatus !== 'running') {
        return;
      }

      currentStatus = 'completed';
      bumpCamera(6, 0.18);
      setHud({
        progressPercent: 100,
        status: 'completed',
        elapsedMs,
      });
      onCompleteRef.current?.({
        progressPercent: 100,
        completionTimeMs: elapsedMs,
      });
    };

    const loop = (timestamp: number) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }

      const deltaSeconds = Math.min(0.033, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      const pausedElapsedMs =
        pausedDurationMsRef.current +
        (pauseMenuOpenRef.current && pauseStartedAtRef.current !== null ? timestamp - pauseStartedAtRef.current : 0);
      const elapsedMs = Math.max(1, Math.floor(timestamp - startTime - pausedElapsedMs));
      const isPaused = pauseMenuOpenRef.current && currentStatus === 'running';

      if (currentStatus === 'running' && !isPaused) {
        if (player.mode === 'cube' && inputHeldRef.current) {
          jumpBufferedUntil = Math.max(jumpBufferedUntil, timestamp + JUMP_BUFFER_MS);
        }

        const collisionRangeMinX = player.x - 3;
        const collisionRangeMaxX = player.x + player.w + (isLowPowerDevice ? 6 : 8);
        const interactionRangeMinX = player.x - 2;
        const interactionRangeMaxX = player.x + player.w + (isLowPowerDevice ? 8 : 10);
        let movedRuntimeObjects = false;

        for (const [objectId, animation] of moveAnimations) {
          const runtimeObject = getRuntimeObject(objectId);

          if (!runtimeObject) {
            moveAnimations.delete(objectId);
            continue;
          }

          const durationMs = Math.max(1, animation.durationMs);
          const progress = clamp((elapsedMs - animation.startedAt) / durationMs, 0, 1);
          runtimeObject.x = animation.startX + (animation.targetX - animation.startX) * progress;
          runtimeObject.y = animation.startY + (animation.targetY - animation.startY) * progress;
          movedRuntimeObjects = true;

          if (progress >= 1) {
            moveAnimations.delete(objectId);
          }
        }

        if (movedRuntimeObjects) {
          rebuildRuntimeObjectBuckets();
        }

        for (const [objectId, pulse] of pulseOverrides) {
          if (elapsedMs >= pulse.until) {
            pulseOverrides.delete(objectId);
          }
        }

        const horizontalSpeed = BASE_HORIZONTAL_SPEED * player.speedMultiplier;
        const previousX = player.x;
        const previousY = player.y;
        const gravityDirection = Math.sign(player.gravity || 1);

        player.x += horizontalSpeed * deltaSeconds;

        if (player.mode === 'ship') {
          const shipAcceleration = inputHeldRef.current ? -SHIP_THRUST_ACCELERATION : SHIP_FALL_ACCELERATION;
          player.vy += shipAcceleration * gravityDirection * deltaSeconds;
          player.vy = clamp(player.vy, -SHIP_MAX_VERTICAL_SPEED, SHIP_MAX_VERTICAL_SPEED);
        } else if (player.mode === 'arrow') {
          player.vy =
            horizontalSpeed * ARROW_VERTICAL_SPEED_FACTOR * (inputHeldRef.current ? -1 : 1) * gravityDirection;
        } else {
          player.vy += BASE_GRAVITY_ACCELERATION * player.gravity * deltaSeconds;
        }

        player.y += player.vy * deltaSeconds;
        player.grounded = false;

        if (player.mode === 'ship') {
          const shipMinY = SHIP_FLIGHT_CEILING_Y + SHIP_VISUAL_BOUND_PADDING;
          const shipMaxY = SHIP_FLIGHT_FLOOR_Y - player.h - SHIP_VISUAL_BOUND_PADDING;

          if (player.y < shipMinY) {
            player.y = shipMinY;
            player.vy = Math.max(0, player.vy);
          }

          if (player.y > shipMaxY) {
            player.y = shipMaxY;
            player.vy = Math.min(0, player.vy);
          }
        }

        const collisionObjects = getRuntimeObjectsInRange(collisionRangeMinX, collisionRangeMaxX);
        const interactionObjects = getRuntimeObjectsInRange(interactionRangeMinX, interactionRangeMaxX);

        for (const object of collisionObjects) {
          if (
            isRuntimeObjectDisabled(object) ||
            !solidTypes.has(object.type) ||
            !aabbIntersects(player.x, player.y, player.w, player.h, object.x, object.y, object.w, object.h)
          ) {
            continue;
          }

          let resolvedSafely = false;

          if (player.mode === 'arrow') {
            const previousBottom = previousY + player.h;
            const nextBottom = player.y + player.h;
            const previousTop = previousY;
            const nextTop = player.y;
            const ceiling = object.y + object.h;
            const isDashProtected = isArrowProtectedByDashBlock(object, collisionRangeMinX, collisionRangeMaxX);

            if (isDashProtected && previousBottom <= object.y && nextBottom >= object.y && player.vy >= 0) {
              player.y = object.y - player.h;
              player.vy = 0;
              resolvedSafely = true;
            }

            if (isDashProtected && !resolvedSafely && previousTop >= ceiling && nextTop <= ceiling && player.vy <= 0) {
              player.y = ceiling;
              player.vy = 0;
              resolvedSafely = true;
            }

            if (resolvedSafely) {
              continue;
            }

            markFailed(elapsedMs);
            break;
          }

          if (player.mode === 'ship') {
            const previousBottom = previousY + player.h;
            const nextBottom = player.y + player.h;
            const previousTop = previousY;
            const nextTop = player.y;
            const ceiling = object.y + object.h;

            if (previousBottom <= object.y && nextBottom >= object.y && player.vy >= 0) {
              player.y = object.y - player.h;
              player.vy = 0;
              resolvedSafely = true;
            }

            if (!resolvedSafely && previousTop >= ceiling && nextTop <= ceiling && player.vy <= 0) {
              player.y = ceiling;
              player.vy = 0;
              resolvedSafely = true;
            }
          }

          if (!resolvedSafely && player.gravity > 0) {
            const previousBottom = previousY + player.h;
            const nextBottom = player.y + player.h;

            if (previousBottom <= object.y && nextBottom >= object.y && player.vy >= 0) {
              player.y = object.y - player.h;
              player.vy = 0;
              player.grounded = true;
              lastGroundedAt = timestamp;
              resolvedSafely = true;
            }
          } else if (!resolvedSafely) {
            const previousTop = previousY;
            const nextTop = player.y;
            const ceiling = object.y + object.h;

            if (previousTop >= ceiling && nextTop <= ceiling && player.vy <= 0) {
              player.y = ceiling;
              player.vy = 0;
              player.grounded = true;
              lastGroundedAt = timestamp;
              resolvedSafely = true;
            }
          }

          if (!resolvedSafely) {
            markFailed(elapsedMs);
            break;
          }
        }

        if (player.mode === 'cube' && currentStatus === 'running' && jumpBufferedUntil >= timestamp) {
          const jumpVelocity = -DEFAULT_JUMP_VELOCITY * Math.sign(player.gravity || 1);
          const canGroundJump = player.grounded || timestamp - lastGroundedAt <= COYOTE_TIME_MS;

          if (canGroundJump) {
            launchPlayer(jumpVelocity);
            jumpBufferedUntil = 0;
          } else {
            let orb: LevelObject | null = null;

            for (const object of interactionObjects) {
              if (
                object.type !== 'JUMP_ORB' ||
                isRuntimeObjectDisabled(object) ||
                usedOrbs.has(object.id)
              ) {
                continue;
              }

              if (
                aabbIntersects(
                  player.x,
                  player.y,
                  player.w,
                  player.h,
                  object.x - 0.24,
                  object.y - 0.24,
                  object.w + 0.48,
                  object.h + 0.48,
                )
              ) {
                orb = object;
                break;
              }
            }

            if (orb) {
              usedOrbs.add(orb.id);
              launchPlayer(jumpVelocity * 1.18);
              jumpBufferedUntil = 0;
              bumpCamera(4, 0.12);
            }
          }
        }

        for (const object of interactionObjects) {
          if (currentStatus !== 'running') {
            break;
          }

          if (isRuntimeObjectDisabled(object)) {
            continue;
          }

          if (object.type === 'DASH_BLOCK') {
            continue;
          }

          if (hazardTypes.has(object.type) && hazardIntersects(player, object)) {
            markFailed(elapsedMs);
            break;
          }

          if (
            !activeTriggers.has(object.id) &&
            aabbIntersects(player.x, player.y, player.w, player.h, object.x, object.y, object.w, object.h)
          ) {
            activeTriggers.add(object.id);

            if (object.type === 'JUMP_PAD' && player.mode === 'cube') {
              const boost = Number(object.props.boost ?? 16);
              launchPlayer(-boost * Math.sign(player.gravity || 1));
              bumpCamera(5, 0.14);
            }

            if (object.type === 'GRAVITY_PORTAL') {
              player.gravity = Number(object.props.gravity ?? -player.gravity) || -player.gravity;
              player.grounded = false;
            }

            if (object.type === 'SPEED_PORTAL') {
              player.speedMultiplier = Number(object.props.multiplier ?? 1.4);
            }

            if (object.type === 'SHIP_PORTAL') {
              player.mode = 'ship';
              player.grounded = false;
              player.y = clamp(
                player.y,
                SHIP_FLIGHT_CEILING_Y + SHIP_VISUAL_BOUND_PADDING,
                SHIP_FLIGHT_FLOOR_Y - player.h - SHIP_VISUAL_BOUND_PADDING,
              );
              player.vy = clamp(player.vy, -SHIP_MAX_VERTICAL_SPEED, SHIP_MAX_VERTICAL_SPEED);
              bumpCamera(4, 0.12);
            }

            if (object.type === 'CUBE_PORTAL') {
              player.mode = 'cube';
              player.grounded = false;
              player.rotation = snapCubeRotation(player.rotation);
              bumpCamera(4, 0.12);
            }

            if (object.type === 'ARROW_PORTAL') {
              player.mode = 'arrow';
              player.grounded = false;
              player.vy =
                horizontalSpeed * ARROW_VERTICAL_SPEED_FACTOR * (inputHeldRef.current ? -1 : 1) * gravityDirection;
              player.rotation = Math.atan2(player.vy, horizontalSpeed);
              bumpCamera(4, 0.12);
            }

            if (object.type === 'FINISH_PORTAL') {
              markCompleted(elapsedMs);
            }

            if (
              object.type === 'MOVE_TRIGGER' ||
              object.type === 'ALPHA_TRIGGER' ||
              object.type === 'TOGGLE_TRIGGER' ||
              object.type === 'PULSE_TRIGGER'
            ) {
              const targetGroupId = Number(object.props.groupId ?? object.props.paintGroupId ?? 0);

              if (targetGroupId > 0) {
                const targetObjects = getObjectsInPaintGroup(targetGroupId).filter((entry) => entry.id !== object.id);

                if (object.type === 'MOVE_TRIGGER') {
                  const moveX = Number(object.props.moveX ?? 2);
                  const moveY = Number(object.props.moveY ?? 0);
                  const durationMs = Math.max(1, Number(object.props.durationMs ?? 650));

                  for (const target of targetObjects) {
                    moveAnimations.set(target.id, {
                      startX: target.x,
                      startY: target.y,
                      targetX: target.x + moveX,
                      targetY: target.y + moveY,
                      startedAt: elapsedMs,
                      durationMs,
                    });
                  }
                }

                if (object.type === 'ALPHA_TRIGGER') {
                  const alpha = clamp(Number(object.props.alpha ?? 0.35), 0, 1);

                  for (const target of targetObjects) {
                    alphaOverrides.set(target.id, alpha);
                  }
                }

                if (object.type === 'TOGGLE_TRIGGER') {
                  const enabled = Boolean(object.props.enabled ?? false);

                  for (const target of targetObjects) {
                    if (enabled) {
                      disabledObjectIds.delete(target.id);
                    } else {
                      disabledObjectIds.add(target.id);
                    }
                  }
                }

                if (object.type === 'PULSE_TRIGGER') {
                  const durationMs = Math.max(1, Number(object.props.durationMs ?? 900));
                  const fillColor =
                    typeof object.props.fillColor === 'string' && object.props.fillColor.trim().length > 0
                      ? object.props.fillColor
                      : undefined;
                  const strokeColor =
                    typeof object.props.strokeColor === 'string' && object.props.strokeColor.trim().length > 0
                      ? object.props.strokeColor
                      : undefined;

                  for (const target of targetObjects) {
                    pulseOverrides.set(target.id, {
                      fillColor,
                      strokeColor,
                      until: elapsedMs + durationMs,
                    });
                  }
                }
              }
            }
          }
        }

        if (currentStatus === 'running') {
          if (player.mode === 'ship') {
            if (player.x > levelBounds.maxX + 8) {
              markFailed(elapsedMs);
            }
          } else if (player.y > levelBounds.maxY + 3 || player.y < -3 || player.x > levelBounds.maxX + 8) {
            markFailed(elapsedMs);
          }
        }

        if (player.mode === 'ship') {
          const targetRotation = clamp(player.vy * 0.07, -0.58, 0.58);
          player.rotation += (targetRotation - player.rotation) * Math.min(1, deltaSeconds * 10);
        } else if (player.mode === 'arrow') {
          player.rotation = Math.atan2(player.vy, horizontalSpeed);
        } else if (player.grounded) {
          player.rotation = snapCubeRotation(player.rotation);
        } else {
          player.rotation = normalizeAngle(
            player.rotation + AIR_ROTATION_SPEED * deltaSeconds * Math.sign(player.gravity || 1),
          );
        }

        const playerCenterX = player.x + player.w / 2;
        const playerCenterY = player.y + player.h / 2;
        trail.push({
          x: playerCenterX,
          y: playerCenterY,
          alpha: currentStatus === 'running' ? 0.26 : 0.14,
          size: 0.82,
        });

        if (trail.length > (isMobilePreviewPerformanceMode ? 3 : isLowPowerDevice ? 6 : 12)) {
          trail.shift();
        }

        for (const point of trail) {
          point.alpha *= 0.88;
          point.size *= 0.988;
        }

        const previousRight = previousX + player.w;
        const nextRight = player.x + player.w;
        if (previousRight <= levelBounds.maxX && nextRight > levelBounds.maxX + 4) {
          markFailed(elapsedMs);
        }
      }

      const targetCameraX = Math.max(0, player.x * cell - width * 0.28);
      cameraX += (targetCameraX - cameraX) * Math.min(1, deltaSeconds * 8);
      shakeTime = Math.max(0, shakeTime - deltaSeconds);
      const shakeOffsetX = shakeTime > 0 ? (Math.random() - 0.5) * shakePower : 0;
      const progressPercent = clampProgress((player.x / levelBounds.maxX) * 100);

      const hudCommitIntervalMs = isLowPowerDevice ? 120 : 80;
      if (timestamp - lastHudCommit > hudCommitIntervalMs) {
        setHud({
          progressPercent,
          status: currentStatus,
          elapsedMs,
        });
        lastHudCommit = timestamp;
      }

      context.clearRect(0, 0, width, height);
      drawBackdrop(
        context,
        width,
        height,
        elapsedMs,
        levelData.meta.theme,
        isLowPowerDevice,
        isMobilePreviewPerformanceMode,
      );

      context.save();
      context.translate(-(cameraX + shakeOffsetX), 0);

      drawGrid(context, cameraX + shakeOffsetX, verticalOffset, width, height, cell);

      if (player.mode === 'ship') {
        drawShipBounds(context, cameraX + shakeOffsetX, verticalOffset, width, cell);
      }

      context.strokeStyle = 'rgba(202,255,69,0.16)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(cameraX - cell * 2, verticalOffset + cell * 10 + cell);
      context.lineTo(cameraX + width + cell * 5, verticalOffset + cell * 10 + cell);
      context.stroke();

      const drawRangeMinX = (cameraX + shakeOffsetX) / cell - 3;
      const drawRangeMaxX = drawRangeMinX + width / cell + 6;

      const drawObjectsInRange = getRuntimeObjectsInRange(drawRangeMinX, drawRangeMaxX);

      for (const object of drawObjectsInRange) {
        if (isRuntimeObjectDisabled(object) || !objectIntersectsHorizontalRange(object, drawRangeMinX, drawRangeMaxX)) {
          continue;
        }

        const runtimeVisuals = getRuntimeVisuals(object);
        if (runtimeVisuals.alpha <= 0.02) {
          continue;
        }

        const animatedObject =
          object.type === 'SAW_BLADE'
            ? {
                ...object,
                rotation: (object.rotation ?? 0) + (Number(object.props.rotationSpeed ?? 240) * elapsedMs) / 1000,
              }
            : object;

        drawObject(
          context,
          animatedObject,
          cell,
          verticalOffset,
          levelData.meta.colorGroups,
          activeTriggers.has(object.id),
          usedOrbs.has(object.id),
          runtimeVisuals,
        );
      }

      for (const point of trail) {
        if (point.alpha <= 0.02) {
          continue;
        }

        const size = point.size * cell;
        context.fillStyle = `rgba(202,255,69,${point.alpha})`;
        context.fillRect(point.x * cell - size / 2, verticalOffset + point.y * cell - size / 2, size, size);
      }

      drawPlayer(context, player, cell, verticalOffset);
      context.restore();

      if (currentStatus === 'failed' || currentStatus === 'completed') {
        context.fillStyle = 'rgba(3, 8, 20, 0.68)';
        context.fillRect(0, 0, width, height);
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.font = '700 38px Segoe UI';
        context.fillText(currentStatus === 'completed' ? 'Level Complete' : 'Attempt Lost', width / 2, height / 2 - 10);
        context.font = '600 16px Segoe UI';
        context.fillStyle = 'rgba(255,255,255,0.82)';
        if (!isExternallyManagedRun) {
          context.fillText('Click or press R to restart', width / 2, height / 2 + 28);
        }
      }

      animationFrame = window.requestAnimationFrame(loop);
    };

    animationFrame = window.requestAnimationFrame(loop);

    return () => {
      if (restartTimeout) {
        window.clearTimeout(restartTimeout);
      }

      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('keydown', keyListener);
      window.removeEventListener('keyup', keyUpListener);
      window.removeEventListener('pointerup', releaseHeldInput);
      window.removeEventListener('pointercancel', releaseHeldInput);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', releaseAllHeldInput);
      window.removeEventListener('touchend', handleTouchRelease);
      window.removeEventListener('touchcancel', handleTouchRelease);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.removeEventListener('pointerdown', pointerDownListener);
    };
  }, [autoRestartOnFail, fullscreen, levelBounds.maxX, levelBounds.maxY, levelData, onComplete, onFail, previewBootstrap, previewStartPosEnabled, runId, runtimeMusicOffsetMs]);

      if (fullscreen) {
    return (
      <div className={cn('arcade-runtime-fullscreen', className)}>
        <div className="arcade-runtime-fullscreen-stage">
          <canvas ref={canvasRef} className="arcade-runtime-canvas arcade-runtime-canvas--fullscreen" />
          {isHudVisible ? (
            <>
              <div className="arcade-runtime-hud arcade-runtime-hud--top-left">
                <span
                  className={cn(
                    'arcade-runtime-hud-badge',
                    hud.status === 'completed'
                      ? 'arcade-runtime-hud-badge--complete'
                      : hud.status === 'failed'
                        ? 'arcade-runtime-hud-badge--failed'
                        : 'arcade-runtime-hud-badge--running',
                  )}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="arcade-runtime-hud arcade-runtime-hud--top-right">
                <HudStat label="Attempt" value={attemptNumber} compact />
                <HudStat label="Progress" value={`${hud.progressPercent}%`} compact />
                <HudStat label="Time" value={`${(hud.elapsedMs / 1000).toFixed(1)}s`} compact />
              </div>
            </>
          ) : null}
          {isPauseMenuOpen ? (
            <div className="arcade-runtime-pause-overlay" role="dialog" aria-modal="true" aria-label="Paused game menu">
              <div className="arcade-runtime-pause-panel">
                <p className="arcade-runtime-pause-kicker">Paused</p>
                <div className="arcade-runtime-pause-actions">
                  <button
                    type="button"
                    className="arcade-runtime-pause-action arcade-runtime-pause-action--continue"
                    onClick={closePauseMenu}
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'arcade-runtime-pause-action arcade-runtime-pause-action--settings',
                      isPauseSettingsOpen ? 'is-active' : '',
                    )}
                    onClick={togglePauseSettings}
                    aria-pressed={isPauseSettingsOpen}
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    className="arcade-runtime-pause-action arcade-runtime-pause-action--exit"
                    onClick={handleExitToMenu}
                  >
                    Exit Menu
                  </button>
                </div>
                {isPauseSettingsOpen ? (
                  <div className="arcade-runtime-pause-settings">
                    <button
                      type="button"
                      className="arcade-runtime-pause-toggle"
                      onClick={() => setIsHudVisible((current) => !current)}
                      aria-pressed={isHudVisible}
                    >
                      <span>HUD</span>
                      <strong>{isHudVisible ? 'On' : 'Off'}</strong>
                    </button>
                    <button
                      type="button"
                      className="arcade-runtime-pause-toggle"
                      onClick={() => setIsScreenShakeEnabled((current) => !current)}
                      aria-pressed={isScreenShakeEnabled}
                    >
                      <span>Shake</span>
                      <strong>{isScreenShakeEnabled ? 'On' : 'Off'}</strong>
                    </button>
                  </div>
                ) : null}
                <p className="arcade-runtime-pause-hint">Press Esc to resume instantly.</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Panel className={cn('arcade-runtime-frame game-screen space-y-4 bg-transparent', className)}>
      <div className="arcade-runtime-bar flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-[11px] tracking-[0.24em] text-[#ffd44a]">Runtime</p>
            <span
              className={cn(
                'arcade-button inline-flex items-center px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]',
                hud.status === 'completed'
                  ? 'bg-[linear-gradient(180deg,#caff52,#69d70d)] text-[#173300]'
                  : hud.status === 'failed'
                    ? 'bg-[linear-gradient(180deg,#ff7c8f,#eb375a)] text-white'
                    : 'bg-[linear-gradient(180deg,#7e2ae6,#5910be)] text-white',
              )}
            >
              {statusLabel}
            </span>
          </div>
          <div>
            <h3 className="font-display text-2xl text-[#caff45]">{levelData.meta.theme}</h3>
            <p className="text-sm text-white/72">
              {playerModeLabel} mode / {getPlayerModeDescription(levelData.player.mode)}
            </p>
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          <HudStat label="Attempt" value={attemptNumber} />
          <HudStat label="Progress" value={`${hud.progressPercent}%`} />
          <HudStat label="Time" value={`${(hud.elapsedMs / 1000).toFixed(1)}s`} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="progress-lane">
          <div className="progress-lane-fill transition-[width] duration-150" style={{ width: `${hud.progressPercent}%` }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] text-white/70">
          <span>Readable hitboxes</span>
          <span>Jump buffer + coyote time</span>
          <span>{onFail || onComplete ? 'Session managed' : 'R = restart'}</span>
        </div>
      </div>

      <div className="arcade-runtime-stage">
        <canvas ref={canvasRef} className="arcade-runtime-canvas" />
      </div>

      <p className="arcade-runtime-footer text-xs leading-6 text-white/72">
        Controls: <span className="text-white">Space</span>, click, or tap to{' '}
        {levelData.player.mode === 'ship'
          ? 'thrust upward'
          : levelData.player.mode === 'arrow'
            ? 'rise diagonally'
            : 'jump'}.
        {!onFail && !onComplete ? (
          <>
            {' '}
            <span className="text-white">R</span> restarts instantly.
          </>
        ) : null}{' '}
        {levelData.player.mode === 'ship'
          ? 'Ship runs stay between the top and bottom flight bounds, and any wall contact still punishes sloppy routing.'
          : levelData.player.mode === 'arrow'
            ? 'Arrow runs trace diagonal lines, and any wall or ramp contact immediately breaks the run.'
            : 'Jump inputs are buffered briefly, spikes use a fairer hitbox, and side collisions still punish sloppy routing.'}
      </p>
    </Panel>
  );
}

function HudStat({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className={cn('hud-pill px-4 py-2', compact ? 'arcade-runtime-hud-pill' : '')}>
      <p className="font-display text-[10px] uppercase tracking-[0.2em] text-[#ffd44a]">{label}</p>
      <p className={cn('font-display text-white', compact ? 'text-xs' : 'text-sm')}>{value}</p>
    </div>
  );
}

function drawObject(
  context: CanvasRenderingContext2D,
  object: LevelData['objects'][number],
  cell: number,
  verticalOffset: number,
  colorGroups: LevelData['meta']['colorGroups'],
  isActive: boolean,
  isUsedOrb: boolean,
  visualOverride?: {
    fillColor: string;
    strokeColor: string;
    alpha: number;
  },
) {
  if (object.type === 'DASH_BLOCK') {
    return;
  }

  const x = object.x * cell;
  const y = verticalOffset + object.y * cell;
  const w = object.w * cell;
  const h = object.h * cell;
  const fillColor = visualOverride?.fillColor ?? getObjectFillColor(object, colorGroups);
  const strokeColor = visualOverride?.strokeColor ?? getObjectStrokeColor(object, colorGroups);
  drawStageObjectSprite({
    context,
    object,
    x,
    y,
    w,
    h,
    fillColor,
    strokeColor,
    isActive,
    isUsedOrb,
    alpha: visualOverride?.alpha ?? 1,
  });
}

function drawPlayer(context: CanvasRenderingContext2D, player: PlayerState, cell: number, verticalOffset: number) {
  const playerX = player.x * cell;
  const playerY = verticalOffset + player.y * cell;
  const sizeW = player.w * cell;
  const sizeH = player.h * cell;

  context.save();
  context.translate(playerX + sizeW / 2, playerY + sizeH / 2);
  context.rotate(player.rotation);

  if (player.mode === 'ship') {
    const bodyLength = sizeW * 0.84;
    const bodyHeight = sizeH * 0.54;
    const halfLength = bodyLength / 2;
    const halfHeight = bodyHeight / 2;
    const cubeSize = Math.min(sizeW, sizeH) * 0.3;

    context.fillStyle = '#101a2a';
    context.beginPath();
    context.moveTo(halfLength, 0);
    context.lineTo(halfLength * 0.18, -halfHeight);
    context.lineTo(-halfLength * 0.9, -halfHeight * 0.9);
    context.lineTo(-halfLength, 0);
    context.lineTo(-halfLength * 0.9, halfHeight * 0.9);
    context.lineTo(halfLength * 0.18, halfHeight);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.beginPath();
    context.moveTo(halfLength * 0.94, 0);
    context.lineTo(halfLength * 0.14, -halfHeight * 0.94);
    context.lineTo(-halfLength * 0.74, -halfHeight * 0.76);
    context.lineTo(-halfLength * 0.88, 0);
    context.lineTo(-halfLength * 0.74, halfHeight * 0.76);
    context.lineTo(halfLength * 0.14, halfHeight * 0.94);
    context.closePath();
    context.fill();
    context.strokeStyle = '#182133';
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = '#67ff9f';
    context.beginPath();
    context.moveTo(-halfLength * 0.2, 0);
    context.lineTo(halfLength * 0.46, -halfHeight * 0.6);
    context.lineTo(halfLength * 0.16, 0);
    context.lineTo(halfLength * 0.46, halfHeight * 0.6);
    context.closePath();
    context.fill();

    context.fillStyle = '#dffcff';
    context.beginPath();
    context.moveTo(halfLength * 0.2, 0);
    context.lineTo(-halfLength * 0.12, -halfHeight * 0.42);
    context.lineTo(-halfLength * 0.34, 0);
    context.lineTo(-halfLength * 0.12, halfHeight * 0.42);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.fillRect(-halfLength * 0.64, -cubeSize / 2, cubeSize, cubeSize);
    context.strokeStyle = '#182133';
    context.lineWidth = 2.5;
    context.strokeRect(-halfLength * 0.64, -cubeSize / 2, cubeSize, cubeSize);

    context.fillStyle = '#182133';
    context.fillRect(-halfLength * 0.56, -cubeSize * 0.2, cubeSize * 0.12, cubeSize * 0.12);
    context.fillRect(-halfLength * 0.42, -cubeSize * 0.2, cubeSize * 0.12, cubeSize * 0.12);
    context.fillRect(-halfLength * 0.56, cubeSize * 0.12, cubeSize * 0.26, cubeSize * 0.08);

    context.fillStyle = '#79f7ff';
    context.fillRect(-halfLength * 0.06, -cubeSize * 0.24, cubeSize * 0.2, cubeSize * 0.48);

    context.restore();
    return;
  }

  if (player.mode === 'arrow') {
    const bodyLength = sizeW * 0.94;
    const bodyHeight = sizeH * 0.58;
    const halfLength = bodyLength / 2;
    const halfHeight = bodyHeight / 2;
    const pilotSize = Math.min(sizeW, sizeH) * 0.24;

    context.fillStyle = '#132339';
    context.beginPath();
    context.moveTo(-halfLength * 0.9, 0);
    context.lineTo(-halfLength * 0.18, -halfHeight);
    context.lineTo(halfLength, 0);
    context.lineTo(-halfLength * 0.18, halfHeight);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.beginPath();
    context.moveTo(-halfLength * 0.76, 0);
    context.lineTo(-halfLength * 0.08, -halfHeight * 0.88);
    context.lineTo(halfLength * 0.92, 0);
    context.lineTo(-halfLength * 0.08, halfHeight * 0.88);
    context.closePath();
    context.fill();
    context.strokeStyle = '#182133';
    context.lineWidth = 2.6;
    context.stroke();

    context.fillStyle = '#63ffbd';
    context.beginPath();
    context.moveTo(-halfLength * 0.06, -halfHeight * 0.54);
    context.lineTo(halfLength * 0.3, 0);
    context.lineTo(-halfLength * 0.06, halfHeight * 0.54);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.fillRect(-halfLength * 0.54, -pilotSize / 2, pilotSize, pilotSize);
    context.strokeStyle = '#182133';
    context.lineWidth = 2;
    context.strokeRect(-halfLength * 0.54, -pilotSize / 2, pilotSize, pilotSize);
    context.fillStyle = '#182133';
    context.fillRect(-halfLength * 0.48, -pilotSize * 0.2, pilotSize * 0.1, pilotSize * 0.1);
    context.fillRect(-halfLength * 0.36, -pilotSize * 0.2, pilotSize * 0.1, pilotSize * 0.1);
    context.fillRect(-halfLength * 0.48, pilotSize * 0.12, pilotSize * 0.22, pilotSize * 0.07);

    context.restore();
    return;
  }

  context.fillStyle = '#f4f7ff';
  context.fillRect(-sizeW / 2, -sizeH / 2, sizeW, sizeH);
  context.strokeStyle = '#182133';
  context.lineWidth = 3;
  context.strokeRect(-sizeW / 2, -sizeH / 2, sizeW, sizeH);

  context.fillStyle = '#182133';
  context.fillRect(-sizeW * 0.18, -sizeH * 0.18, sizeW * 0.12, sizeH * 0.12);
  context.fillRect(sizeW * 0.06, -sizeH * 0.18, sizeW * 0.12, sizeH * 0.12);
  context.fillRect(-sizeW * 0.18, sizeH * 0.12, sizeW * 0.36, sizeH * 0.08);
  context.restore();
}

function drawShipBounds(
  context: CanvasRenderingContext2D,
  cameraX: number,
  verticalOffset: number,
  width: number,
  cell: number,
) {
  const ceilingY = verticalOffset + SHIP_FLIGHT_CEILING_Y * cell;
  const floorY = verticalOffset + SHIP_FLIGHT_FLOOR_Y * cell;
  const startX = cameraX - cell * 2;
  const endX = cameraX + width + cell * 5;

  context.fillStyle = 'rgba(3, 7, 22, 0.22)';
  context.fillRect(startX, verticalOffset - cell * 12, endX - startX, ceilingY - (verticalOffset - cell * 12));
  context.fillRect(startX, floorY, endX - startX, cell * 12);

  context.strokeStyle = 'rgba(202,255,69,0.78)';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(startX, ceilingY);
  context.lineTo(endX, ceilingY);
  context.moveTo(startX, floorY);
  context.lineTo(endX, floorY);
  context.stroke();
}

function aabbIntersects(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function spikeIntersects(player: PlayerState, object: LevelData['objects'][number]) {
  const hitbox = getSpikeHitbox(object);

  return aabbIntersects(
    player.x,
    player.y,
    player.w,
    player.h,
    hitbox.x,
    hitbox.y,
    hitbox.w,
    hitbox.h,
  );
}

function getSpikeHitbox(object: LevelData['objects'][number]) {
  const normalizedRotation = normalizeQuarterRotationDegrees(object.rotation ?? 0);
  const centerInsetX = object.w * 0.34;
  const centerInsetY = object.h * 0.2;
  const narrowWidth = object.w * 0.32;
  const narrowHeight = object.h * 0.58;

  if (normalizedRotation === 90) {
    return {
      x: object.x + centerInsetY,
      y: object.y + centerInsetX,
      w: narrowHeight,
      h: narrowWidth,
    };
  }

  if (normalizedRotation === 180) {
    return {
      x: object.x + centerInsetX,
      y: object.y + object.h - centerInsetY - narrowHeight,
      w: narrowWidth,
      h: narrowHeight,
    };
  }

  if (normalizedRotation === 270) {
    return {
      x: object.x + object.w - centerInsetY - narrowHeight,
      y: object.y + centerInsetX,
      w: narrowHeight,
      h: narrowWidth,
    };
  }

  return {
    x: object.x + centerInsetX,
    y: object.y + centerInsetY,
    w: narrowWidth,
    h: narrowHeight,
  };
}

function sawIntersects(player: PlayerState, object: LevelData['objects'][number]) {
  const centerX = object.x + object.w / 2;
  const centerY = object.y + object.h / 2;
  const radius = Math.max(0.18, Math.min(object.w, object.h) * 0.42);
  const nearestX = clamp(centerX, player.x, player.x + player.w);
  const nearestY = clamp(centerY, player.y, player.y + player.h);
  const deltaX = centerX - nearestX;
  const deltaY = centerY - nearestY;

  return deltaX * deltaX + deltaY * deltaY <= radius * radius;
}

function getArrowRampTriangle(object: LevelData['objects'][number]) {
  const centerX = object.x + object.w / 2;
  const centerY = object.y + object.h / 2;
  const normalizedRotation = normalizeQuarterRotationDegrees(object.rotation ?? 0);

  const baseVertices =
    object.type === 'ARROW_RAMP_ASC'
      ? [
          { x: object.x, y: object.y + object.h },
          { x: object.x + object.w, y: object.y + object.h },
          { x: object.x + object.w, y: object.y },
        ]
      : [
          { x: object.x, y: object.y },
          { x: object.x, y: object.y + object.h },
          { x: object.x + object.w, y: object.y + object.h },
        ];

  if (normalizedRotation === 0) {
    return baseVertices;
  }

  const angle = (normalizedRotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return baseVertices.map((point) => {
    const offsetX = point.x - centerX;
    const offsetY = point.y - centerY;

    return {
      x: centerX + offsetX * cos - offsetY * sin,
      y: centerY + offsetX * sin + offsetY * cos,
    };
  });
}

function triangleIntersectsAabb(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  triangle: Array<{ x: number; y: number }>,
) {
  const rectCorners = [
    { x: ax, y: ay },
    { x: ax + aw, y: ay },
    { x: ax + aw, y: ay + ah },
    { x: ax, y: ay + ah },
  ];

  if (rectCorners.some((corner) => pointInTriangle(corner, triangle[0], triangle[1], triangle[2]))) {
    return true;
  }

  if (triangle.some((point) => point.x >= ax && point.x <= ax + aw && point.y >= ay && point.y <= ay + ah)) {
    return true;
  }

  const rectEdges = [
    [rectCorners[0], rectCorners[1]],
    [rectCorners[1], rectCorners[2]],
    [rectCorners[2], rectCorners[3]],
    [rectCorners[3], rectCorners[0]],
  ] as const;
  const triangleEdges = [
    [triangle[0], triangle[1]],
    [triangle[1], triangle[2]],
    [triangle[2], triangle[0]],
  ] as const;

  return triangleEdges.some(([startA, endA]) =>
    rectEdges.some(([startB, endB]) => segmentsIntersect(startA, endA, startB, endB)),
  );
}

function pointInTriangle(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) {
  const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);

  if (Math.abs(denominator) < 1e-6) {
    return false;
  }

  const alpha = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denominator;
  const beta = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denominator;
  const gamma = 1 - alpha - beta;

  return alpha >= 0 && beta >= 0 && gamma >= 0;
}

function segmentsIntersect(
  aStart: { x: number; y: number },
  aEnd: { x: number; y: number },
  bStart: { x: number; y: number },
  bEnd: { x: number; y: number },
) {
  const aDx = aEnd.x - aStart.x;
  const aDy = aEnd.y - aStart.y;
  const bDx = bEnd.x - bStart.x;
  const bDy = bEnd.y - bStart.y;
  const denominator = aDx * bDy - aDy * bDx;

  if (Math.abs(denominator) < 1e-6) {
    return false;
  }

  const startDx = bStart.x - aStart.x;
  const startDy = bStart.y - aStart.y;
  const ua = (startDx * bDy - startDy * bDx) / denominator;
  const ub = (startDx * aDy - startDy * aDx) / denominator;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function arrowRampIntersects(player: PlayerState, object: LevelData['objects'][number]) {
  const triangle = getArrowRampTriangle(object);
  return triangleIntersectsAabb(player.x, player.y, player.w, player.h, triangle);
}

function hazardIntersects(player: PlayerState, object: LevelData['objects'][number]) {
  if (object.type === 'SPIKE') {
    return spikeIntersects(player, object);
  }

  if (object.type === 'SAW_BLADE') {
    return sawIntersects(player, object);
  }

  if (object.type === 'ARROW_RAMP_ASC' || object.type === 'ARROW_RAMP_DESC') {
    return arrowRampIntersects(player, object);
  }

  return false;
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildRuntimeObjectBuckets(objects: LevelObject[]) {
  const buckets = new Map<number, number[]>();

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index];
    const startBucket = Math.floor(object.x / RUNTIME_BUCKET_WIDTH_UNITS);
    const endBucket = Math.floor((object.x + object.w) / RUNTIME_BUCKET_WIDTH_UNITS);

    for (let bucket = startBucket; bucket <= endBucket; bucket += 1) {
      const bucketEntries = buckets.get(bucket);

      if (bucketEntries) {
        bucketEntries.push(index);
      } else {
        buckets.set(bucket, [index]);
      }
    }
  }

  return buckets;
}

function buildRuntimePaintGroupMap(objects: LevelObject[]) {
  const paintGroups = new Map<number, LevelObject[]>();

  for (const object of objects) {
    const groupId = getObjectPaintGroupId(object);

    if (!groupId) {
      continue;
    }

    const entries = paintGroups.get(groupId);

    if (entries) {
      entries.push(object);
    } else {
      paintGroups.set(groupId, [object]);
    }
  }

  return paintGroups;
}

function objectIntersectsHorizontalRange(object: LevelObject, minX: number, maxX: number) {
  return object.x <= maxX && object.x + object.w >= minX;
}

function buildPreviewBootstrap(
  levelData: LevelData,
  previewStartPos: {
    x: number;
    y: number;
  } | null,
): PreviewBootstrap {
  const bootstrap: PreviewBootstrap = {
    startX: previewStartPos?.x ?? levelData.player.startX,
    startY: previewStartPos?.y ?? levelData.player.startY,
    speedMultiplier: levelData.player.baseSpeed,
    gravity: levelData.player.gravity,
    mode: levelData.player.mode,
    elapsedMs: 0,
  };

  if (!previewStartPos || previewStartPos.x <= levelData.player.startX) {
    return bootstrap;
  }

  const relevantPortals = levelData.objects
    .filter((object) => {
      if (object.x > previewStartPos.x) {
        return false;
      }

      return (
        object.type === 'SPEED_PORTAL' ||
        object.type === 'GRAVITY_PORTAL' ||
        object.type === 'SHIP_PORTAL' ||
        object.type === 'CUBE_PORTAL' ||
        object.type === 'ARROW_PORTAL'
      );
    })
    .sort((left, right) => left.x - right.x || left.y - right.y);

  let cursorX = levelData.player.startX;
  let elapsedMs = 0;
  let currentSpeedMultiplier = Math.max(0.1, levelData.player.baseSpeed);

  for (const portal of relevantPortals) {
    const portalX = clamp(portal.x, cursorX, previewStartPos.x);

    if (portalX > cursorX) {
      elapsedMs += ((portalX - cursorX) / (BASE_HORIZONTAL_SPEED * currentSpeedMultiplier)) * 1000;
      cursorX = portalX;
    }

    if (portal.type === 'SPEED_PORTAL') {
      const nextMultiplier = Number(portal.props.multiplier ?? currentSpeedMultiplier);
      if (Number.isFinite(nextMultiplier) && nextMultiplier > 0) {
        currentSpeedMultiplier = nextMultiplier;
        bootstrap.speedMultiplier = nextMultiplier;
      }
    }

    if (portal.type === 'GRAVITY_PORTAL') {
      const nextGravity = Number(portal.props.gravity ?? bootstrap.gravity);
      if (Number.isFinite(nextGravity) && nextGravity !== 0) {
        bootstrap.gravity = nextGravity;
      }
    }

    if (portal.type === 'SHIP_PORTAL') {
      bootstrap.mode = 'ship';
    }

    if (portal.type === 'CUBE_PORTAL') {
      bootstrap.mode = 'cube';
    }

    if (portal.type === 'ARROW_PORTAL') {
      bootstrap.mode = 'arrow';
    }
  }

  if (previewStartPos.x > cursorX) {
    elapsedMs += ((previewStartPos.x - cursorX) / (BASE_HORIZONTAL_SPEED * currentSpeedMultiplier)) * 1000;
  }

  bootstrap.elapsedMs = Math.max(0, Math.round(elapsedMs));
  return bootstrap;
}

function normalizeAngle(value: number) {
  const fullTurn = Math.PI * 2;
  return ((value % fullTurn) + fullTurn) % fullTurn;
}

function normalizeQuarterRotationDegrees(value: number) {
  const normalized = ((Math.round(value / 90) * 90) % 360 + 360) % 360;
  return normalized === 360 ? 0 : normalized;
}

function snapCubeRotation(value: number) {
  return normalizeAngle(Math.round(value / QUARTER_TURN) * QUARTER_TURN);
}

function drawBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedMs: number,
  theme: string,
  lowPower = false,
  ultraLowPower = false,
) {
  const stageTheme = getStageThemePalette(theme);
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, stageTheme.runtimeGradientTop);
  gradient.addColorStop(0.45, stageTheme.runtimeGradientMid);
  gradient.addColorStop(1, stageTheme.runtimeGradientBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width * 0.74, height * 0.18, 0, width * 0.74, height * 0.18, width * 0.42);
  glow.addColorStop(0, stageTheme.runtimeGlowColor);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  const drift = (elapsedMs / 1000) * (ultraLowPower ? 10 : 16);
  const starCount = ultraLowPower ? 12 : lowPower ? 24 : 56;
  const panelStride = ultraLowPower ? 196 : lowPower ? 156 : 120;

  context.fillStyle = stageTheme.runtimeStarColor;
  for (let index = 0; index < starCount; index += 1) {
    const starX = (((index * 97.37) % (width + 240)) - 120 + drift * (0.18 + (index % 5) * 0.03) + width) % width;
    const starY = ((index * 63.17) % (height * 0.8)) + 10;
    const size = index % 7 === 0 ? 2.2 : index % 3 === 0 ? 1.5 : 1;
    context.fillRect(starX, starY, size, size);
  }

  context.fillStyle = stageTheme.runtimePanelTint;
  const panelYStride = ultraLowPower ? 168 : 120;
  const panelSize = ultraLowPower ? 64 : 82;

  for (let x = -120; x < width + 120; x += panelStride) {
    for (let y = 18; y < height; y += panelYStride) {
      context.fillRect(x + (drift % panelStride), y, panelSize, panelSize);
    }
  }

  context.fillStyle = stageTheme.runtimeAccentPrimary;
  context.fillRect(0, height * 0.72, width, 3);
  context.fillStyle = stageTheme.runtimeAccentSecondary;
  context.fillRect(0, height * 0.28, width, 2);
}

function drawGrid(
  context: CanvasRenderingContext2D,
  cameraX: number,
  verticalOffset: number,
  width: number,
  height: number,
  cell: number,
) {
  context.strokeStyle = 'rgba(255,255,255,0.08)';
  context.lineWidth = 1;

  const startX = -((cameraX % cell) + cell);
  for (let x = startX; x < width + cell; x += cell) {
    context.beginPath();
    context.moveTo(x + cameraX, 0);
    context.lineTo(x + cameraX, height);
    context.stroke();
  }

  for (let y = verticalOffset - cell; y < height + cell; y += cell) {
    context.beginPath();
    context.moveTo(cameraX, y);
    context.lineTo(cameraX + width + cell * 3, y);
    context.stroke();
  }
}
