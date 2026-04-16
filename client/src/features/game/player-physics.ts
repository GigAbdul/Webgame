import type { LevelData } from '../../types/models';
import { SHIP_FLIGHT_FLOOR_Y } from './player-mode-config';

export const PLAYER_HITBOX_SIZE = 0.82;
export const BASE_HORIZONTAL_SPEED = 8.3;
export const BASE_GRAVITY_ACCELERATION = 65;
export const DEFAULT_JUMP_VELOCITY = 17;
export const DEFAULT_JUMP_ORB_VELOCITY = DEFAULT_JUMP_VELOCITY * 1;
export const PERMANENT_STAGE_FLOOR_Y = SHIP_FLIGHT_FLOOR_Y;
export const AIR_ROTATION_SPEED = Math.PI * 1.6;
export const ARROW_VERTICAL_SPEED_FACTOR = 1;

const QUARTER_TURN = Math.PI / 2;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAngle(value: number) {
  const fullTurn = Math.PI * 2;
  return ((value % fullTurn) + fullTurn) % fullTurn;
}

export function snapCubeRotation(value: number) {
  return normalizeAngle(Math.round(value / QUARTER_TURN) * QUARTER_TURN);
}

export function getPlayerHitboxLayout(_mode: LevelData['player']['mode']) {
  return {
    offsetX: 0,
    offsetY: 0,
    width: PLAYER_HITBOX_SIZE,
    height: PLAYER_HITBOX_SIZE,
  };
}
