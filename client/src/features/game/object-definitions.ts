import type { LevelColorGroup, LevelData, LevelObject, LevelObjectType } from '../../types/models';

export const levelObjectDefinitions: Record<
  LevelObjectType,
  {
    label: string;
    color: string;
    strokeColor: string;
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
      | 'arrowMode'
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
    color: '#31f0ff',
    strokeColor: '#0f1b31',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  PLATFORM_BLOCK: {
    label: 'Platform',
    color: '#7af0a5',
    strokeColor: '#103428',
    defaultSize: { w: 1, h: 1 },
    collides: true,
    lethal: false,
    effect: null,
  },
  HALF_GROUND_BLOCK: {
    label: 'Half Ground',
    color: '#31f0ff',
    strokeColor: '#0f1b31',
    defaultSize: { w: 1, h: 0.5 },
    collides: true,
    lethal: false,
    effect: null,
  },
  HALF_PLATFORM_BLOCK: {
    label: 'Half Platform',
    color: '#7af0a5',
    strokeColor: '#103428',
    defaultSize: { w: 1, h: 0.5 },
    collides: true,
    lethal: false,
    effect: null,
  },
  ARROW_RAMP_ASC: {
    label: 'Arrow Ramp /',
    color: '#8ecbff',
    strokeColor: '#0f1b31',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  ARROW_RAMP_DESC: {
    label: 'Arrow Ramp \\',
    color: '#8ecbff',
    strokeColor: '#0f1b31',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  DASH_BLOCK: {
    label: 'Dash Block',
    color: '#6ff9ff',
    strokeColor: '#0f1b31',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: null,
  },
  SPIKE: {
    label: 'Spike',
    color: '#ff5a87',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  SAW_BLADE: {
    label: 'Saw Blade',
    color: '#d7ebff',
    strokeColor: '#17304b',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: true,
    effect: null,
  },
  JUMP_PAD: {
    label: 'Jump Pad',
    color: '#ccff4d',
    strokeColor: '#173300',
    defaultSize: { w: 1, h: 0.5 },
    collides: false,
    lethal: false,
    effect: 'jumpPad',
  },
  JUMP_ORB: {
    label: 'Jump Orb',
    color: '#ffd54d',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'jumpOrb',
  },
  GRAVITY_PORTAL: {
    label: 'Gravity',
    color: '#9d8cff',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'gravity',
  },
  SPEED_PORTAL: {
    label: 'Speed',
    color: '#ff944d',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'speed',
  },
  SHIP_PORTAL: {
    label: 'Ship',
    color: '#67e6ff',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'shipMode',
  },
  CUBE_PORTAL: {
    label: 'Cube',
    color: '#b3ff5e',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'cubeMode',
  },
  ARROW_PORTAL: {
    label: 'Arrow',
    color: '#5ee7ff',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'arrowMode',
  },
  FINISH_PORTAL: {
    label: 'Finish',
    color: '#ffffff',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 2 },
    collides: false,
    lethal: false,
    effect: 'finish',
  },
  MOVE_TRIGGER: {
    label: 'Move Trigger',
    color: '#58d6ff',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'moveTrigger',
  },
  ALPHA_TRIGGER: {
    label: 'Alpha Trigger',
    color: '#f7e85f',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'alphaTrigger',
  },
  TOGGLE_TRIGGER: {
    label: 'Toggle Trigger',
    color: '#8cff8f',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'toggleTrigger',
  },
  PULSE_TRIGGER: {
    label: 'Pulse Trigger',
    color: '#ff8cf2',
    strokeColor: '#ffffff',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: 'pulseTrigger',
  },
  DECORATION_BLOCK: {
    label: 'Decoration',
    color: '#31506f',
    strokeColor: '#0f1b31',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: null,
  },
  START_MARKER: {
    label: 'Start',
    color: '#31f0ff',
    strokeColor: '#132339',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: null,
  },
  START_POS: {
    label: 'Start Pos',
    color: '#caff45',
    strokeColor: '#173300',
    defaultSize: { w: 1, h: 1 },
    collides: false,
    lethal: false,
    effect: null,
  },
};

export const objectPaletteOrder = Object.keys(levelObjectDefinitions) as LevelObjectType[];
export const PAINT_GROUP_SLOT_COUNT = 6;
const paintableObjectTypes = new Set<LevelObjectType>([
  'GROUND_BLOCK',
  'HALF_GROUND_BLOCK',
  'PLATFORM_BLOCK',
  'HALF_PLATFORM_BLOCK',
  'ARROW_RAMP_ASC',
  'ARROW_RAMP_DESC',
  'DECORATION_BLOCK',
  'SPIKE',
  'SAW_BLADE',
]);

const triggerObjectTypes = new Set<LevelObjectType>(['MOVE_TRIGGER', 'ALPHA_TRIGGER', 'TOGGLE_TRIGGER', 'PULSE_TRIGGER']);

export function isPaintableObjectType(type: LevelObjectType) {
  return paintableObjectTypes.has(type);
}

export function isTriggerObjectType(type: LevelObjectType) {
  return triggerObjectTypes.has(type);
}

export function getObjectPaintGroupId(object: Pick<LevelObject, 'props'> | null | undefined) {
  const rawGroupId = object?.props.paintGroupId;
  const numericGroupId =
    typeof rawGroupId === 'number'
      ? rawGroupId
      : typeof rawGroupId === 'string'
        ? Number(rawGroupId)
        : NaN;

  return Number.isInteger(numericGroupId) && numericGroupId > 0 ? numericGroupId : null;
}

export function getColorGroupById(
  colorGroups: LevelColorGroup[] | undefined,
  groupId: number | null | undefined,
) {
  if (!groupId || !colorGroups?.length) {
    return null;
  }

  return colorGroups.find((group) => group.id === groupId) ?? null;
}

export function getObjectFillColor(
  object: Pick<LevelObject, 'type' | 'props'>,
  colorGroups?: LevelColorGroup[],
) {
  const linkedGroup = getColorGroupById(colorGroups, getObjectPaintGroupId(object));

  if (linkedGroup) {
    return linkedGroup.fillColor;
  }

  const customFillColor = object.props.fillColor;
  return typeof customFillColor === 'string' && customFillColor.trim().length > 0
    ? customFillColor
    : levelObjectDefinitions[object.type].color;
}

export function getObjectStrokeColor(
  object: Pick<LevelObject, 'type' | 'props'>,
  colorGroups?: LevelColorGroup[],
) {
  const linkedGroup = getColorGroupById(colorGroups, getObjectPaintGroupId(object));

  if (linkedGroup) {
    return linkedGroup.strokeColor;
  }

  const customStrokeColor = object.props.strokeColor;
  return typeof customStrokeColor === 'string' && customStrokeColor.trim().length > 0
    ? customStrokeColor
    : levelObjectDefinitions[object.type].strokeColor;
}

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
    editorLayer: 1 as const,
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
      makeObject('finish', 'FINISH_PORTAL', 36, 8),
    ],
    finish: {
      x: 36,
      y: 8,
    },
  };
}

