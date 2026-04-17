import { z } from 'zod';

export const levelObjectTypes = [
  'GROUND_BLOCK',
  'GROUND_BLOCK_TOP',
  'GROUND_BLOCK_TOP_BOTTOM',
  'GROUND_BLOCK_TOP_LEFT',
  'GROUND_BLOCK_TOP_RIGHT',
  'GROUND_BLOCK_PASS',
  'HALF_GROUND_BLOCK',
  'PLATFORM_BLOCK',
  'PLATFORM_BLOCK_TOP',
  'PLATFORM_BLOCK_TOP_BOTTOM',
  'PLATFORM_BLOCK_TOP_LEFT',
  'PLATFORM_BLOCK_TOP_RIGHT',
  'PLATFORM_BLOCK_PASS',
  'HALF_PLATFORM_BLOCK',
  'ARROW_RAMP_ASC',
  'ARROW_RAMP_DESC',
  'DASH_BLOCK',
  'SPIKE',
  'SPIKE_FLAT',
  'SPIKE_SMALL',
  'SPIKE_TINY',
  'SAW_BLADE',
  'SAW_BLADE_MEDIUM',
  'SAW_BLADE_LARGE',
  'SAW_STAR',
  'SAW_STAR_MEDIUM',
  'SAW_STAR_LARGE',
  'SAW_GEAR',
  'SAW_GEAR_MEDIUM',
  'SAW_GEAR_LARGE',
  'SAW_GLOW',
  'SAW_GLOW_MEDIUM',
  'SAW_GLOW_LARGE',
  'JUMP_PAD',
  'JUMP_ORB',
  'BLUE_ORB',
  'GRAVITY_ORB',
  'GRAVITY_PORTAL',
  'SPEED_PORTAL',
  'SHIP_PORTAL',
  'BALL_PORTAL',
  'CUBE_PORTAL',
  'ARROW_PORTAL',
  'FINISH_PORTAL',
  'MOVE_TRIGGER',
  'ALPHA_TRIGGER',
  'TOGGLE_TRIGGER',
  'PULSE_TRIGGER',
  'POST_FX_TRIGGER',
  'DECORATION_BLOCK',
  'START_MARKER',
  'START_POS',
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
  editorLayer: z.number().int().min(1).max(10).default(1),
  props: z.record(z.any()).default({}),
});

export const levelDataSchema = z.object({
  meta: z.object({
    gridSize: z.number().positive().default(32),
    lengthUnits: z.number().int().positive(),
    theme: z.string().min(1).default('neon-grid'),
    background: z.string().min(1).default('default'),
    groundColor: z.string().min(1).optional(),
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
    mode: z.enum(['cube', 'ball', 'ship', 'arrow']).default('cube'),
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

const FIXED_LEVEL_START_X = 2;
const FIXED_LEVEL_START_Y = 8;
const AUTO_LEVEL_FINISH_PADDING_UNITS = 10;

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
      | 'gravityOrb'
      | 'gravity'
      | 'speed'
      | 'shipMode'
      | 'ballMode'
      | 'cubeMode'
      | 'arrowMode'
      | 'finish'
      | 'moveTrigger'
      | 'alphaTrigger'
      | 'toggleTrigger'
      | 'pulseTrigger'
      | 'postFxTrigger'
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
  GROUND_BLOCK_TOP: {
    label: 'Ground Top',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  GROUND_BLOCK_TOP_BOTTOM: {
    label: 'Ground Top/Bottom',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  GROUND_BLOCK_TOP_LEFT: {
    label: 'Ground Top/Left',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  GROUND_BLOCK_TOP_RIGHT: {
    label: 'Ground Top/Right',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  GROUND_BLOCK_PASS: {
    label: 'Ground Ghost',
    defaultSize: { w: 1, h: 1 },
    collides: false,
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
  PLATFORM_BLOCK_TOP: {
    label: 'Platform Top',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  PLATFORM_BLOCK_TOP_BOTTOM: {
    label: 'Platform Top/Bottom',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  PLATFORM_BLOCK_TOP_LEFT: {
    label: 'Platform Top/Left',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  PLATFORM_BLOCK_TOP_RIGHT: {
    label: 'Platform Top/Right',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  PLATFORM_BLOCK_PASS: {
    label: 'Platform Ghost',
    defaultSize: { w: 1, h: 1 },
    collides: false,
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
  ARROW_RAMP_ASC: {
    label: 'Arrow Ramp /',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  ARROW_RAMP_DESC: {
    label: 'Arrow Ramp \\',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  DASH_BLOCK: {
    label: 'Dash Block',
    defaultSize: { w: 1, h: 1 },
    collides: false,
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
  SPIKE_FLAT: {
    label: 'Flat Spike',
    defaultSize: { w: 1, h: 0.5 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SPIKE_SMALL: {
    label: 'Small Spike',
    defaultSize: { w: 0.72, h: 0.72 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SPIKE_TINY: {
    label: 'Tiny Spike',
    defaultSize: { w: 0.46, h: 0.46 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_BLADE: {
    label: 'Saw Blade S',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_BLADE_MEDIUM: {
    label: 'Saw Blade M',
    defaultSize: { w: 1.45, h: 1.45 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_BLADE_LARGE: {
    label: 'Saw Blade L',
    defaultSize: { w: 1.9, h: 1.9 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_STAR: {
    label: 'Star Saw S',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_STAR_MEDIUM: {
    label: 'Star Saw M',
    defaultSize: { w: 1.45, h: 1.45 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_STAR_LARGE: {
    label: 'Star Saw L',
    defaultSize: { w: 1.9, h: 1.9 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_GEAR: {
    label: 'Gear Saw S',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_GEAR_MEDIUM: {
    label: 'Gear Saw M',
    defaultSize: { w: 1.45, h: 1.45 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_GEAR_LARGE: {
    label: 'Gear Saw L',
    defaultSize: { w: 1.9, h: 1.9 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_GLOW: {
    label: 'Glow Saw S',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_GLOW_MEDIUM: {
    label: 'Glow Saw M',
    defaultSize: { w: 1.45, h: 1.45 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_GLOW_LARGE: {
    label: 'Glow Saw L',
    defaultSize: { w: 1.9, h: 1.9 },
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
  BLUE_ORB: {
    label: 'Blue Orb',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'gravityOrb',
  },
  GRAVITY_ORB: {
    label: 'Green Orb',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'gravityOrb',
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
  BALL_PORTAL: {
    label: 'Ball Portal',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'ballMode',
  },
  CUBE_PORTAL: {
    label: 'Cube Portal',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'cubeMode',
  },
  ARROW_PORTAL: {
    label: 'Arrow Portal',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'arrowMode',
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
  POST_FX_TRIGGER: {
    label: 'Post FX Trigger',
    defaultSize: { w: 1.5, h: 1.5 },
    collides: false,
    lethal: false,
    effect: 'postFxTrigger',
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
  START_POS: {
    label: 'Start Pos',
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
    editorLayer: 1,
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
      startX: FIXED_LEVEL_START_X,
      startY: FIXED_LEVEL_START_Y,
      mode: 'cube',
      baseSpeed: 1,
      gravity: 1,
    },
    objects: [],
    finish: {
      x: FIXED_LEVEL_START_X + AUTO_LEVEL_FINISH_PADDING_UNITS,
      y: FIXED_LEVEL_START_Y,
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
      startX: FIXED_LEVEL_START_X,
      startY: FIXED_LEVEL_START_Y,
      mode: 'cube',
      baseSpeed: 1.1,
      gravity: 1,
    },
    objects: [
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
    ],
    finish: {
      x: 60,
      y: FIXED_LEVEL_START_Y,
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
      startX: FIXED_LEVEL_START_X,
      startY: FIXED_LEVEL_START_Y,
      mode: 'cube',
      baseSpeed: 1.25,
      gravity: 1,
    },
    objects: [
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
    ],
    finish: {
      x: 75,
      y: FIXED_LEVEL_START_Y,
    },
  };
}

