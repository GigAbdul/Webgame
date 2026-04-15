import type { LevelData } from '../../types/models';

export const SHIP_FLIGHT_CEILING_Y = 1;
export const SHIP_FLIGHT_FLOOR_Y = 10;
export const SHIP_THRUST_ACCELERATION = 46;
export const SHIP_FALL_ACCELERATION = 30;
export const SHIP_MAX_VERTICAL_SPEED = 8.4;
export const SHIP_VISUAL_BOUND_PADDING = 0.14;

export function getPlayerModeLabel(mode: LevelData['player']['mode']) {
  return mode === 'ship' ? 'Ship' : mode === 'arrow' ? 'Arrow' : 'Cube';
}

export function getPlayerModeDescription(mode: LevelData['player']['mode']) {
  if (mode === 'arrow') {
    return 'Hold input to rise diagonally, release to dive diagonally, and route through the arrow ramps';
  }

  return mode === 'ship'
    ? 'Hold input to climb, release to descend, and stay between the flight bounds'
    : 'Buffered jump / snap landing / coyote time';
}
