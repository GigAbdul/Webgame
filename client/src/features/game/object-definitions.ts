import type { LevelData, LevelObjectType } from '../../types/models';

export const levelObjectDefinitions: Record<
  LevelObjectType,
  {
    label: string;
    color: string;
    defaultSize: { w: number; h: number };
    collides: boolean;
    lethal: boolean;
    effect: 'jumpPad' | 'jumpOrb' | 'gravity' | 'speed' | 'finish' | null;
  }
> = {
  GROUND_BLOCK: {
    label: 'Ground',
    color: '#31f0ff',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  PLATFORM_BLOCK: {
    label: 'Platform',
    color: '#7af0a5',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  SPIKE: {
    label: 'Spike',
    color: '#ff5a87',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  JUMP_PAD: {
    label: 'Jump Pad',
    color: '#ccff4d',
    defaultSize: { w: 1, h: 0.5 },
    collides: false,
    lethal: false,
    effect: 'jumpPad',
  },
  JUMP_ORB: {
    label: 'Jump Orb',
    color: '#ffd54d',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'jumpOrb',
  },
  GRAVITY_PORTAL: {
    label: 'Gravity',
    color: '#9d8cff',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'gravity',
  },
  SPEED_PORTAL: {
    label: 'Speed',
    color: '#ff944d',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'speed',
  },
  FINISH_PORTAL: {
    label: 'Finish',
    color: '#ffffff',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'finish',
  },
  DECORATION_BLOCK: {
    label: 'Decoration',
    color: '#31506f',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: null,
  },
  START_MARKER: {
    label: 'Start',
    color: '#31f0ff',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: null,
  },
};

export const objectPaletteOrder = Object.keys(levelObjectDefinitions) as LevelObjectType[];

function makeObject(id: string, type: LevelObjectType, x: number, y: number) {
  const definition = levelObjectDefinitions[type];

  return {
    id,
    type,
    x,
    y,
    w: definition.defaultSize.w,
    h: definition.defaultSize.h,
    rotation: 0,
    layer: type === 'DECORATION_BLOCK' ? ('decoration' as const) : ('gameplay' as const),
    props: {},
  };
}

export function createEmptyLevelData(theme = 'neon-grid'): LevelData {
  return {
    meta: {
      gridSize: 32,
      lengthUnits: 120,
      theme,
      background: 'default',
      music: 'placeholder-track-01',
      version: 1,
    },
    player: {
      startX: 2,
      startY: 8,
      mode: 'cube',
      baseSpeed: 1,
      gravity: 1,
    },
    objects: [
      makeObject('start-marker', 'START_MARKER', 2, 8),
      ...Array.from({ length: 40 }, (_, index) => makeObject(`ground-${index}`, 'GROUND_BLOCK', index, 10)),
      makeObject('finish', 'FINISH_PORTAL', 36, 8),
    ],
    finish: {
      x: 36,
      y: 8,
    },
  };
}

