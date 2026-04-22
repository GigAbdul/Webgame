import type { LevelData } from '../../types/models';
import { SHIP_FLIGHT_FLOOR_Y } from './player-mode-config';

export type PlayerHitboxKind = 'contact' | 'solid';

export const PLAYER_CONTACT_HITBOX_SIZE = 0.82;
export const PLAYER_HITBOX_SIZE = PLAYER_CONTACT_HITBOX_SIZE;
export const PLAYER_SOLID_HITBOX_SIZE = 0.52;
export const BASE_HORIZONTAL_SPEED = 8.3;
export const BASE_GRAVITY_ACCELERATION = 65;
export const DEFAULT_JUMP_VELOCITY = 17;
export const DEFAULT_JUMP_ORB_VELOCITY = DEFAULT_JUMP_VELOCITY * 1;
export const DASH_ORB_SPEED = 20;
export const PERMANENT_STAGE_FLOOR_Y = SHIP_FLIGHT_FLOOR_Y;
export const AIR_ROTATION_SPEED = Math.PI * 1.6;
export const ARROW_VERTICAL_SPEED_FACTOR = 1;

const QUARTER_TURN = Math.PI / 2;
const PLAYER_SOLID_HITBOX_INSET = (PLAYER_CONTACT_HITBOX_SIZE - PLAYER_SOLID_HITBOX_SIZE) / 2;

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

export function getPlayerHitboxLayout(
  _mode: LevelData['player']['mode'],
  kind: PlayerHitboxKind = 'contact',
) {
  if (kind === 'solid') {
    return {
      offsetX: PLAYER_SOLID_HITBOX_INSET,
      offsetY: PLAYER_SOLID_HITBOX_INSET,
      width: PLAYER_SOLID_HITBOX_SIZE,
      height: PLAYER_SOLID_HITBOX_SIZE,
    };
  }

  return {
    offsetX: 0,
    offsetY: 0,
    width: PLAYER_CONTACT_HITBOX_SIZE,
    height: PLAYER_CONTACT_HITBOX_SIZE,
  };
}
