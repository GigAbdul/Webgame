import type { LevelData } from '../../types/models';
import { FIXED_LEVEL_START_X, FIXED_LEVEL_START_Y, isLegacyRunAnchorObjectType } from './object-definitions';
import { BASE_HORIZONTAL_SPEED, clamp } from './player-physics';

export type PreviewBootstrap = {
  startX: number;
  startY: number;
  speedMultiplier: number;
  gravity: number;
  mode: LevelData['player']['mode'];
  elapsedMs: number;
};

type PreviewBootstrapOptions = {
  inheritPortalState?: boolean;
};

export function buildPreviewBootstrap(
  levelData: LevelData,
  previewStartPos: {
    x: number;
    y: number;
  } | null,
  options?: PreviewBootstrapOptions,
): PreviewBootstrap {
  const bootstrap: PreviewBootstrap = {
    startX: previewStartPos?.x ?? FIXED_LEVEL_START_X,
    startY: previewStartPos?.y ?? FIXED_LEVEL_START_Y,
    speedMultiplier: levelData.player.baseSpeed,
    gravity: levelData.player.gravity,
    mode: levelData.player.mode,
    elapsedMs: 0,
  };

  if (!previewStartPos || previewStartPos.x <= FIXED_LEVEL_START_X) {
    return bootstrap;
  }

  if (options?.inheritPortalState === false) {
    return bootstrap;
  }

  const relevantPortals = levelData.objects
    .filter((object) => {
      if (object.x > previewStartPos.x) {
        return false;
      }

      if (isLegacyRunAnchorObjectType(object.type)) {
        return false;
      }

      return (
        object.type === 'SPEED_PORTAL' ||
        object.type === 'GRAVITY_FLIP_PORTAL' ||
        object.type === 'GRAVITY_RETURN_PORTAL' ||
        object.type === 'GRAVITY_PORTAL' ||
        object.type === 'SHIP_PORTAL' ||
        object.type === 'BALL_PORTAL' ||
        object.type === 'CUBE_PORTAL' ||
        object.type === 'ARROW_PORTAL'
      );
    })
    .sort((left, right) => left.x - right.x || left.y - right.y);

  let cursorX = FIXED_LEVEL_START_X;
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

    if (portal.type === 'GRAVITY_FLIP_PORTAL') {
      bootstrap.gravity = -(bootstrap.gravity === 0 ? 1 : bootstrap.gravity);
    }

    if (portal.type === 'GRAVITY_RETURN_PORTAL') {
      bootstrap.gravity = 1;
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

    if (portal.type === 'BALL_PORTAL') {
      bootstrap.mode = 'ball';
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
