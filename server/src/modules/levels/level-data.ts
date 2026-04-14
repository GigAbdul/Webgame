import { z } from 'zod';

export const levelObjectTypes = [
  'GROUND_BLOCK',
  'HALF_GROUND_BLOCK',
  'PLATFORM_BLOCK',
  'HALF_PLATFORM_BLOCK',
  'SPIKE',
  'SAW_BLADE',
  'JUMP_PAD',
  'JUMP_ORB',
  'GRAVITY_PORTAL',
  'SPEED_PORTAL',
  'SHIP_PORTAL',
  'CUBE_PORTAL',
  'FINISH_PORTAL',
  'MOVE_TRIGGER',
  'ALPHA_TRIGGER',
  'TOGGLE_TRIGGER',
  'PULSE_TRIGGER',
  'DECORATION_BLOCK',
  'START_MARKER',
] as const;

export type LevelObjectType = (typeof levelObjectTypes)[number];

export const levelObjectSchema = z.object({
  id: z.string().min(1),
  type: z.enum(levelObjectTypes),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  rotation: z.number().default(0),
  layer: z.enum(['gameplay', 'decoration']).default('gameplay'),
  props: z.record(z.any()).default({}),
});

export const levelDataSchema = z.object({
  meta: z.object({
    gridSize: z.number().positive().default(32),
    lengthUnits: z.number().int().positive(),
    theme: z.string().min(1).default('neon-grid'),
    background: z.string().min(1).default('default'),
    music: z.string().min(1).default('placeholder-track-01'),
    musicLabel: z.string().min(1).optional(),
    musicOffsetMs: z.number().min(0).default(0),
    version: z.number().int().default(1),
    colorGroups: z
      .array(
        z.object({
          id: z.number().int().positive(),
          fillColor: z.string().min(1),
          strokeColor: z.string().min(1),
        }),
      )
      .default([]),
  }),
  player: z.object({
    startX: z.number(),
    startY: z.number(),
    mode: z.enum(['cube', 'ship']).default('cube'),
    baseSpeed: z.number().positive().default(1),
    gravity: z.number().default(1),
  }),
  objects: z.array(levelObjectSchema),
  finish: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export type LevelData = z.infer<typeof levelDataSchema>;

export const levelObjectDefinitions: Record<
  LevelObjectType,
  {
    label: string;
    defaultSize: { w: number; h: number };
    collides: boolean;
    lethal: boolean;
    effect:
      | 'jumpPad'
      | 'jumpOrb'
      | 'gravity'
      | 'speed'
      | 'shipMode'
      | 'cubeMode'
      | 'finish'
      | 'moveTrigger'
      | 'alphaTrigger'
      | 'toggleTrigger'
      | 'pulseTrigger'
      | null;
  }
> = {
  GROUND_BLOCK: {
    label: 'Ground',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  PLATFORM_BLOCK: {
    label: 'Platform',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  HALF_GROUND_BLOCK: {
    label: 'Half Ground',
    defaultSize: { w: 1, h: 0.5 },
    collides: true,
    lethal: false,
    effect: null,
  },
  HALF_PLATFORM_BLOCK: {
    label: 'Half Platform',
    defaultSize: { w: 1, h: 0.5 },
    collides: true,
    lethal: false,
    effect: null,
  },
  SPIKE: {
    label: 'Spike',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_BLADE: {
    label: 'Saw Blade',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  JUMP_PAD: {
    label: 'Jump Pad',
    defaultSize: { w: 1, h: 0.5 },
    collides: false,
    lethal: false,
    effect: 'jumpPad',
  },
  JUMP_ORB: {
    label: 'Jump Orb',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'jumpOrb',
  },
  GRAVITY_PORTAL: {
    label: 'Gravity Portal',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'gravity',
  },
  SPEED_PORTAL: {
    label: 'Speed Portal',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'speed',
  },
  SHIP_PORTAL: {
    label: 'Ship Portal',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'shipMode',
  },
  CUBE_PORTAL: {
    label: 'Cube Portal',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'cubeMode',
  },
  FINISH_PORTAL: {
    label: 'Finish',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'finish',
  },
  MOVE_TRIGGER: {
    label: 'Move Trigger',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'moveTrigger',
  },
  ALPHA_TRIGGER: {
    label: 'Alpha Trigger',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'alphaTrigger',
  },
  TOGGLE_TRIGGER: {
    label: 'Toggle Trigger',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'toggleTrigger',
  },
  PULSE_TRIGGER: {
    label: 'Pulse Trigger',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'pulseTrigger',
  },
  DECORATION_BLOCK: {
    label: 'Decoration',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: null,
  },
  START_MARKER: {
    label: 'Start',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: null,
  },
};

function makeObject(
  id: string,
  type: LevelObjectType,
  x: number,
  y: number,
  w = levelObjectDefinitions[type].defaultSize.w,
  h = levelObjectDefinitions[type].defaultSize.h,
  props: Record<string, unknown> = {},
) {
  return {
    id,
    type,
    x,
    y,
    w,
    h,
    rotation: 0,
    layer: type === 'DECORATION_BLOCK' ? 'decoration' : 'gameplay',
    props,
  } as const;
}

export function createEmptyLevelData(theme = 'neon-grid'): LevelData {
  return {
    meta: {
      gridSize: 32,
      lengthUnits: 120,
      theme,
      background: 'default',
      music: 'placeholder-track-01',
      musicOffsetMs: 0,
      version: 1,
      colorGroups: [],
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
      makeObject('finish', 'FINISH_PORTAL', 36, 8, 1, 2),
    ],
    finish: {
      x: 38,
      y: 8,
    },
  };
}

export function createSampleLevelDataOne(): LevelData {
  return {
    meta: {
      gridSize: 32,
      lengthUnits: 180,
      theme: 'aurora-grid',
      background: 'city-neon',
      music: 'placeholder-track-01',
      musicOffsetMs: 0,
      version: 1,
      colorGroups: [],
    },
    player: {
      startX: 2,
      startY: 8,
      mode: 'cube',
      baseSpeed: 1.1,
      gravity: 1,
    },
    objects: [
      makeObject('start-marker', 'START_MARKER', 2, 8),
      ...Array.from({ length: 50 }, (_, index) => makeObject(`ground-${index}`, 'GROUND_BLOCK', index, 10)),
      makeObject('spike-1', 'SPIKE', 8, 9),
      makeObject('spike-2', 'SPIKE', 14, 9),
      makeObject('platform-1', 'PLATFORM_BLOCK', 18, 7, 4, 1),
      makeObject('orb-1', 'JUMP_ORB', 19, 5),
      makeObject('pad-1', 'JUMP_PAD', 24, 9, 1, 0.5, { boost: 16 }),
      makeObject('portal-speed', 'SPEED_PORTAL', 28, 8, 1, 2, { multiplier: 1.4 }),
      makeObject('portal-gravity', 'GRAVITY_PORTAL', 33, 8, 1, 2, { gravity: -1 }),
      makeObject('platform-2', 'PLATFORM_BLOCK', 36, 2, 5, 1),
      makeObject('spike-3', 'SPIKE', 41, 1),
      makeObject('finish', 'FINISH_PORTAL', 46, 2, 1, 2),
    ],
    finish: {
      x: 47,
      y: 2,
    },
  };
}

export function createSampleLevelDataTwo(): LevelData {
  return {
    meta: {
      gridSize: 32,
      lengthUnits: 220,
      theme: 'molten-sunset',
      background: 'canyon',
      music: 'placeholder-track-02',
      musicOffsetMs: 0,
      version: 1,
      colorGroups: [],
    },
    player: {
      startX: 2,
      startY: 8,
      mode: 'cube',
      baseSpeed: 1.25,
      gravity: 1,
    },
    objects: [
      makeObject('start-marker', 'START_MARKER', 2, 8),
      ...Array.from({ length: 65 }, (_, index) => makeObject(`ground-${index}`, 'GROUND_BLOCK', index, 10)),
      makeObject('spike-1', 'SPIKE', 10, 9),
      makeObject('spike-2', 'SPIKE', 11, 9),
      makeObject('platform-1', 'PLATFORM_BLOCK', 16, 6, 3, 1),
      makeObject('orb-1', 'JUMP_ORB', 18, 4),
      makeObject('platform-2', 'PLATFORM_BLOCK', 24, 4, 4, 1),
      makeObject('gravity', 'GRAVITY_PORTAL', 29, 5, 1, 2, { gravity: -1 }),
      makeObject('platform-3', 'PLATFORM_BLOCK', 31, 1, 3, 1),
      makeObject('speed', 'SPEED_PORTAL', 36, 2, 1, 2, { multiplier: 1.6 }),
      makeObject('pad-1', 'JUMP_PAD', 42, 9, 1, 0.5, { boost: 18 }),
      makeObject('spike-3', 'SPIKE', 49, 9),
      makeObject('finish', 'FINISH_PORTAL', 58, 8, 1, 2),
    ],
    finish: {
      x: 59,
      y: 8,
    },
  };
}

