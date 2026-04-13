import { useEffect, useMemo, useRef, useState } from 'react';
import { getObjectFillColor, getObjectStrokeColor } from './object-definitions';
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
import type { LevelData } from '../../types/models';
import { Panel } from '../../components/ui';
import { cn } from '../../utils/cn';

type GameCanvasProps = {
  levelData: LevelData;
  attemptNumber?: number;
  runId?: string | number;
  autoRestartOnFail?: boolean;
  fullscreen?: boolean;
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

const solidTypes = new Set(['GROUND_BLOCK', 'HALF_GROUND_BLOCK', 'PLATFORM_BLOCK', 'HALF_PLATFORM_BLOCK']);
const hazardTypes = new Set(['SPIKE']);
const JUMP_BUFFER_MS = 130;
const COYOTE_TIME_MS = 110;
const AUTO_RESTART_DELAY_MS = 850;
const BASE_HORIZONTAL_SPEED = 6.15;
const BASE_GRAVITY_ACCELERATION = 55;
const DEFAULT_JUMP_VELOCITY = 15.5;
const AIR_ROTATION_SPEED = Math.PI * 1.6;
const QUARTER_TURN = Math.PI / 2;
const GAMEPLAY_INPUT_CODES = new Set(['Space', 'ArrowUp', 'KeyW']);

export function GameCanvas({
  levelData,
  attemptNumber = 1,
  runId = 0,
  autoRestartOnFail = false,
  fullscreen = false,
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

    void nextAudio.play().catch(() => {});

    return () => {
      nextAudio.pause();
      nextAudio.src = '';

      if (audioRef.current === nextAudio) {
        audioRef.current = null;
      }
    };
  }, [resolvedMusic.src, runId]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const width = 960;
    const height = 540;
    const isExternallyManagedRun = Boolean(onFail || onComplete);
    canvas.width = width;
    canvas.height = height;

    const cell = 36;
    const verticalOffset = Math.max(40, height - levelBounds.maxY * cell - 50);
    const player: PlayerState = {
      x: levelData.player.startX,
      y: levelData.player.startY,
      w: 0.82,
      h: 0.82,
      vy: 0,
      rotation: 0,
      grounded: false,
      gravity: levelData.player.gravity,
      speedMultiplier: levelData.player.baseSpeed,
      mode: levelData.player.mode,
    };

    const activeTriggers = new Set<string>();
    const usedOrbs = new Set<string>();
    const trail: TrailPoint[] = [];
    let animationFrame = 0;
    let lastTimestamp = 0;
    let startTime = performance.now();
    let jumpBufferedUntil = 0;
    let lastGroundedAt = 0;
    let currentStatus: 'running' | 'failed' | 'completed' = 'running';
    let lastHudCommit = 0;
    let cameraX = 0;
    let shakeTime = 0;
    let shakePower = 0;
    let restartTimeout = 0;

    const resetRun = (timestamp = performance.now()) => {
      if (restartTimeout) {
        window.clearTimeout(restartTimeout);
      }

      startTime = timestamp;
      lastTimestamp = timestamp;
      jumpBufferedUntil = 0;
      lastGroundedAt = 0;
      player.x = levelData.player.startX;
      player.y = levelData.player.startY;
      player.vy = 0;
      player.rotation = 0;
      player.gravity = levelData.player.gravity;
      player.speedMultiplier = levelData.player.baseSpeed;
      player.mode = levelData.player.mode;
      player.grounded = false;
      inputHeldRef.current = false;
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.volume = readStoredMusicVolume();
        void audioRef.current.play().catch(() => {});
      }
      currentStatus = 'running';
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
        progressPercent: 0,
        status: 'running',
        elapsedMs: 0,
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

    const ensureAudioPlayback = () => {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      audio.volume = readStoredMusicVolume();

      if (audio.paused) {
        void audio.play().catch(() => {});
      }
    };

    const queueJump = (timestamp = performance.now()) => {
      if (currentStatus !== 'running') {
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
        inputHeldRef.current = true;
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
        inputHeldRef.current = false;
      }
    };

    const pointerDownListener = () => {
      if (pauseMenuOpenRef.current) {
        return;
      }

      inputHeldRef.current = true;
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

    const releaseHeldInput = () => {
      inputHeldRef.current = false;
    };

    window.addEventListener('keydown', keyListener);
    window.addEventListener('keyup', keyUpListener);
    window.addEventListener('pointerup', releaseHeldInput);
    window.addEventListener('blur', releaseHeldInput);
    canvas.addEventListener('pointerdown', pointerDownListener);

    const markFailed = (elapsedMs: number) => {
      if (currentStatus !== 'running') {
        return;
      }

      currentStatus = 'failed';
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
        const horizontalSpeed = BASE_HORIZONTAL_SPEED * player.speedMultiplier;
        const previousX = player.x;
        const previousY = player.y;
        const gravityDirection = Math.sign(player.gravity || 1);

        player.x += horizontalSpeed * deltaSeconds;

        if (player.mode === 'ship') {
          const shipAcceleration = inputHeldRef.current ? -SHIP_THRUST_ACCELERATION : SHIP_FALL_ACCELERATION;
          player.vy += shipAcceleration * gravityDirection * deltaSeconds;
          player.vy = clamp(player.vy, -SHIP_MAX_VERTICAL_SPEED, SHIP_MAX_VERTICAL_SPEED);
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

        for (const object of levelData.objects) {
          if (
            !solidTypes.has(object.type) ||
            !aabbIntersects(player.x, player.y, player.w, player.h, object.x, object.y, object.w, object.h)
          ) {
            continue;
          }

          let resolvedSafely = false;

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
            const orb = levelData.objects.find(
              (object) =>
                object.type === 'JUMP_ORB' &&
                !usedOrbs.has(object.id) &&
                aabbIntersects(
                  player.x,
                  player.y,
                  player.w,
                  player.h,
                  object.x - 0.24,
                  object.y - 0.24,
                  object.w + 0.48,
                  object.h + 0.48,
                ),
            );

            if (orb) {
              usedOrbs.add(orb.id);
              launchPlayer(jumpVelocity * 1.18);
              jumpBufferedUntil = 0;
              bumpCamera(4, 0.12);
            }
          }
        }

        for (const object of levelData.objects) {
          if (currentStatus !== 'running') {
            break;
          }

          if (hazardTypes.has(object.type) && spikeIntersects(player, object)) {
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

            if (object.type === 'FINISH_PORTAL') {
              markCompleted(elapsedMs);
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

        if (trail.length > 12) {
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

      if (timestamp - lastHudCommit > 80) {
        setHud({
          progressPercent,
          status: currentStatus,
          elapsedMs,
        });
        lastHudCommit = timestamp;
      }

      context.clearRect(0, 0, width, height);
      drawBackdrop(context, width, height, elapsedMs, levelData.meta.theme);

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

      for (const object of levelData.objects) {
        drawObject(
          context,
          object,
          cell,
          verticalOffset,
          levelData.meta.colorGroups,
          activeTriggers.has(object.id),
          usedOrbs.has(object.id),
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
      window.removeEventListener('blur', releaseHeldInput);
      canvas.removeEventListener('pointerdown', pointerDownListener);
    };
  }, [autoRestartOnFail, fullscreen, levelBounds.maxX, levelBounds.maxY, levelData, onComplete, onFail, runId]);

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
        {levelData.player.mode === 'ship' ? 'thrust upward' : 'jump'}.
        {!onFail && !onComplete ? (
          <>
            {' '}
            <span className="text-white">R</span> restarts instantly.
          </>
        ) : null}{' '}
        {levelData.player.mode === 'ship'
          ? 'Ship runs stay between the top and bottom flight bounds, and any wall contact still punishes sloppy routing.'
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
) {
  const x = object.x * cell;
  const y = verticalOffset + object.y * cell;
  const w = object.w * cell;
  const h = object.h * cell;
  const fillColor = getObjectFillColor(object, colorGroups);
  const strokeColor = getObjectStrokeColor(object, colorGroups);
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
  return aabbIntersects(
    player.x,
    player.y,
    player.w,
    player.h,
    object.x + 0.18,
    object.y + 0.26,
    Math.max(0.2, object.w - 0.36),
    Math.max(0.2, object.h - 0.26),
  );
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngle(value: number) {
  const fullTurn = Math.PI * 2;
  return ((value % fullTurn) + fullTurn) % fullTurn;
}

function snapCubeRotation(value: number) {
  return normalizeAngle(Math.round(value / QUARTER_TURN) * QUARTER_TURN);
}

function drawBackdrop(context: CanvasRenderingContext2D, width: number, height: number, elapsedMs: number, theme: string) {
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

  const drift = (elapsedMs / 1000) * 16;

  context.fillStyle = stageTheme.runtimeStarColor;
  for (let index = 0; index < 56; index += 1) {
    const starX = (((index * 97.37) % (width + 240)) - 120 + drift * (0.18 + (index % 5) * 0.03) + width) % width;
    const starY = ((index * 63.17) % (height * 0.8)) + 10;
    const size = index % 7 === 0 ? 2.2 : index % 3 === 0 ? 1.5 : 1;
    context.fillRect(starX, starY, size, size);
  }

  context.fillStyle = stageTheme.runtimePanelTint;
  for (let x = -120; x < width + 120; x += 120) {
    for (let y = 18; y < height; y += 120) {
      context.fillRect(x + (drift % 120), y, 82, 82);
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
