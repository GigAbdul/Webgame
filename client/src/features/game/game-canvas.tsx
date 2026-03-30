import { useEffect, useMemo, useRef, useState } from 'react';
import { levelObjectDefinitions } from './object-definitions';
import type { LevelData } from '../../types/models';
import { Panel } from '../../components/ui';
import { cn } from '../../utils/cn';

type GameCanvasProps = {
  levelData: LevelData;
  attemptNumber?: number;
  runId?: string | number;
  autoRestartOnFail?: boolean;
  className?: string;
  onFail?: (payload: { progressPercent: number; completionTimeMs: number }) => void;
  onComplete?: (payload: { progressPercent: number; completionTimeMs: number }) => void;
};

type PlayerState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  grounded: boolean;
  gravity: number;
  speedMultiplier: number;
};

type TrailPoint = {
  x: number;
  y: number;
  alpha: number;
  size: number;
};

const solidTypes = new Set(['GROUND_BLOCK', 'PLATFORM_BLOCK']);
const hazardTypes = new Set(['SPIKE']);
const JUMP_BUFFER_MS = 130;
const COYOTE_TIME_MS = 110;
const AUTO_RESTART_DELAY_MS = 850;

export function GameCanvas({
  levelData,
  attemptNumber = 1,
  runId = 0,
  autoRestartOnFail = false,
  className,
  onFail,
  onComplete,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onFailRef = useRef(onFail);
  const onCompleteRef = useRef(onComplete);
  const [hud, setHud] = useState({
    progressPercent: 0,
    status: 'running' as 'running' | 'failed' | 'completed',
    elapsedMs: 0,
  });

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
      grounded: false,
      gravity: levelData.player.gravity,
      speedMultiplier: levelData.player.baseSpeed,
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
      player.gravity = levelData.player.gravity;
      player.speedMultiplier = levelData.player.baseSpeed;
      player.grounded = false;
      currentStatus = 'running';
      activeTriggers.clear();
      usedOrbs.clear();
      trail.length = 0;
      setHud({
        progressPercent: 0,
        status: 'running',
        elapsedMs: 0,
      });
    };

    const bumpCamera = (power = 8, duration = 0.18) => {
      shakePower = Math.max(shakePower, power);
      shakeTime = Math.max(shakeTime, duration);
    };

    const queueJump = (timestamp = performance.now()) => {
      if (currentStatus !== 'running') {
        return;
      }

      jumpBufferedUntil = timestamp + JUMP_BUFFER_MS;
    };

    const keyListener = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        queueJump();
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

    const pointerListener = () => {
      if (currentStatus === 'running') {
        queueJump();
        return;
      }

      if (!isExternallyManagedRun) {
        resetRun();
      }
    };

    window.addEventListener('keydown', keyListener);
    canvas.addEventListener('pointerdown', pointerListener);

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
      const elapsedMs = Math.max(1, Math.floor(timestamp - startTime));

      if (currentStatus === 'running') {
        const horizontalSpeed = 6.15 * player.speedMultiplier;
        const previousX = player.x;
        const previousY = player.y;

        player.x += horizontalSpeed * deltaSeconds;
        player.vy += 28 * player.gravity * deltaSeconds;
        player.y += player.vy * deltaSeconds;
        player.grounded = false;

        for (const object of levelData.objects) {
          if (
            !solidTypes.has(object.type) ||
            !aabbIntersects(player.x, player.y, player.w, player.h, object.x, object.y, object.w, object.h)
          ) {
            continue;
          }

          let resolvedSafely = false;

          if (player.gravity > 0) {
            const previousBottom = previousY + player.h;
            const nextBottom = player.y + player.h;

            if (previousBottom <= object.y && nextBottom >= object.y && player.vy >= 0) {
              player.y = object.y - player.h;
              player.vy = 0;
              player.grounded = true;
              lastGroundedAt = timestamp;
              resolvedSafely = true;
            }
          } else {
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

        if (currentStatus === 'running' && jumpBufferedUntil >= timestamp) {
          const jumpVelocity = -12.4 * Math.sign(player.gravity || 1);
          const canGroundJump = player.grounded || timestamp - lastGroundedAt <= COYOTE_TIME_MS;

          if (canGroundJump) {
            player.vy = jumpVelocity;
            player.grounded = false;
            jumpBufferedUntil = 0;
            lastGroundedAt = -Infinity;
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
              player.vy = jumpVelocity * 1.18;
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

            if (object.type === 'JUMP_PAD') {
              const boost = Number(object.props.boost ?? 16);
              player.vy = -boost * Math.sign(player.gravity || 1);
              bumpCamera(5, 0.14);
            }

            if (object.type === 'GRAVITY_PORTAL') {
              player.gravity = Number(object.props.gravity ?? -player.gravity) || -player.gravity;
              player.grounded = false;
            }

            if (object.type === 'SPEED_PORTAL') {
              player.speedMultiplier = Number(object.props.multiplier ?? 1.4);
            }

            if (object.type === 'FINISH_PORTAL') {
              markCompleted(elapsedMs);
            }
          }
        }

        if (
          currentStatus === 'running' &&
          (player.y > levelBounds.maxY + 3 || player.y < -3 || player.x > levelBounds.maxX + 8)
        ) {
          markFailed(elapsedMs);
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
      drawBackdrop(context, width, height, elapsedMs);

      context.save();
      context.translate(-(cameraX + shakeOffsetX), 0);

      drawGrid(context, cameraX + shakeOffsetX, verticalOffset, width, height, cell);

      context.strokeStyle = 'rgba(202,255,69,0.16)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(cameraX - cell * 2, verticalOffset + cell * 10 + cell);
      context.lineTo(cameraX + width + cell * 5, verticalOffset + cell * 10 + cell);
      context.stroke();

      for (const object of levelData.objects) {
        drawObject(context, object, cell, verticalOffset, activeTriggers.has(object.id), usedOrbs.has(object.id));
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
      canvas.removeEventListener('pointerdown', pointerListener);
    };
  }, [autoRestartOnFail, levelBounds.maxX, levelBounds.maxY, levelData, onComplete, onFail, runId]);

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
              {hud.status}
            </span>
          </div>
          <h3 className="font-display text-2xl text-[#caff45]">{levelData.meta.theme}</h3>
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
        Controls: <span className="text-white">Space</span>, click, or tap to jump.
        {!onFail && !onComplete ? (
          <>
            {' '}
            <span className="text-white">R</span> restarts instantly.
          </>
        ) : null}{' '}
        Jump inputs are buffered briefly, spikes use a fairer hitbox, and block side hits now count as a fail.
      </p>
    </Panel>
  );
}

function HudStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="hud-pill px-4 py-2">
      <p className="font-display text-[10px] uppercase tracking-[0.2em] text-[#ffd44a]">{label}</p>
      <p className="font-display text-sm text-white">{value}</p>
    </div>
  );
}

function drawObject(
  context: CanvasRenderingContext2D,
  object: LevelData['objects'][number],
  cell: number,
  verticalOffset: number,
  isActive: boolean,
  isUsedOrb: boolean,
) {
  const definition = levelObjectDefinitions[object.type];
  const x = object.x * cell;
  const y = verticalOffset + object.y * cell;
  const w = object.w * cell;
  const h = object.h * cell;

  context.save();

  if (object.type === 'SPIKE') {
    context.fillStyle = definition.color;
    context.beginPath();
    context.moveTo(x, y + h);
    context.lineTo(x + w / 2, y);
    context.lineTo(x + w, y + h);
    context.closePath();
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.3)';
    context.lineWidth = 2;
    context.stroke();
    context.restore();
    return;
  }

  if (object.type === 'JUMP_ORB') {
    context.fillStyle = isUsedOrb ? 'rgba(255,213,77,0.35)' : definition.color;
    context.beginPath();
    context.arc(x + w / 2, y + h / 2, Math.max(8, w / 2.2), 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.45)';
    context.lineWidth = 2;
    context.stroke();
    context.restore();
    return;
  }

  context.fillStyle = definition.color;
  context.fillRect(x, y, w, h);

  if (object.type === 'GRAVITY_PORTAL' || object.type === 'SPEED_PORTAL' || object.type === 'FINISH_PORTAL') {
    context.strokeStyle = 'rgba(255,255,255,0.6)';
    context.lineWidth = 2;
    context.strokeRect(x + 2, y + 2, w - 4, h - 4);

    context.fillStyle = isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)';
    context.fillRect(x + w * 0.25, y + 6, w * 0.5, h - 12);
    context.restore();
    return;
  }

  if (object.type === 'JUMP_PAD') {
    context.fillStyle = 'rgba(255,255,255,0.18)';
    context.fillRect(x + 4, y + 4, w - 8, Math.max(4, h * 0.35));
    context.restore();
    return;
  }

  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x + 3, y + 3, w - 6, Math.max(5, h * 0.16));
  context.strokeStyle = 'rgba(0,0,0,0.28)';
  context.lineWidth = 2;
  context.strokeRect(x + 1, y + 1, w - 2, h - 2);
  context.restore();
}

function drawPlayer(context: CanvasRenderingContext2D, player: PlayerState, cell: number, verticalOffset: number) {
  const playerX = player.x * cell;
  const playerY = verticalOffset + player.y * cell;
  const sizeW = player.w * cell;
  const sizeH = player.h * cell;

  context.save();
  context.translate(playerX + sizeW / 2, playerY + sizeH / 2);
  context.rotate((player.vy / 16) * 0.1);

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

function drawBackdrop(context: CanvasRenderingContext2D, width: number, height: number, elapsedMs: number) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#7b1fe0');
  gradient.addColorStop(0.45, '#4f0fa5');
  gradient.addColorStop(1, '#14022b');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const drift = (elapsedMs / 1000) * 16;

  context.fillStyle = 'rgba(255,255,255,0.04)';
  for (let x = -120; x < width + 120; x += 120) {
    for (let y = 18; y < height; y += 120) {
      context.fillRect(x + (drift % 120), y, 82, 82);
    }
  }

  context.fillStyle = 'rgba(44,243,255,0.08)';
  context.fillRect(0, height * 0.72, width, 3);
  context.fillStyle = 'rgba(255,212,74,0.06)';
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
