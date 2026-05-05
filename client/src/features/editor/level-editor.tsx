import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Level, LevelColorGroup, LevelData, LevelObject, LevelObjectType } from '../../types/models';
import { Badge, Button, FieldLabel, Input, Panel, Select, Textarea } from '../../components/ui';
import { GameCanvas } from '../game/game-canvas';
import {
  FIXED_LEVEL_START_X,
  FIXED_LEVEL_START_Y,
  computeAutoLevelFinishX,
  createEmptyLevelData,
  getBlockCollisionMask,
  getColorGroupById,
  getObjectFillColor,
  getObjectPaintGroupId,
  getSpikeHitboxRect,
  getObjectStrokeColor,
  hasBlockSupport,
  isDecorationObjectType,
  isCollidableBlockType,
  isPaintableObjectType,
  isPassThroughBlockType,
  isSpikeObjectType,
  isSawObjectType,
  stripLegacyRunAnchorObjects,
  isTriggerObjectType,
  levelObjectDefinitions,
} from '../game/object-definitions';
import { BASE_HORIZONTAL_SPEED } from '../game/player-physics';
import { buildPreviewBootstrap } from '../game/preview-bootstrap';
import { readStoredMusicVolume, resolveLevelMusic } from '../game/level-music';
import { drawStageObjectSprite, getStageObjectPreviewSpriteImage } from '../game/object-renderer';
import { DASH_ORB_SPEED, getPlayerHitboxLayout } from '../game/player-physics';
import { SHIP_FLIGHT_CEILING_Y, SHIP_FLIGHT_FLOOR_Y, getPlayerModeLabel } from '../game/player-mode-config';
import { getDefaultStageGroundColor, getStageGroundPalette, getStageThemePalette } from '../game/stage-theme-palette';
import { readLocalEditorDraft, writeLocalEditorDraft } from './local-draft-storage';
import { cn } from '../../utils/cn';

type EditorTool = 'select' | 'pan' | LevelObjectType;
type PlacementMode = 'single' | 'drag';
type EditorLayerId = number;
type EditorWorkspaceMode = 'build' | 'edit';
type PostFxEffectType = 'flash' | 'grayscale' | 'invert' | 'scanlines' | 'blur' | 'shake' | 'tint';
type TriggerActivationMode = 'touch' | 'zone';
type MoveTriggerEasing = 'none' | 'easeIn' | 'easeOut' | 'easeInOut';

type LevelEditorProps = {
  initialLevel?: Level | null;
  draftStorageKey: string;
  saveLabel?: string;
  onClose?: () => void;
  onSave: (
    payload: {
      title: string;
      description: string;
      theme: string;
      dataJson: LevelData;
    },
    options?: {
      onUploadProgress?: (progressPercent: number | null) => void;
    },
  ) => Promise<void>;
  onSubmit?: () => Promise<void>;
};

type DragState =
  | {
      mode: 'pan';
      originX: number;
      originY: number;
      startPanX: number;
      startPanY: number;
    }
  | {
      mode: 'move';
      objectId: string;
      offsetX: number;
      offsetY: number;
      originX: number;
      originY: number;
      selectedIds: string[];
      originPositions: Record<string, { x: number; y: number }>;
    }
  | {
      mode: 'box-select';
      startScreenX: number;
      startScreenY: number;
    }
  | {
      mode: 'paint';
      tool: LevelObjectType;
    }
  | null;

type SelectionBox = {
  startScreenX: number;
  startScreenY: number;
  endScreenX: number;
  endScreenY: number;
};

type DragPreviewState = {
  positions: Record<string, { x: number; y: number }>;
};

type EditorMusicSyncPreview = {
  x: number;
  y: number;
  speedMultiplier: number;
  progressPercent: number;
};

type TouchGestureState = {
  startDistance: number;
  startZoom: number;
  startPanX: number;
  startPanY: number;
  startCenterX: number;
  startCenterY: number;
};

type PaintHsvState = {
  hue: number;
  saturation: number;
  brightness: number;
};

function getTriggerSetupTitle(type: LevelObjectType) {
  switch (type) {
    case 'MOVE_TRIGGER':
      return 'Setup Move Command';
    case 'ROTATE_TRIGGER':
      return 'Setup Rotate Trigger';
    case 'ALPHA_TRIGGER':
      return 'Setup Alpha Trigger';
    case 'TOGGLE_TRIGGER':
      return 'Setup Toggle Trigger';
    case 'PULSE_TRIGGER':
      return 'Setup Pulse Trigger';
    case 'POST_FX_TRIGGER':
      return 'Setup Post FX Trigger';
    default:
      return 'Trigger Setup';
  }
}

function getDefaultTriggerDurationMs(type: LevelObjectType) {
  return type === 'MOVE_TRIGGER' || type === 'ROTATE_TRIGGER' ? 650 : 900;
}

function EditorStageBackIcon() {
  return (
    <svg viewBox="0 0 64 64" className="editor-stage-icon editor-stage-icon--back" aria-hidden="true">
      <path
        d="M38 16 19 32l19 16"
        fill="none"
        stroke="#fffbe7"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 32h24" fill="none" stroke="#fffbe7" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function EditorStageUndoIcon() {
  return (
    <svg viewBox="0 0 64 64" className="editor-stage-icon editor-stage-icon--undo" aria-hidden="true">
      <path
        d="M27 20H16v11"
        fill="none"
        stroke="#d7f1ff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 30c3-8 10-12 19-12 9 0 15 5 15 14 0 8-6 14-15 14h-8"
        fill="none"
        stroke="#d7f1ff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditorStageRedoIcon() {
  return (
    <svg viewBox="0 0 64 64" className="editor-stage-icon editor-stage-icon--redo" aria-hidden="true">
      <path
        d="M37 20h11v11"
        fill="none"
        stroke="#d7e5ff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M46 30c-3-8-10-12-19-12-9 0-15 5-15 14 0 8 6 14 15 14h8"
        fill="none"
        stroke="#d7e5ff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditorStageTrashIcon() {
  return (
    <svg viewBox="0 0 64 64" className="editor-stage-icon editor-stage-icon--trash" aria-hidden="true">
      <path
        d="M24 16h16l2 5H22l2-5Z"
        fill="#f2f4f8"
        stroke="#1e2635"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M20 21h24v28c0 2.8-2.2 5-5 5H25c-2.8 0-5-2.2-5-5V21Z"
        fill="#d8dde6"
        stroke="#1e2635"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M27 27v19M32 27v19M37 27v19" fill="none" stroke="#1e2635" strokeWidth="4" strokeLinecap="round" />
      <path d="M17 21h30" fill="none" stroke="#1e2635" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

function EditorStageMusicIcon() {
  return (
    <svg viewBox="0 0 64 64" className="editor-stage-icon editor-stage-icon--music" aria-hidden="true">
      <path
        d="M16 14 47 32 16 50Z"
        fill="#ffd44a"
        stroke="#172242"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M31 23v16.5c0 3-2.5 5.5-5.5 5.5S20 42.5 20 39.5 22.5 34 25.5 34c1.2 0 2.3.3 3.2.9V25.6l11-2.7v12.6c0 3-2.5 5.5-5.5 5.5s-5.5-2.5-5.5-5.5S31.2 30 34.2 30c1.1 0 2.1.3 3 .8v-5.4L31 27Z"
        fill="#f8fbff"
        stroke="#14315f"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditorStageTestPlayIcon() {
  return (
    <svg viewBox="0 0 64 64" className="editor-stage-icon editor-stage-icon--test" aria-hidden="true">
      <path
        d="M18 14 48 32 18 50Z"
        fill="#ffd44a"
        stroke="#172242"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="13" y="25" width="13" height="13" rx="2.5" fill="#d7dde7" stroke="#172242" strokeWidth="3.5" />
    </svg>
  );
}

function EditorStageZoomIcon({ mode }: { mode: 'in' | 'out' }) {
  return (
    <svg viewBox="0 0 64 64" className="editor-stage-icon editor-stage-icon--zoom" aria-hidden="true">
      <circle cx="27" cy="27" r="15" fill="none" stroke="#fffbe7" strokeWidth="7" />
      <path d="M38 38l12 12" fill="none" stroke="#fffbe7" strokeWidth="7" strokeLinecap="round" />
      <path d="M20 27h14" fill="none" stroke="#173300" strokeWidth="6" strokeLinecap="round" />
      {mode === 'in' ? <path d="M27 20v14" fill="none" stroke="#173300" strokeWidth="6" strokeLinecap="round" /> : null}
    </svg>
  );
}

const themePresets = [
  { value: 'neon-grid', label: 'Neon Grid' },
  { value: 'cyber-night', label: 'Cyber Night' },
  { value: 'sunset-burn', label: 'Sunset Burn' },
  { value: 'acid-void', label: 'Acid Void' },
  { value: 'deep-space', label: 'Deep Space' },
] as const;

const postFxEffectOptions: Array<{ value: PostFxEffectType; label: string }> = [
  { value: 'flash', label: 'Flash' },
  { value: 'grayscale', label: 'Grayscale' },
  { value: 'invert', label: 'Invert' },
  { value: 'scanlines', label: 'Scanlines' },
  { value: 'blur', label: 'Blur' },
  { value: 'shake', label: 'Shake' },
  { value: 'tint', label: 'Tint Wash' },
];

const triggerActivationModeOptions: Array<{ value: TriggerActivationMode; label: string }> = [
  { value: 'zone', label: 'Cross Line' },
  { value: 'touch', label: 'Touch Object' },
];

const moveTriggerEasingOptions: Array<{ value: MoveTriggerEasing; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In Out' },
];

const editorOrbHitboxTypes = new Set<LevelObjectType>(['JUMP_ORB', 'DASH_ORB', 'BLUE_ORB', 'GRAVITY_ORB']);

const editorPortalHitboxTypes = new Set<LevelObjectType>([
  'GRAVITY_FLIP_PORTAL',
  'GRAVITY_RETURN_PORTAL',
  'GRAVITY_PORTAL',
  'SPEED_PORTAL',
  'SHIP_PORTAL',
  'BALL_PORTAL',
  'CUBE_PORTAL',
  'ARROW_PORTAL',
  'FINISH_PORTAL',
]);

const paletteGroups: Array<{ title: string; items: EditorTool[] }> = [
  { title: 'Controls', items: ['select', 'pan'] },
  {
    title: 'Blocks',
    items: [
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
    ],
  },
  {
    title: 'Decor',
    items: [
      'DECORATION_BLOCK',
      'DECOR_FLAME',
      'DECOR_TORCH',
      'DECOR_CHAIN',
      'DECOR_CRYSTAL',
      'DECOR_LANTERN',
      'DECOR_PLANET',
      'DECOR_RING_PLANET',
      'DECOR_STAR_CLUSTER',
      'DECOR_SATELLITE',
      'DECOR_COMET',
    ],
  },
  { title: 'Helpers', items: ['DASH_BLOCK', 'S_BLOCK'] },
  {
    title: 'Obstacles',
    items: [
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
    ],
  },
  { title: 'Boosts', items: ['JUMP_PAD', 'JUMP_ORB', 'DASH_ORB', 'BLUE_ORB', 'GRAVITY_ORB'] },
  {
    title: 'Portals',
    items: ['GRAVITY_FLIP_PORTAL', 'GRAVITY_RETURN_PORTAL', 'SPEED_PORTAL', 'SHIP_PORTAL', 'BALL_PORTAL', 'CUBE_PORTAL', 'ARROW_PORTAL'],
  },
  {
    title: 'Triggers',
    items: ['MOVE_TRIGGER', 'ROTATE_TRIGGER', 'ALPHA_TRIGGER', 'TOGGLE_TRIGGER', 'PULSE_TRIGGER', 'POST_FX_TRIGGER'],
  },
  { title: 'Preview', items: ['START_POS'] },
];

const desktopPaletteGroups = paletteGroups.filter((group) => group.title !== 'Controls');

const toolDescriptions: Record<EditorTool, string> = {
  select: 'Pick, move and inspect objects',
  pan: 'Hold Space or drag to move around',
  GROUND_BLOCK: 'Safe floor for the run',
  GROUND_BLOCK_TOP: 'Top-only support block',
  GROUND_BLOCK_TOP_BOTTOM: 'Support on top and bottom only',
  GROUND_BLOCK_TOP_LEFT: 'Support on top and left only',
  GROUND_BLOCK_TOP_RIGHT: 'Support on top and right only',
  GROUND_BLOCK_PASS: 'No support stroke, fully pass-through',
  HALF_GROUND_BLOCK: 'Half-height floor piece',
  PLATFORM_BLOCK: 'Extra landable block',
  PLATFORM_BLOCK_TOP: 'Top-only platform block',
  PLATFORM_BLOCK_TOP_BOTTOM: 'Platform support on top and bottom',
  PLATFORM_BLOCK_TOP_LEFT: 'Platform support on top and left',
  PLATFORM_BLOCK_TOP_RIGHT: 'Platform support on top and right',
  PLATFORM_BLOCK_PASS: 'Platform without support stroke, pass-through',
  HALF_PLATFORM_BLOCK: 'Half-height platform piece',
  ARROW_RAMP_ASC: 'Diagonal wall for arrow routes',
  ARROW_RAMP_DESC: 'Opposite diagonal wall for arrow routes',
  DASH_BLOCK: 'Editor-only safe zone for arrow contact on floor and ceiling blocks',
  S_BLOCK: 'Stops an active dash orb when the player reaches it',
  SPIKE: 'Primary hazard',
  SPIKE_FLAT: 'Wide low-profile spike',
  SPIKE_SMALL: 'Compact spike hazard',
  SPIKE_TINY: 'Tiny spike hazard',
  SAW_BLADE: 'Small circular saw',
  SAW_BLADE_MEDIUM: 'Medium circular saw',
  SAW_BLADE_LARGE: 'Large circular saw',
  SAW_STAR: 'Small star-shaped saw',
  SAW_STAR_MEDIUM: 'Medium star-shaped saw',
  SAW_STAR_LARGE: 'Large star-shaped saw',
  SAW_GEAR: 'Small gear saw',
  SAW_GEAR_MEDIUM: 'Medium gear saw',
  SAW_GEAR_LARGE: 'Large gear saw',
  SAW_GLOW: 'Small glow saw',
  SAW_GLOW_MEDIUM: 'Medium glow saw',
  SAW_GLOW_LARGE: 'Large glow saw',
  JUMP_PAD: 'Forces an upward bounce',
  JUMP_ORB: 'Mid-air extra jump',
  DASH_ORB: 'Starts a held dash until release or until the player touches an S block',
  BLUE_ORB: 'Flips gravity without giving a jump boost',
  GRAVITY_ORB: 'Flips gravity, then launches the player in the new direction',
  GRAVITY_FLIP_PORTAL: 'Flips gravity relative to the current direction',
  GRAVITY_RETURN_PORTAL: 'Returns gravity to the normal downward direction',
  GRAVITY_PORTAL: 'Legacy alias that auto-converts to Gravity Flip',
  SPEED_PORTAL: 'Changes run speed',
  SHIP_PORTAL: 'Switches into ship mode',
  BALL_PORTAL: 'Switches into ball mode',
  CUBE_PORTAL: 'Returns to cube mode',
  ARROW_PORTAL: 'Switches into arrow mode',
  FINISH_PORTAL: 'Legacy finish marker',
  MOVE_TRIGGER: 'Moves a paint group during the run and can follow the player on X/Y',
  ROTATE_TRIGGER: 'Rotates a paint group around a center group with GD-style timing and easing',
  ALPHA_TRIGGER: 'Changes group opacity',
  TOGGLE_TRIGGER: 'Shows or hides a group',
  PULSE_TRIGGER: 'Pulses a group color for a short burst',
  POST_FX_TRIGGER: 'Applies fullscreen post-processing effects during the run',
  DECORATION_BLOCK: 'Visual block only',
  DECOR_FLAME: 'Animated ambient fire without gameplay collision',
  DECOR_TORCH: 'Wall torch with a small flame',
  DECOR_CHAIN: 'Hanging chain for ceilings and industrial sections',
  DECOR_CRYSTAL: 'Glowing crystal cluster',
  DECOR_LANTERN: 'Hanging lantern with warm light',
  DECOR_PLANET: 'Large planet for space backdrops',
  DECOR_RING_PLANET: 'Planet with a wide orbit ring',
  DECOR_STAR_CLUSTER: 'Sparkling star cluster',
  DECOR_SATELLITE: 'Floating sci-fi satellite',
  DECOR_COMET: 'Bright comet with a trailing tail',
  START_MARKER: 'Legacy spawn point',
  START_POS: 'Preview checkpoint for editor testing',
};

const EDITOR_CANVAS_WIDTH = 1180;
const EDITOR_CANVAS_HEIGHT = 560;
const EDITOR_CANVAS_ASPECT_RATIO = EDITOR_CANVAS_WIDTH / EDITOR_CANVAS_HEIGHT;
const EDITOR_DEFAULT_PAN_X = 60;
const EDITOR_DEFAULT_PAN_Y = 80;
const EDITOR_SCROLL_PADDING_UNITS = 6;
const EDITOR_VIEWPORT_CULL_PADDING_UNITS = 3;
const MAX_CUSTOM_MUSIC_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_EDITOR_HISTORY_STEPS = 40;
const MIN_EDITOR_LAYER = 1;
const MAX_EDITOR_LAYERS = 10;
const EDITOR_BLOCK_SUPPORT_BAND_THICKNESS_UNITS = 0.12;

type EditorInitialState = {
  title: string;
  description: string;
  theme: string;
  levelData: LevelData;
  restoredFromLocal: boolean;
};

function syncDerivedLevelData(next: LevelData) {
  next.objects = stripLegacyRunAnchorObjects(next.objects);
  next.player.startX = FIXED_LEVEL_START_X;
  next.player.startY = FIXED_LEVEL_START_Y;

  for (const object of next.objects) {
    object.editorLayer = clampEditorLayer(object.editorLayer);
  }

  const autoFinishX = computeAutoLevelFinishX(next);
  next.finish = {
    x: autoFinishX,
    y: FIXED_LEVEL_START_Y,
  };
  const maxX = Math.max(autoFinishX + 6, ...next.objects.map((object) => object.x + object.w + 12));
  next.meta.lengthUnits = Math.max(60, Math.ceil(maxX));
  return next;
}

function clampEditorLayer(value: unknown): EditorLayerId {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return MIN_EDITOR_LAYER;
  }

  return Math.min(MAX_EDITOR_LAYERS, Math.max(MIN_EDITOR_LAYER, Math.round(numericValue)));
}

function getHighestEditorLayer(objects: LevelObject[]) {
  return objects.reduce((highestLayer, object) => Math.max(highestLayer, clampEditorLayer(object.editorLayer)), MIN_EDITOR_LAYER);
}

function compareEditorLayerDrawOrder(left: Pick<LevelObject, 'editorLayer'>, right: Pick<LevelObject, 'editorLayer'>) {
  return clampEditorLayer(right.editorLayer) - clampEditorLayer(left.editorLayer);
}

function getEditorViewportWorldBounds(
  panX: number,
  panY: number,
  viewportWidth: number,
  viewportHeight: number,
  cell: number,
  paddingUnits = EDITOR_VIEWPORT_CULL_PADDING_UNITS,
) {
  if (cell <= 0) {
    return {
      left: Number.NEGATIVE_INFINITY,
      top: Number.NEGATIVE_INFINITY,
      right: Number.POSITIVE_INFINITY,
      bottom: Number.POSITIVE_INFINITY,
    };
  }

  return {
    left: -panX / cell - paddingUnits,
    top: -panY / cell - paddingUnits,
    right: (viewportWidth - panX) / cell + paddingUnits,
    bottom: (viewportHeight - panY) / cell + paddingUnits,
  };
}

function objectIntersectsEditorViewport(
  object: Pick<LevelObject, 'x' | 'y' | 'w' | 'h'>,
  viewport: ReturnType<typeof getEditorViewportWorldBounds>,
) {
  return (
    object.x <= viewport.right &&
    object.x + object.w >= viewport.left &&
    object.y <= viewport.bottom &&
    object.y + object.h >= viewport.top
  );
}

function getPaletteGroupTitle(tool: EditorTool) {
  return paletteGroups.find((group) => group.items.includes(tool))?.title ?? 'Blocks';
}

function getPaletteGroupButtonLabel(title: string) {
  switch (title) {
    case 'Controls':
      return 'Ctrl';
    case 'Helpers':
      return 'Helper';
    case 'Obstacles':
      return 'Hazards';
    case 'Boosts':
      return 'Boost';
    case 'Portals':
      return 'Portal';
    case 'Triggers':
      return 'Trigger';
    case 'Preview':
      return 'Start Pos';
    default:
      return title;
  }
}

function getDesktopPalettePreviewTool(groupTitle: string): EditorTool {
  switch (groupTitle) {
    case 'Blocks':
      return 'GROUND_BLOCK';
    case 'Decor':
      return 'DECOR_PLANET';
    case 'Helpers':
      return 'DASH_BLOCK';
    case 'Obstacles':
      return 'SPIKE';
    case 'Boosts':
      return 'JUMP_PAD';
    case 'Portals':
      return 'GRAVITY_FLIP_PORTAL';
    case 'Triggers':
      return 'MOVE_TRIGGER';
    case 'Preview':
      return 'START_POS';
    default:
      return 'GROUND_BLOCK';
  }
}

function canUseDragPlacementTool(tool: EditorTool): tool is LevelObjectType {
  return (
    tool !== 'select' &&
    tool !== 'pan' &&
    tool !== 'START_MARKER' &&
    tool !== 'START_POS' &&
    tool !== 'FINISH_PORTAL' &&
    tool !== 'MOVE_TRIGGER' &&
    tool !== 'ROTATE_TRIGGER' &&
    tool !== 'ALPHA_TRIGGER' &&
    tool !== 'TOGGLE_TRIGGER' &&
    tool !== 'PULSE_TRIGGER' &&
    tool !== 'POST_FX_TRIGGER'
  );
}

function getPlacementStrokeKey(type: LevelObjectType, x: number, y: number, editorLayer: EditorLayerId) {
  return `${editorLayer}:${type}:${x}:${y}`;
}

function getDefaultPlacementPosition(type: LevelObjectType, x: number, y: number) {
  const definition = levelObjectDefinitions[type];

  if (type === 'JUMP_PAD') {
    return {
      x,
      y: y + Math.max(0, 1 - definition.defaultSize.h),
    };
  }

  if (isSpikeObjectType(type)) {
    return {
      x: x + Math.max(0, (1 - definition.defaultSize.w) / 2),
      y: y + Math.max(0, 1 - definition.defaultSize.h),
    };
  }

  if (isSawObjectType(type) && (definition.defaultSize.w < 1 || definition.defaultSize.h < 1)) {
    return {
      x: x + Math.max(0, (1 - definition.defaultSize.w) / 2),
      y: y + Math.max(0, (1 - definition.defaultSize.h) / 2),
    };
  }

  return { x, y };
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());
}

function getEditorColorInputValue(value: string, fallback: string) {
  return isHexColor(value) ? value : fallback;
}

function parseEditorHexColor(value: string) {
  const normalized = value.trim().replace('#', '');

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toEditorHexColor(color: { r: number; g: number; b: number }) {
  return `#${[color.r, color.g, color.b]
    .map((channel) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, '0'))
    .join('')}`;
}

function rgbToHsv(color: { r: number; g: number; b: number }) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta > 0) {
    if (max === r) {
      hue = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      hue = 60 * ((b - r) / delta + 2);
    } else {
      hue = 60 * ((r - g) / delta + 4);
    }
  }

  return {
    h: (hue + 360) % 360,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToRgb(color: { h: number; s: number; v: number }) {
  const hue = ((color.h % 360) + 360) % 360;
  const saturation = clamp(color.s, 0, 2);
  const value = clamp(color.v, 0, 2);
  const chroma = value * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (segment >= 0 && segment < 1) {
    r = chroma;
    g = x;
  } else if (segment < 2) {
    r = x;
    g = chroma;
  } else if (segment < 3) {
    g = chroma;
    b = x;
  } else if (segment < 4) {
    g = x;
    b = chroma;
  } else if (segment < 5) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  const match = value - chroma;
  return {
    r: Math.round((r + match) * 255),
    g: Math.round((g + match) * 255),
    b: Math.round((b + match) * 255),
  };
}

function applyHsvToHex(value: string, hsvState: PaintHsvState) {
  const parsed = parseEditorHexColor(value);

  if (!parsed) {
    return value;
  }

  const base = rgbToHsv(parsed);
  return toEditorHexColor(
    hsvToRgb({
      h: base.h + hsvState.hue,
      s: base.s * hsvState.saturation,
      v: base.v * hsvState.brightness,
    }),
  );
}

function isDirectMusicSource(value: string) {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('blob:') ||
    value.startsWith('data:audio/')
  );
}

function getInitialMusicUrlInput(music: string) {
  return isDirectMusicSource(music) && !music.startsWith('data:audio/') ? music : '';
}

function inferMusicLabel(source: string) {
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    return 'Custom Track';
  }

  if (trimmedSource.startsWith('data:audio/')) {
    return 'Uploaded Track';
  }

  const lastSegment = trimmedSource.split('/').pop() ?? trimmedSource;
  return decodeURIComponent(lastSegment) || 'Custom Track';
}

function createInitialEditorState(initialLevel: Level | null | undefined, draftStorageKey: string): EditorInitialState {
  const localDraft = readLocalEditorDraft(draftStorageKey);

  if (localDraft) {
    return {
      title: localDraft.title,
      description: localDraft.description,
      theme: localDraft.theme,
      levelData: syncDerivedLevelData(structuredClone(localDraft.dataJson)),
      restoredFromLocal: true,
    };
  }

  const baseLevelData = initialLevel?.dataJson
    ? syncDerivedLevelData(structuredClone(initialLevel.dataJson))
    : createEmptyLevelData(initialLevel?.theme ?? 'neon-grid');

  return {
    title: initialLevel?.title ?? 'Untitled Level',
    description: initialLevel?.description ?? '',
    theme: initialLevel?.theme ?? 'neon-grid',
    levelData: baseLevelData,
    restoredFromLocal: false,
  };
}

export function LevelEditor({
  initialLevel,
  draftStorageKey,
  saveLabel = 'Save Draft',
  onClose,
  onSave,
  onSubmit,
}: LevelEditorProps) {
  const initialEditorState = useMemo(
    () => createInitialEditorState(initialLevel, draftStorageKey),
    [initialLevel, draftStorageKey],
  );
  const [title, setTitle] = useState(initialEditorState.title);
  const [description, setDescription] = useState(initialEditorState.description);
  const [theme, setTheme] = useState(initialEditorState.theme);
  const [levelData, setLevelData] = useState<LevelData>(initialEditorState.levelData);
  const [history, setHistory] = useState<LevelData[]>([initialEditorState.levelData]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedTool, setSelectedTool] = useState<EditorTool>('select');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [dragPreviewState, setDragPreviewState] = useState<DragPreviewState | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [activePaletteGroup, setActivePaletteGroup] = useState<string>('Blocks');
  const [paletteDrawerGroup, setPaletteDrawerGroup] = useState<string | null>(null);
  const [placementMode, setPlacementMode] = useState<PlacementMode>('single');
  const [editorWorkspaceMode, setEditorWorkspaceMode] = useState<EditorWorkspaceMode>('build');
  const [maxEditorLayer, setMaxEditorLayer] = useState(() => getHighestEditorLayer(initialEditorState.levelData.objects));
  const [activeEditorLayer, setActiveEditorLayer] = useState<EditorLayerId>(MIN_EDITOR_LAYER);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: EDITOR_DEFAULT_PAN_X, y: EDITOR_DEFAULT_PAN_Y });
  const [cursorWorld, setCursorWorld] = useState({ x: 0, y: 0 });
  const [canvasViewport, setCanvasViewport] = useState({ width: EDITOR_CANVAS_WIDTH, height: EDITOR_CANVAS_HEIGHT });
  const [showPreview, setShowPreview] = useState(false);
  const [isInlineTestMode, setIsInlineTestMode] = useState(false);
  const [inlineTestRunSeed, setInlineTestRunSeed] = useState(0);
  const [inlineTestDeathMarker, setInlineTestDeathMarker] = useState<{ x: number; y: number } | null>(null);
  const [inlineTestPathPoints, setInlineTestPathPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [inlineTestStopSignal, setInlineTestStopSignal] = useState(0);
  const [inlineTestShowTriggersOnPlayMode, setInlineTestShowTriggersOnPlayMode] = useState(false);
  const [editorShowHitboxes, setEditorShowHitboxes] = useState(false);
  const [isMusicSyncPreviewActive, setIsMusicSyncPreviewActive] = useState(false);
  const [musicSyncPreviewElapsedMs, setMusicSyncPreviewElapsedMs] = useState(0);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isMobileSettingsExpanded, setIsMobileSettingsExpanded] = useState(false);
  const [showDesktopSetup, setShowDesktopSetup] = useState(false);
  const [isEditorPauseMenuOpen, setIsEditorPauseMenuOpen] = useState(false);
  const [previewRunSeed, setPreviewRunSeed] = useState(0);
  const [isPaintPopupOpen, setIsPaintPopupOpen] = useState(false);
  const [isTriggerPopupOpen, setIsTriggerPopupOpen] = useState(false);
  const [isPaintHsvPopupOpen, setIsPaintHsvPopupOpen] = useState(false);
  const [paintHsvState, setPaintHsvState] = useState<PaintHsvState>({
    hue: 0,
    saturation: 1,
    brightness: 1,
  });
  const [activePaintGroupId, setActivePaintGroupId] = useState<number | null>(null);
  const [musicUrlInput, setMusicUrlInput] = useState(() => getInitialMusicUrlInput(initialEditorState.levelData.meta.music));
  const [musicLabelInput, setMusicLabelInput] = useState(initialEditorState.levelData.meta.musicLabel ?? '');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveProgressPercent, setSaveProgressPercent] = useState<number | null>(null);
  const [message, setMessage] = useState<string>(initialEditorState.restoredFromLocal ? 'Local draft restored.' : '');
  const paintHsvBaseColorsRef = useRef<{ fillColor: string; strokeColor: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageFrameRef = useRef<HTMLDivElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const isSpacePressedRef = useRef(false);
  const liveLevelDataRef = useRef(levelData);
  const dragPreviewStateRef = useRef<DragPreviewState | null>(null);
  const touchPointsRef = useRef(new Map<number, { x: number; y: number }>());
  const touchGestureRef = useRef<TouchGestureState | null>(null);
  const paintStrokeCellsRef = useRef<Set<string>>(new Set());
  const paintStrokeDirtyRef = useRef(false);
  const musicSyncAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicSyncFrameRef = useRef<number | null>(null);

  const loadedDraftStorageKeyRef = useRef(draftStorageKey);
  const updateCursorWorld = useCallback((x: number, y: number) => {
    setCursorWorld((current) => (current.x === x && current.y === y ? current : { x, y }));
  }, []);

  useEffect(() => {
    if (loadedDraftStorageKeyRef.current === draftStorageKey) {
      return;
    }

    loadedDraftStorageKeyRef.current = draftStorageKey;

    const nextEditorState = createInitialEditorState(initialLevel, draftStorageKey);
    setTitle(nextEditorState.title);
    setDescription(nextEditorState.description);
    setTheme(nextEditorState.theme);
    setLevelData(nextEditorState.levelData);
    setHistory([nextEditorState.levelData]);
    setHistoryIndex(0);
    setSelectedTool('select');
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    dragPreviewStateRef.current = null;
    setDragPreviewState(null);
    setSelectionBox(null);
    setActivePaletteGroup('Blocks');
    setPaletteDrawerGroup(null);
    setEditorWorkspaceMode('build');
    setMaxEditorLayer(getHighestEditorLayer(nextEditorState.levelData.objects));
    setActiveEditorLayer(1);
    setZoom(1);
    setPan({ x: EDITOR_DEFAULT_PAN_X, y: EDITOR_DEFAULT_PAN_Y });
    setCursorWorld({ x: 0, y: 0 });
    setShowPreview(false);
    setIsInlineTestMode(false);
    setInlineTestRunSeed(0);
    setInlineTestDeathMarker(null);
    setInlineTestPathPoints([]);
    setInlineTestStopSignal(0);
    setInlineTestShowTriggersOnPlayMode(false);
    if (musicSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(musicSyncFrameRef.current);
      musicSyncFrameRef.current = null;
    }
    if (musicSyncAudioRef.current) {
      musicSyncAudioRef.current.pause();
      musicSyncAudioRef.current.src = '';
      musicSyncAudioRef.current = null;
    }
    setIsMusicSyncPreviewActive(false);
    setMusicSyncPreviewElapsedMs(0);
    setShowDesktopSetup(false);
    setIsEditorPauseMenuOpen(false);
    setPreviewRunSeed(0);
    setIsPaintPopupOpen(false);
    setIsTriggerPopupOpen(false);
    setIsPaintHsvPopupOpen(false);
    setPaintHsvState({ hue: 0, saturation: 1, brightness: 1 });
    paintHsvBaseColorsRef.current = null;
    setActivePaintGroupId(null);
    setMusicUrlInput(getInitialMusicUrlInput(nextEditorState.levelData.meta.music));
    setMusicLabelInput(nextEditorState.levelData.meta.musicLabel ?? '');
    setSaveState('idle');
    setSaveProgressPercent(null);
    setMessage(nextEditorState.restoredFromLocal ? 'Local draft restored.' : '');
  }, [draftStorageKey, initialLevel]);

  useEffect(() => {
    liveLevelDataRef.current = levelData;
  }, [levelData]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 860px), (pointer: coarse)');
    const syncMobileLayout = () => {
      setIsMobileLayout(mediaQuery.matches);
    };

    syncMobileLayout();
    mediaQuery.addEventListener('change', syncMobileLayout);

    return () => {
      mediaQuery.removeEventListener('change', syncMobileLayout);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('editor-mobile-preview-open', showPreview);
    return () => {
      document.body.classList.remove('editor-mobile-preview-open');
    };
  }, [showPreview]);

  useEffect(() => {
    return () => {
      if (musicSyncFrameRef.current !== null) {
        window.cancelAnimationFrame(musicSyncFrameRef.current);
      }

      if (musicSyncAudioRef.current) {
        musicSyncAudioRef.current.pause();
        musicSyncAudioRef.current.src = '';
      }
    };
  }, []);

  const applySelection = useCallback((nextIds: string[], nextPrimaryId?: string | null) => {
    const uniqueIds = [...new Set(nextIds)];
    const primaryId =
      nextPrimaryId && uniqueIds.includes(nextPrimaryId)
        ? nextPrimaryId
        : uniqueIds[0] ?? null;

    setSelectedObjectIds(uniqueIds);
    setSelectedObjectId(primaryId);
  }, []);

  const clearSelection = useCallback(() => {
    applySelection([], null);
    dragPreviewStateRef.current = null;
    setDragPreviewState(null);
    setSelectionBox(null);
  }, [applySelection]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      writeLocalEditorDraft(draftStorageKey, {
        title,
        description,
        theme,
        dataJson: levelData,
        levelId: initialLevel?.id ?? null,
      });
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [description, draftStorageKey, initialLevel?.id, levelData, theme, title]);

  const selectedObject = useMemo(() => {
    const baseObject = levelData.objects.find((object) => object.id === selectedObjectId) ?? null;

    if (!baseObject) {
      return null;
    }

    const previewPosition = dragPreviewState?.positions[baseObject.id];

    if (previewPosition) {
      return {
        ...baseObject,
        x: previewPosition.x,
        y: previewPosition.y,
      };
    }

    return baseObject;
  }, [dragPreviewState, levelData.objects, selectedObjectId]);
  const selectedObjectIdSet = useMemo(() => new Set(selectedObjectIds), [selectedObjectIds]);
  const selectedObjects = useMemo(
    () =>
      levelData.objects.filter((object) => selectedObjectIdSet.has(object.id)).map((object) => {
        const previewPosition = dragPreviewState?.positions[object.id];

        if (previewPosition) {
          return {
            ...object,
            x: previewPosition.x,
            y: previewPosition.y,
          };
        }

        return object;
      }),
    [dragPreviewState, levelData.objects, selectedObjectIdSet],
  );
  const selectedDefinition = useMemo(
    () => (selectedObject ? levelObjectDefinitions[selectedObject.type] : null),
    [selectedObject],
  );
  const orderedLevelObjects = useMemo(() => [...levelData.objects].sort(compareEditorLayerDrawOrder), [levelData.objects]);
  const drawableLevelObjects = useMemo(
    () =>
      orderedLevelObjects.map((object) => {
        const previewPosition = dragPreviewState?.positions[object.id];

        return previewPosition
          ? {
              ...object,
              x: previewPosition.x,
              y: previewPosition.y,
            }
          : object;
      }),
    [dragPreviewState, orderedLevelObjects],
  );
  const visibleDrawableObjects = useMemo(() => {
    const viewportCell = levelData.meta.gridSize * zoom;
    const viewportBounds = getEditorViewportWorldBounds(
      pan.x,
      pan.y,
      canvasViewport.width,
      canvasViewport.height,
      viewportCell,
    );

    return drawableLevelObjects.filter((object) => objectIntersectsEditorViewport(object, viewportBounds));
  }, [canvasViewport.height, canvasViewport.width, drawableLevelObjects, levelData.meta.gridSize, pan.x, pan.y, zoom]);
  const activeLayerObjectsTopDown = useMemo(() => {
    const nextObjects: LevelObject[] = [];

    for (let index = drawableLevelObjects.length - 1; index >= 0; index -= 1) {
      const object = drawableLevelObjects[index];

      if (object.editorLayer === activeEditorLayer) {
        nextObjects.push(object);
      }
    }

    return nextObjects;
  }, [activeEditorLayer, drawableLevelObjects]);
  const activeToolDescription = toolDescriptions[selectedTool];
  const activeToolLabel =
    selectedTool === 'select' ? 'Select' : selectedTool === 'pan' ? 'Pan' : levelObjectDefinitions[selectedTool].label;
  const paletteDrawer = useMemo(
    () => paletteGroups.find((group) => group.title === paletteDrawerGroup) ?? null,
    [paletteDrawerGroup],
  );
  const stageThemePalette = useMemo(() => getStageThemePalette(theme), [theme]);
  const resolvedGroundColor = useMemo(
    () => getStageGroundPalette(theme, levelData.meta.groundColor).base,
    [levelData.meta.groundColor, theme],
  );
  const colorGroups = useMemo(() => levelData.meta.colorGroups ?? [], [levelData.meta.colorGroups]);
  const resolvedMusic = useMemo(() => resolveLevelMusic(levelData.meta), [levelData.meta]);
  const selectionLabel =
    selectedObjects.length > 1
      ? `${selectedObjects.length} objects`
      : selectedObject
        ? selectedDefinition?.label ?? selectedObject.type
        : 'Nothing selected';
  const paintableSelectedObject = selectedObject && isPaintableObjectType(selectedObject.type) ? selectedObject : null;
  const paintableSelectedObjects = useMemo(
    () => selectedObjects.filter((object) => isPaintableObjectType(object.type)),
    [selectedObjects],
  );
  const selectedTriggerObject =
    selectedObjects.length === 1 && selectedObject && isTriggerObjectType(selectedObject.type) ? selectedObject : null;
  const selectedPaintGroupTriggerObject =
    selectedTriggerObject && selectedTriggerObject.type !== 'POST_FX_TRIGGER' ? selectedTriggerObject : null;
  const selectedPaintGroupId = getObjectPaintGroupId(paintableSelectedObject);
  const selectedPaintFillColor = paintableSelectedObject
    ? getObjectFillColor(paintableSelectedObject, colorGroups)
    : '#ffffff';
  const selectedPaintStrokeColor = paintableSelectedObject
    ? getObjectStrokeColor(paintableSelectedObject, colorGroups)
    : '#ffffff';
  const normalizedSelectedRotation = normalizeObjectRotationDegrees(selectedObject?.rotation ?? 0);
  const selectedRotationLabel = formatRotationDegrees(normalizedSelectedRotation);
  const activePaintTool =
    selectedTool !== 'select' && selectedTool !== 'pan' && isPaintableObjectType(selectedTool) ? selectedTool : null;
  const canOpenPaintPopup = Boolean(paintableSelectedObjects.length > 0 || activePaintTool);
  const canOpenSelectedObjectPaintPopup = paintableSelectedObjects.length > 0;
  const isSelectedObjectPaintPopupOpen = Boolean(isPaintPopupOpen && paintableSelectedObject);
  const canOpenTriggerPopup = Boolean(selectedTriggerObject);
  const isEditObjectPopupOpen = Boolean(isSelectedObjectPaintPopupOpen || isTriggerPopupOpen);
  const paintGroupIds = useMemo(() => {
    const ids = new Set<number>();

    for (const group of levelData.meta.colorGroups ?? []) {
      ids.add(group.id);
    }

    for (const object of levelData.objects) {
      const groupId = getObjectPaintGroupId(object);

      if (groupId) {
        ids.add(groupId);
      }
    }

    return Array.from(ids).sort((left, right) => left - right);
  }, [levelData.meta.colorGroups, levelData.objects]);
  const nextFreePaintGroupId = useMemo(() => {
    const occupiedIds = new Set<number>(paintGroupIds);
    let groupId = 1;

    while (occupiedIds.has(groupId)) {
      groupId += 1;
    }

    return groupId;
  }, [paintGroupIds]);
  const placementModeLabel = placementMode === 'drag' ? 'Drag' : 'Single';
  const dragPlacementAvailable = canUseDragPlacementTool(selectedTool);
  const activeEditorLayerLabel = `Layer ${activeEditorLayer}`;
  const canAddEditorLayer = maxEditorLayer < MAX_EDITOR_LAYERS;
  const canStepEditorLayerBackward = activeEditorLayer > MIN_EDITOR_LAYER;
  const canStepEditorLayerForward = activeEditorLayer < maxEditorLayer || canAddEditorLayer;
  const activeEditorLayerProgressLabel = `${activeEditorLayer}/${maxEditorLayer}`;
  const desktopActivePaletteGroupTitle = desktopPaletteGroups.some((group) => group.title === activePaletteGroup)
    ? activePaletteGroup
    : 'Blocks';
  const desktopPaletteDrawer =
    desktopPaletteGroups.find((group) => group.title === desktopActivePaletteGroupTitle) ?? desktopPaletteGroups[0] ?? null;
  const trayPaletteGroup = isMobileLayout ? paletteDrawer : desktopPaletteDrawer;
  const desktopPaletteGroupIndex = Math.max(
    0,
    desktopPaletteGroups.findIndex((group) => group.title === desktopActivePaletteGroupTitle),
  );
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const historyPosition = `${historyIndex + 1}/${history.length}`;
  const selectionSummary =
    selectedObjects.length > 1
      ? `${selectedObjects.length} objects selected`
      : selectedObject
        ? `${selectedDefinition?.label ?? selectedObject.type} at ${selectedObject.x}, ${selectedObject.y}`
        : 'No object selected';
  const objectCount = String(levelData.objects.length);
  const musicOffsetMsValue = Math.max(0, Number(levelData.meta.musicOffsetMs ?? 0) || 0);
  const startPosObjects = useMemo(
    () => levelData.objects.filter((object) => object.type === 'START_POS'),
    [levelData.objects],
  );
  const startPosCount = startPosObjects.length;
  const hasStartPositions = startPosCount > 0;
  const activePreviewStartPos = hasStartPositions ? startPosObjects[startPosObjects.length - 1] : null;
  const musicSyncBootstrap = useMemo(
    () =>
      buildPreviewBootstrap(
        levelData,
        activePreviewStartPos
          ? {
              x: activePreviewStartPos.x,
              y: activePreviewStartPos.y,
            }
          : null,
      ),
    [activePreviewStartPos, levelData],
  );
  const musicSyncPreview = useMemo(
    () => buildEditorMusicSyncPreview(levelData, musicSyncBootstrap, musicSyncPreviewElapsedMs),
    [levelData, musicSyncBootstrap, musicSyncPreviewElapsedMs],
  );
  const stageCell = levelData.meta.gridSize * zoom;
  const visibleStageUnits = canvasViewport.width / stageCell;
  const horizontalScrollMax = Math.max(0, levelData.meta.lengthUnits + EDITOR_SCROLL_PADDING_UNITS - visibleStageUnits);
  const horizontalScrollValue = clamp((EDITOR_DEFAULT_PAN_X - pan.x) / stageCell, 0, horizontalScrollMax);

  const commitLevelData = useCallback(
    (next: LevelData, options?: { pushHistory?: boolean }) => {
      const normalized = syncDerivedLevelData(next);
      const shouldPushHistory = options?.pushHistory ?? true;

      if (shouldPushHistory) {
        const trimmedHistory = history.slice(0, historyIndex + 1);
        const nextHistory = [...trimmedHistory, normalized];
        const cappedHistory =
          nextHistory.length > MAX_EDITOR_HISTORY_STEPS
            ? nextHistory.slice(nextHistory.length - MAX_EDITOR_HISTORY_STEPS)
            : nextHistory;

        setHistory(cappedHistory);
        setHistoryIndex(cappedHistory.length - 1);
      }

      liveLevelDataRef.current = normalized;
      setLevelData(normalized);
    },
    [history, historyIndex],
  );

  useEffect(() => {
    setActivePaletteGroup(getPaletteGroupTitle(selectedTool));
  }, [selectedTool]);

  useEffect(() => {
    if (!paintableSelectedObjects.length && !activePaintTool) {
      setIsPaintPopupOpen(false);
    }
  }, [activePaintTool, paintableSelectedObjects.length]);

  useEffect(() => {
    if (!isPaintPopupOpen || !paintableSelectedObject) {
      setIsPaintHsvPopupOpen(false);
      setPaintHsvState({ hue: 0, saturation: 1, brightness: 1 });
      paintHsvBaseColorsRef.current = null;
    }
  }, [isPaintPopupOpen, paintableSelectedObject]);

  useEffect(() => {
    if (!selectedTriggerObject) {
      setIsTriggerPopupOpen(false);
    }
  }, [selectedTriggerObject]);

  useEffect(() => {
    const availableIds = new Set(levelData.objects.map((object) => object.id));
    const nextIds = selectedObjectIds.filter((id) => availableIds.has(id));
    const nextPrimaryId = selectedObjectId && availableIds.has(selectedObjectId) ? selectedObjectId : nextIds[0] ?? null;

    if (nextIds.length !== selectedObjectIds.length || nextPrimaryId !== selectedObjectId) {
      applySelection(nextIds, nextPrimaryId);
    }
  }, [applySelection, levelData.objects, selectedObjectId, selectedObjectIds]);

  useEffect(() => {
    if (activePaintGroupId && !getColorGroupById(colorGroups, activePaintGroupId)) {
      setActivePaintGroupId(null);
    }
  }, [activePaintGroupId, colorGroups]);

  useEffect(() => {
    if (activeEditorLayer > maxEditorLayer) {
      setActiveEditorLayer(maxEditorLayer);
    }
  }, [activeEditorLayer, maxEditorLayer]);

  const stopMusicSyncPreview = useCallback((nextMessage?: string) => {
    if (musicSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(musicSyncFrameRef.current);
      musicSyncFrameRef.current = null;
    }

    if (musicSyncAudioRef.current) {
      musicSyncAudioRef.current.pause();
      musicSyncAudioRef.current.src = '';
      musicSyncAudioRef.current = null;
    }

    setIsMusicSyncPreviewActive(false);
    setMusicSyncPreviewElapsedMs(0);

    if (nextMessage) {
      setMessage(nextMessage);
    }
  }, []);

  const launchMusicSyncPreview = useCallback(
    (forceRestart = false) => {
      if (!resolvedMusic.src) {
        setMessage('Attach a music track first, then start the sync preview.');
        return;
      }

      if (isMusicSyncPreviewActive && !forceRestart) {
        stopMusicSyncPreview('Music sync preview stopped.');
        return;
      }

      if (musicSyncFrameRef.current !== null) {
        window.cancelAnimationFrame(musicSyncFrameRef.current);
        musicSyncFrameRef.current = null;
      }

      if (musicSyncAudioRef.current) {
        musicSyncAudioRef.current.pause();
        musicSyncAudioRef.current.src = '';
        musicSyncAudioRef.current = null;
      }

      setShowPreview(false);
      setShowDesktopSetup(false);
      setMusicSyncPreviewElapsedMs(0);
      setIsMusicSyncPreviewActive(true);

      const nextAudio = new Audio(resolvedMusic.src);
      const playbackStartMs = Math.max(0, musicOffsetMsValue + musicSyncBootstrap.elapsedMs);
      nextAudio.preload = 'auto';
      nextAudio.volume = readStoredMusicVolume();
      musicSyncAudioRef.current = nextAudio;

      const syncPlaybackTime = () => {
        if (musicSyncAudioRef.current !== nextAudio) {
          return;
        }

        const elapsedMs = Math.max(0, nextAudio.currentTime * 1000 - playbackStartMs);
        setMusicSyncPreviewElapsedMs(elapsedMs);
        musicSyncFrameRef.current = window.requestAnimationFrame(syncPlaybackTime);
      };

      const startPlayback = () => {
        const duration = Number.isFinite(nextAudio.duration) && nextAudio.duration > 0 ? nextAudio.duration : null;
        const safeCurrentTime = duration
          ? Math.min(playbackStartMs / 1000, Math.max(0, duration - 0.05))
          : playbackStartMs / 1000;

        nextAudio.currentTime = Math.max(0, safeCurrentTime);

        void nextAudio
          .play()
          .then(() => {
            if (musicSyncAudioRef.current !== nextAudio) {
              return;
            }

            syncPlaybackTime();
          })
          .catch(() => {
            stopMusicSyncPreview('The browser could not start the music sync preview.');
          });
      };

      nextAudio.addEventListener(
        'ended',
        () => {
          if (musicSyncAudioRef.current !== nextAudio) {
            return;
          }

          stopMusicSyncPreview('Music sync preview finished.');
        },
        { once: true },
      );

      if (nextAudio.readyState >= 1) {
        startPlayback();
      } else {
        nextAudio.addEventListener('loadedmetadata', startPlayback, { once: true });
      }

      setMessage('Music sync preview started.');
    },
    [isMusicSyncPreviewActive, musicOffsetMsValue, musicSyncBootstrap.elapsedMs, resolvedMusic.src, stopMusicSyncPreview],
  );

  const toggleGameplayPreview = useCallback(() => {
    if (isMusicSyncPreviewActive) {
      stopMusicSyncPreview();
    }

    setShowPreview((current) => !current);
  }, [isMusicSyncPreviewActive, stopMusicSyncPreview]);

  const openGameplayPreview = useCallback(() => {
    if (isMusicSyncPreviewActive) {
      stopMusicSyncPreview();
    }

    setShowPreview(true);
    setPreviewRunSeed((current) => current + 1);
  }, [isMusicSyncPreviewActive, stopMusicSyncPreview]);

  useEffect(() => {
    if ((showPreview || isInlineTestMode) && isMusicSyncPreviewActive) {
      stopMusicSyncPreview();
    }
  }, [isInlineTestMode, isMusicSyncPreviewActive, showPreview, stopMusicSyncPreview]);

  useEffect(() => {
    if ((showPreview || isInlineTestMode) && isEditorPauseMenuOpen) {
      setIsEditorPauseMenuOpen(false);
    }
  }, [isEditorPauseMenuOpen, isInlineTestMode, showPreview]);

  useEffect(() => {
    const stageFrame = stageFrameRef.current;

    if (!stageFrame) {
      return;
    }

    const updateViewport = () => {
      const styles = window.getComputedStyle(stageFrame);
      const paddingX = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const paddingY = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
      const availableWidth = Math.max(640, Math.floor(stageFrame.clientWidth - paddingX));
      const availableHeight = Math.max(420, Math.floor(stageFrame.clientHeight - paddingY));

      let nextWidth = availableWidth;
      let nextHeight = Math.floor(nextWidth / EDITOR_CANVAS_ASPECT_RATIO);

      if (nextHeight > availableHeight) {
        nextHeight = availableHeight;
        nextWidth = Math.floor(nextHeight * EDITOR_CANVAS_ASPECT_RATIO);
      }

      setCanvasViewport({
        width: nextWidth,
        height: nextHeight,
      });
    };

    updateViewport();

    const observer = new ResizeObserver(() => {
      updateViewport();
    });

    observer.observe(stageFrame);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isEditableTarget = isTextInputLike(event.target);
      const isPreviewGameplayKey = (showPreview || isInlineTestMode) && ['Space', 'ArrowUp', 'KeyW'].includes(event.code);

      if (event.code === 'Space' && !isEditableTarget && !showPreview && !isInlineTestMode) {
        isSpacePressedRef.current = true;
      }

      if (!isEditableTarget && !showPreview && !isInlineTestMode && event.key === 'Escape') {
        event.preventDefault();
        clearSelection();
        setIsEditorPauseMenuOpen((current) => !current);
        return;
      }

      if (isEditableTarget) {
        return;
      }

      if (isPreviewGameplayKey) {
        return;
      }

      if (isEditorPauseMenuOpen) {
        event.preventDefault();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ' && !event.shiftKey) {
        event.preventDefault();
        if (historyIndex > 0) {
          const nextIndex = historyIndex - 1;
          setSelectionBox(null);
          dragPreviewStateRef.current = null;
          setDragPreviewState(null);
          setHistoryIndex(nextIndex);
          liveLevelDataRef.current = history[nextIndex];
          setLevelData(history[nextIndex]);
        }
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        (event.code === 'KeyY' || (event.shiftKey && event.code === 'KeyZ'))
      ) {
        event.preventDefault();
        if (historyIndex < history.length - 1) {
          const nextIndex = historyIndex + 1;
          setSelectionBox(null);
          dragPreviewStateRef.current = null;
          setDragPreviewState(null);
          setHistoryIndex(nextIndex);
          liveLevelDataRef.current = history[nextIndex];
          setLevelData(history[nextIndex]);
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyD' && selectedObject) {
        event.preventDefault();
        const next = structuredClone(liveLevelDataRef.current);
        const selectedIdsSet = new Set(selectedObjectIds);
        const cloneIds: string[] = [];

        for (const source of next.objects.filter((object) => selectedIdsSet.has(object.id))) {
          if (source.type === 'START_MARKER' || source.type === 'FINISH_PORTAL') {
            continue;
          }

          const clone = structuredClone(source);
          clone.id = `${clone.id}-copy-${Date.now()}-${cloneIds.length}`;
          clone.x += 1;
          next.objects.push(clone);
          cloneIds.push(clone.id);
        }

        if (!cloneIds.length) {
          return;
        }

        commitLevelData(next);
        applySelection(cloneIds, cloneIds[0]);
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedObjectIds.length) {
        event.preventDefault();
        const next = structuredClone(liveLevelDataRef.current);
        const selectedIdsSet = new Set(selectedObjectIds);
        next.objects = next.objects.filter((object) => {
          if (!selectedIdsSet.has(object.id)) {
            return true;
          }

          return object.type === 'START_MARKER' || object.type === 'FINISH_PORTAL';
        });
        commitLevelData(next);
        clearSelection();
      }

      const moveStep = event.shiftKey ? 0.5 : 1;
      const moveDeltaByCode: Partial<Record<KeyboardEvent['code'], { x: number; y: number }>> = {
        ArrowUp: { x: 0, y: -moveStep },
        ArrowDown: { x: 0, y: moveStep },
        ArrowLeft: { x: -moveStep, y: 0 },
        ArrowRight: { x: moveStep, y: 0 },
        KeyW: { x: 0, y: -moveStep },
        KeyS: { x: 0, y: moveStep },
        KeyA: { x: -moveStep, y: 0 },
        KeyD: { x: moveStep, y: 0 },
      };
      const moveDelta = moveDeltaByCode[event.code];

      if (!showPreview && !isInlineTestMode && selectedObjectIds.length && !event.ctrlKey && !event.metaKey && moveDelta) {
        event.preventDefault();

        const next = structuredClone(liveLevelDataRef.current);
        const selectedIdsSet = new Set(selectedObjectIds);
        let movedAny = false;

        for (const object of next.objects) {
          if (!selectedIdsSet.has(object.id)) {
            continue;
          }

          object.x = roundToStep(object.x + moveDelta.x, 0.5);
          object.y = roundToStep(object.y + moveDelta.y, 0.5);
          movedAny = true;

          if (object.type === 'START_MARKER') {
            next.player.startX = object.x;
            next.player.startY = object.y;
          }

          if (object.type === 'FINISH_PORTAL') {
            next.finish.x = object.x;
            next.finish.y = object.y;
          }
        }

        if (movedAny) {
          commitLevelData(next);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        isSpacePressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [applySelection, clearSelection, commitLevelData, history, historyIndex, isEditorPauseMenuOpen, isInlineTestMode, selectedObject, selectedObjectIds, showPreview]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const width = canvasViewport.width;
    const height = canvasViewport.height;
    const renderScale = getCanvasRenderScale();
    canvas.width = Math.max(1, Math.floor(width * renderScale));
    canvas.height = Math.max(1, Math.floor(height * renderScale));
    canvas.dataset.logicalWidth = String(width);
    canvas.dataset.logicalHeight = String(height);
    context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    context.imageSmoothingEnabled = true;

    const stageTheme = getStageThemePalette(levelData.meta.theme);
    context.clearRect(0, 0, width, height);
    const backdrop = context.createLinearGradient(0, 0, 0, height);
    backdrop.addColorStop(0, stageTheme.editorGradientTop);
    backdrop.addColorStop(0.6, stageTheme.editorGradientMid);
    backdrop.addColorStop(1, stageTheme.editorGradientBottom);
    context.fillStyle = backdrop;
    context.fillRect(0, 0, width, height);

    const editorGlow = context.createRadialGradient(width * 0.76, height * 0.2, 0, width * 0.76, height * 0.2, width * 0.42);
    editorGlow.addColorStop(0, stageTheme.editorGlowColor);
    editorGlow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = editorGlow;
    context.fillRect(0, 0, width, height);

    context.fillStyle = stageTheme.editorStarColor;
    for (let index = 0; index < 42; index += 1) {
      const starX = (index * 137.41) % width;
      const starY = (index * 89.73) % (height * 0.82);
      const size = index % 6 === 0 ? 2.4 : index % 3 === 0 ? 1.7 : 1.1;
      context.fillRect(starX, starY, size, size);
    }

    const cell = levelData.meta.gridSize * zoom;

    context.strokeStyle = stageTheme.editorGridLine;
    for (let x = ((pan.x % cell) + cell) % cell; x < width; x += cell) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let y = ((pan.y % cell) + cell) % cell; y < height; y += cell) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    if (levelData.player.mode === 'ship') {
      const ceilingY = worldToScreen(0, SHIP_FLIGHT_CEILING_Y, pan.x, pan.y, cell).y;
      const floorY = worldToScreen(0, SHIP_FLIGHT_FLOOR_Y, pan.x, pan.y, cell).y;

      context.fillStyle = 'rgba(5, 10, 28, 0.28)';
      context.fillRect(0, 0, width, Math.max(0, ceilingY));
      context.fillRect(0, floorY, width, Math.max(0, height - floorY));

      context.strokeStyle = 'rgba(202,255,69,0.78)';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(0, ceilingY);
      context.lineTo(width, ceilingY);
      context.moveTo(0, floorY);
      context.lineTo(width, floorY);
      context.stroke();
    }

    const permanentFloorY = worldToScreen(0, SHIP_FLIGHT_FLOOR_Y, pan.x, pan.y, cell).y;
    drawEditorPermanentStageFloor(
      context,
      width,
      height,
      permanentFloorY,
      cell,
      pan.x,
      getStageGroundPalette(levelData.meta.theme, levelData.meta.groundColor),
    );

    for (const drawableObject of visibleDrawableObjects) {
      const { x, y } = worldToScreen(drawableObject.x, drawableObject.y, pan.x, pan.y, cell);
      const w = drawableObject.w * cell;
      const h = drawableObject.h * cell;
      const fillColor = getObjectFillColor(drawableObject, colorGroups);
      const strokeColor = getObjectStrokeColor(drawableObject, colorGroups);
      const isInactiveEditorLayer = drawableObject.editorLayer !== activeEditorLayer;

      context.save();
      if (isInactiveEditorLayer) {
        context.filter = 'brightness(0.72) saturate(0.86)';
      }
      drawStageObjectSprite({
        context,
        object: drawableObject,
        neighborObjects: visibleDrawableObjects,
        x,
        y,
        w,
        h,
        fillColor,
        strokeColor,
        alpha: isInactiveEditorLayer ? 0.35 : 1,
        editorGuideTop: 0,
        editorGuideBottom: height,
      });
      context.restore();

      if (editorShowHitboxes) {
        drawEditorObjectHitbox(
          context,
          drawableObject,
          levelData.player.mode,
          pan.x,
          pan.y,
          cell,
          height,
          isInactiveEditorLayer ? 0.42 : 1,
        );
      }

      if (selectedObjectIdSet.has(drawableObject.id)) {
        context.strokeStyle = drawableObject.id === selectedObjectId ? '#ffffff' : 'rgba(130, 246, 255, 0.86)';
        context.lineWidth = drawableObject.id === selectedObjectId ? 2 : 1.5;
        context.strokeRect(x - 2, y - 2, w + 4, h + 4);
      }
    }

    const spawnMarkerDefinition = levelObjectDefinitions.START_MARKER;
    const spawnMarkerObject: LevelObject = {
      id: 'editor-player-spawn-marker',
      type: 'START_MARKER',
      x: levelData.player.startX,
      y: levelData.player.startY,
      w: spawnMarkerDefinition.defaultSize.w,
      h: spawnMarkerDefinition.defaultSize.h,
      rotation: 0,
      layer: 'decoration',
      editorLayer: activeEditorLayer,
      props: {},
    };
    const spawnMarkerScreen = worldToScreen(spawnMarkerObject.x, spawnMarkerObject.y, pan.x, pan.y, cell);

    context.save();
    context.shadowColor = 'rgba(49, 240, 255, 0.28)';
    context.shadowBlur = Math.max(10, cell * 0.45);
    drawStageObjectSprite({
      context,
      object: spawnMarkerObject,
      x: spawnMarkerScreen.x,
      y: spawnMarkerScreen.y,
      w: spawnMarkerObject.w * cell,
      h: spawnMarkerObject.h * cell,
      fillColor: getObjectFillColor(spawnMarkerObject, colorGroups),
      strokeColor: getObjectStrokeColor(spawnMarkerObject, colorGroups),
      alpha: 0.96,
      editorGuideTop: 0,
      editorGuideBottom: height,
    });
    context.restore();

    if (editorShowHitboxes) {
      drawEditorPlayerHitbox(
        context,
        levelData.player.mode,
        levelData.player.startX,
        levelData.player.startY,
        pan.x,
        pan.y,
        cell,
      );
    }

    if (isMusicSyncPreviewActive) {
      drawEditorMusicSyncGuide(context, width, height, pan.x, pan.y, cell, musicSyncPreview, musicSyncPreviewElapsedMs);
    }

    if (selectionBox) {
      const left = Math.min(selectionBox.startScreenX, selectionBox.endScreenX);
      const top = Math.min(selectionBox.startScreenY, selectionBox.endScreenY);
      const width = Math.abs(selectionBox.endScreenX - selectionBox.startScreenX);
      const height = Math.abs(selectionBox.endScreenY - selectionBox.startScreenY);

      context.save();
      context.fillStyle = 'rgba(130, 246, 255, 0.14)';
      context.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      context.lineWidth = 2;
      context.setLineDash([7, 5]);
      context.fillRect(left, top, width, height);
      context.strokeRect(left, top, width, height);
      context.restore();
    }

    if (inlineTestPathPoints.length > 1) {
      context.save();
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = Math.max(3, cell * 0.12);
      context.strokeStyle = 'rgba(103, 255, 73, 0.88)';
      context.shadowColor = 'rgba(117, 255, 74, 0.34)';
      context.shadowBlur = cell * 0.3;
      context.beginPath();
      let segmentStarted = false;

      for (let index = 0; index < inlineTestPathPoints.length; index += 1) {
        const point = inlineTestPathPoints[index];

        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
          segmentStarted = false;
          continue;
        }

        const screenPoint = worldToScreen(point.x, point.y, pan.x, pan.y, cell);

        if (!segmentStarted) {
          context.moveTo(screenPoint.x, screenPoint.y);
          segmentStarted = true;
        } else {
          context.lineTo(screenPoint.x, screenPoint.y);
        }
      }

      context.stroke();
      context.lineWidth = Math.max(1.25, cell * 0.04);
      context.strokeStyle = 'rgba(216, 255, 199, 0.86)';
      context.shadowBlur = 0;
      context.stroke();
      context.restore();
    }

    if (inlineTestDeathMarker) {
      const marker = worldToScreen(inlineTestDeathMarker.x, inlineTestDeathMarker.y, pan.x, pan.y, cell);
      const size = Math.max(14, cell * 0.38);

      context.save();
      context.translate(marker.x, marker.y);
      context.strokeStyle = '#ff476d';
      context.lineWidth = Math.max(3, cell * 0.08);
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(-size, -size);
      context.lineTo(size, size);
      context.moveTo(size, -size);
      context.lineTo(-size, size);
      context.stroke();
      context.strokeStyle = 'rgba(255, 255, 255, 0.82)';
      context.lineWidth = Math.max(1.5, cell * 0.03);
      context.strokeRect(-size * 0.68, -size * 0.68, size * 1.36, size * 1.36);
      context.restore();
    }
  }, [
    activeEditorLayer,
    canvasViewport.height,
    canvasViewport.width,
    colorGroups,
    editorShowHitboxes,
    dragPreviewState,
    inlineTestDeathMarker,
    inlineTestPathPoints,
    isMusicSyncPreviewActive,
    levelData,
    musicSyncPreview,
    musicSyncPreviewElapsedMs,
    pan,
    selectedObjectId,
    selectedObjectIdSet,
    selectionBox,
    visibleDrawableObjects,
    zoom,
  ]);

  const updateLevelData = useCallback(
    (mutator: (draft: LevelData) => void, options?: { pushHistory?: boolean }) => {
      const next = structuredClone(liveLevelDataRef.current);
      mutator(next);
      commitLevelData(next, options);
    },
    [commitLevelData],
  );

  const performUndo = () => {
    if (historyIndex === 0) {
      return;
    }

    const nextIndex = historyIndex - 1;
    dragPreviewStateRef.current = null;
    setDragPreviewState(null);
    setHistoryIndex(nextIndex);
    liveLevelDataRef.current = history[nextIndex];
    setLevelData(history[nextIndex]);
  };

  const performRedo = () => {
    if (historyIndex >= history.length - 1) {
      return;
    }

    const nextIndex = historyIndex + 1;
    dragPreviewStateRef.current = null;
    setDragPreviewState(null);
    setHistoryIndex(nextIndex);
    liveLevelDataRef.current = history[nextIndex];
    setLevelData(history[nextIndex]);
  };

  const placeObject = (
    type: LevelObjectType,
    x: number,
    y: number,
    options?: { pushHistory?: boolean; selectPlacedObject?: boolean; trackStroke?: boolean },
  ) => {
    const placement = getDefaultPlacementPosition(type, x, y);
    const placementKey = getPlacementStrokeKey(type, placement.x, placement.y, activeEditorLayer);

    if (options?.trackStroke && paintStrokeCellsRef.current.has(placementKey)) {
      return false;
    }

    if (
      (type === 'START_MARKER' && liveLevelDataRef.current.player.startX === placement.x && liveLevelDataRef.current.player.startY === placement.y) ||
      (type === 'FINISH_PORTAL' && liveLevelDataRef.current.finish.x === placement.x && liveLevelDataRef.current.finish.y === placement.y) ||
      liveLevelDataRef.current.objects.some(
        (object) =>
          object.type === type &&
          object.x === placement.x &&
          object.y === placement.y &&
          object.editorLayer === activeEditorLayer,
      )
    ) {
      if (options?.trackStroke) {
        paintStrokeCellsRef.current.add(placementKey);
      }

      return false;
    }

    const next = structuredClone(liveLevelDataRef.current);

    if (type === 'START_MARKER') {
      next.player.startX = placement.x;
      next.player.startY = placement.y;
      next.objects = next.objects.filter((object) => object.type !== 'START_MARKER');
    }

    if (type === 'FINISH_PORTAL') {
      next.finish = { x: placement.x, y: placement.y };
      next.objects = next.objects.filter((object) => object.type !== 'FINISH_PORTAL');
    }

    const definition = levelObjectDefinitions[type];
    const triggerDefaults: Record<string, unknown> =
      type === 'MOVE_TRIGGER'
        ? {
            activationMode: 'zone',
            groupId: 1,
            moveX: 2,
            moveY: 0,
            durationMs: 650,
            easing: 'none',
            lockToPlayerX: false,
            lockToPlayerY: false,
          }
        : type === 'ROTATE_TRIGGER'
          ? {
              activationMode: 'zone',
              groupId: 1,
              centerGroupId: 1,
              degrees: 90,
              times360: 0,
              durationMs: 650,
              easing: 'none',
              lockObjectRotation: false,
            }
        : type === 'ALPHA_TRIGGER'
          ? { activationMode: 'zone', groupId: 1, alpha: 0.35 }
          : type === 'TOGGLE_TRIGGER'
            ? { activationMode: 'zone', groupId: 1, enabled: false }
            : type === 'PULSE_TRIGGER'
              ? { activationMode: 'zone', groupId: 1, fillColor: '#ffffff', strokeColor: '#ffffff', durationMs: 900 }
              : type === 'POST_FX_TRIGGER'
                ? {
                    effectType: 'flash',
                    activationMode: 'zone',
                    durationMs: 900,
                    intensity: 0.75,
                    primaryColor: '#ffffff',
                    secondaryColor: '#7c3aed',
                    blurAmount: 8,
                    scanlineDensity: 0.45,
                    shakePower: 0.85,
                  }
                : type === 'DASH_ORB'
                  ? { dashSpeed: DASH_ORB_SPEED }
                  : isSawObjectType(type)
                    ? { rotationSpeed: 240 }
                    : {};
    const object: LevelObject = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      x: placement.x,
      y: placement.y,
      w: definition.defaultSize.w,
      h: definition.defaultSize.h,
      rotation: 0,
      layer: isDecorationObjectType(type) ? 'decoration' : 'gameplay',
      editorLayer: activeEditorLayer,
      props: {
        ...triggerDefaults,
        ...(isPaintableObjectType(type) && activePaintGroupId
          ? {
              paintGroupId: activePaintGroupId,
            }
          : {}),
      },
    };

    next.objects.push(object);

    if (options?.trackStroke) {
      paintStrokeCellsRef.current.add(placementKey);
    }

    if (options?.selectPlacedObject ?? true) {
      applySelection([object.id], object.id);
    }

    commitLevelData(next, { pushHistory: options?.pushHistory ?? true });
    return true;
  };

  const duplicateSelected = () => {
    if (!selectedObjectIds.length) {
      return;
    }

    updateLevelData((draft) => {
      const selectedIdsSet = new Set(selectedObjectIds);
      const cloneIds: string[] = [];

      for (const source of draft.objects.filter((object) => selectedIdsSet.has(object.id))) {
        if (source.type === 'START_MARKER' || source.type === 'FINISH_PORTAL') {
          continue;
        }

        const clone = structuredClone(source);
        clone.id = `${clone.id}-copy-${Date.now()}-${cloneIds.length}`;
        clone.x += 1;
        draft.objects.push(clone);
        cloneIds.push(clone.id);
      }

      if (cloneIds.length) {
        applySelection(cloneIds, cloneIds[0]);
      }
    });
  };

  const deleteSelected = () => {
    if (!selectedObjectIds.length) {
      return;
    }

    updateLevelData((draft) => {
      const selectedIdsSet = new Set(selectedObjectIds);
      draft.objects = draft.objects.filter((object) => {
        if (!selectedIdsSet.has(object.id)) {
          return true;
        }

        return object.type === 'START_MARKER' || object.type === 'FINISH_PORTAL';
      });
    });
    clearSelection();
  };

  const applyThemePreset = (nextTheme: string) => {
    const previousTheme = theme;
    setTheme(nextTheme);
    updateLevelData((draft) => {
      const currentGroundColor = getEditorColorInputValue(
        typeof draft.meta.groundColor === 'string' ? draft.meta.groundColor : '',
        getDefaultStageGroundColor(previousTheme),
      );

      draft.meta = {
        ...draft.meta,
        theme: nextTheme,
        background: nextTheme,
      };

      if (currentGroundColor.toLowerCase() === getDefaultStageGroundColor(previousTheme).toLowerCase()) {
        delete draft.meta.groundColor;
      }
    });
  };

  const setPlayerMode = (nextMode: LevelData['player']['mode']) => {
    updateLevelData((draft) => {
      draft.player.mode = nextMode;
    });
  };

  const updateSelectedObject = (mutator: (object: LevelObject, draft: LevelData) => void) => {
    if (!selectedObjectId) {
      return;
    }

    updateLevelData((draft) => {
      const object = draft.objects.find((entry) => entry.id === selectedObjectId);

      if (!object) {
        return;
      }

      mutator(object, draft);

      if (object.type === 'START_MARKER') {
        draft.player.startX = object.x;
        draft.player.startY = object.y;
      }

      if (object.type === 'FINISH_PORTAL') {
        draft.finish.x = object.x;
        draft.finish.y = object.y;
      }
    });
  };

  const updateSelectedObjects = (mutator: (objects: LevelObject[], draft: LevelData) => void) => {
    if (!selectedObjectIds.length) {
      return;
    }

    updateLevelData((draft) => {
      const selectedIdsSet = new Set(selectedObjectIds);
      const objects = draft.objects.filter((entry) => selectedIdsSet.has(entry.id));

      if (!objects.length) {
        return;
      }

      mutator(objects, draft);

      for (const object of objects) {
        if (object.type === 'START_MARKER') {
          draft.player.startX = object.x;
          draft.player.startY = object.y;
        }

        if (object.type === 'FINISH_PORTAL') {
          draft.finish.x = object.x;
          draft.finish.y = object.y;
        }
      }
    });
  };

  const updateSelectedObjectNumeric = (
    field: 'x' | 'y' | 'w' | 'h',
    rawValue: string,
    options?: { min?: number; max?: number; step?: number },
  ) => {
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue)) {
      return;
    }

    const min = options?.min ?? Number.NEGATIVE_INFINITY;
    const max = options?.max ?? Number.POSITIVE_INFINITY;
    const step = options?.step ?? 1;
    const snappedValue = Math.round(numericValue / step) * step;
    const clampedValue = clamp(snappedValue, min, max);

    updateSelectedObject((object) => {
      object[field] = clampedValue;
    });
  };

  const updateSelectedObjectRotation = (rawValue: string) => {
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue)) {
      return;
    }

    const snappedValue = roundToStep(numericValue, 1);

    updateSelectedObject((object) => {
      object.rotation = normalizeObjectRotationDegrees(snappedValue);
    });
  };

  const nudgeSelectedObjectRotation = (deltaDegrees: number) => {
    updateSelectedObject((object) => {
      object.rotation = normalizeObjectRotationDegrees((Number(object.rotation ?? 0) || 0) + deltaDegrees);
    });
  };

  const rotateSelectedObject = (direction: -1 | 1) => {
    if (selectedObjects.length > 1) {
      updateSelectedObjects((objects) => {
        const bounds = getObjectSelectionBounds(objects);
        const pivotX = (bounds.left + bounds.right) / 2;
        const pivotY = (bounds.top + bounds.bottom) / 2;

        for (const object of objects) {
          const previousRotation = normalizeObjectRotationDegrees(object.rotation ?? 0);
          const nextRotation = normalizeObjectRotationDegrees(previousRotation + 90 * direction);
          const previousQuarterRotation = normalizeQuarterRotation(previousRotation);
          const nextQuarterRotation = normalizeQuarterRotation(nextRotation);
          const previousQuarterTurns = ((previousQuarterRotation / 90) % 4 + 4) % 4;
          const nextQuarterTurns = ((nextQuarterRotation / 90) % 4 + 4) % 4;
          const toggledOrientation =
            isQuarterAlignedRotation(previousRotation) &&
            isQuarterAlignedRotation(nextRotation) &&
            previousQuarterTurns % 2 !== nextQuarterTurns % 2;
          const centerX = object.x + object.w / 2;
          const centerY = object.y + object.h / 2;
          const rotatedCenter = rotateObjectCenterAroundPivot(centerX, centerY, pivotX, pivotY, direction);
          const nextWidth = toggledOrientation && Math.abs(object.w - object.h) > 0.001 ? object.h : object.w;
          const nextHeight = toggledOrientation && Math.abs(object.w - object.h) > 0.001 ? object.w : object.h;

          object.rotation = nextRotation;
          object.w = nextWidth;
          object.h = nextHeight;
          object.x = roundToStep(rotatedCenter.x - nextWidth / 2, 0.25);
          object.y = roundToStep(rotatedCenter.y - nextHeight / 2, 0.25);
        }
      });
      return;
    }

    updateSelectedObject((object) => {
      const previousRotation = normalizeObjectRotationDegrees(object.rotation ?? 0);
      const nextRotation = normalizeObjectRotationDegrees(previousRotation + 90 * direction);
      const previousQuarterRotation = normalizeQuarterRotation(previousRotation);
      const nextQuarterRotation = normalizeQuarterRotation(nextRotation);
      const previousQuarterTurns = ((previousQuarterRotation / 90) % 4 + 4) % 4;
      const nextQuarterTurns = ((nextQuarterRotation / 90) % 4 + 4) % 4;
      const toggledOrientation =
        isQuarterAlignedRotation(previousRotation) &&
        isQuarterAlignedRotation(nextRotation) &&
        previousQuarterTurns % 2 !== nextQuarterTurns % 2;

      object.rotation = nextRotation;

      if (toggledOrientation && Math.abs(object.w - object.h) > 0.001) {
        const previousWidth = object.w;
        object.w = object.h;
        object.h = previousWidth;
      }
    });
  };

  const updateSelectedObjectLayer = (nextLayer: LevelObject['layer']) => {
    updateSelectedObject((object) => {
      object.layer = nextLayer;
    });
  };

  const updateSelectedObjectEditorLayer = (nextEditorLayer: EditorLayerId) => {
    const clampedEditorLayer = clampEditorLayer(nextEditorLayer);
    setMaxEditorLayer((currentLayer) => Math.max(currentLayer, clampedEditorLayer));

    updateLevelData((draft) => {
      const selectedIdsSet = new Set(selectedObjectIds);

      for (const object of draft.objects) {
        if (!selectedIdsSet.has(object.id)) {
          continue;
        }

        object.editorLayer = clampedEditorLayer;
      }
    });
  };

  const updateSelectedTriggerNumericProp = (key: string, rawValue: string, options?: { min?: number; max?: number }) => {
    if (!selectedTriggerObject) {
      return;
    }

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    const min = options?.min ?? Number.NEGATIVE_INFINITY;
    const max = options?.max ?? Number.POSITIVE_INFINITY;
    const clampedValue = clamp(numericValue, min, max);

    updateSelectedObject((object) => {
      object.props = {
        ...object.props,
        [key]: clampedValue,
      };
    });
  };

  const updateSelectedTriggerStringProp = (key: string, value: string) => {
    if (!selectedTriggerObject) {
      return;
    }

    updateSelectedObject((object) => {
      object.props = {
        ...object.props,
        [key]: value,
      };
    });
  };

  const updateSelectedTriggerBooleanProp = (key: string, value: boolean) => {
    if (!selectedTriggerObject) {
      return;
    }

    updateSelectedObject((object) => {
      object.props = {
        ...object.props,
        [key]: value,
      };
    });
  };

  const updateSelectedTriggerDurationSeconds = (rawValue: string) => {
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue)) {
      return;
    }

    updateSelectedTriggerNumericProp('durationMs', String(Math.max(0.01, numericValue) * 1000), { min: 1 });
  };

  const nudgeSelectedTriggerGroupId = (delta: number) => {
    if (!selectedPaintGroupTriggerObject) {
      return;
    }

    const currentGroupId = Number(selectedPaintGroupTriggerObject.props.groupId ?? 1);
    updateSelectedTriggerNumericProp('groupId', String(currentGroupId + delta), {
      min: 1,
    });
  };

  const restartPreviewFromMusicOffset = () => {
    launchMusicSyncPreview(true);
  };

  const applyCustomMusicUrl = () => {
    const trimmedUrl = musicUrlInput.trim();
    const nextLabel = musicLabelInput.trim() || (trimmedUrl ? inferMusicLabel(trimmedUrl) : undefined);

    updateLevelData((draft) => {
      draft.meta.music = trimmedUrl || 'none';

      if (nextLabel) {
        draft.meta.musicLabel = nextLabel;
      } else {
        delete draft.meta.musicLabel;
      }
    });

    setMusicLabelInput(nextLabel ?? '');
    setMessage(trimmedUrl ? 'Custom music URL attached to the level.' : 'Music cleared from the level.');
  };

  const clearLevelMusic = () => {
    updateLevelData((draft) => {
      draft.meta.music = 'none';
      delete draft.meta.musicLabel;
    });
    setMusicUrlInput('');
    setMusicLabelInput('');
    setMessage('Music cleared from the level.');
  };

  const handleMusicFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_CUSTOM_MUSIC_FILE_SIZE_BYTES) {
      setMessage('Music file is too large. Keep it under 8 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setMessage('Could not read the selected music file.');
        return;
      }

      const nextLabel = musicLabelInput.trim() || file.name;
      updateLevelData((draft) => {
        draft.meta.music = reader.result as string;
        draft.meta.musicLabel = nextLabel;
      });
      setMusicUrlInput('');
      setMusicLabelInput(nextLabel);
      setMessage(`Custom music loaded: ${file.name}.`);
    };
    reader.onerror = () => {
      setMessage('Could not read the selected music file.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const updateSelectedObjectPaintColors = (
    nextColors: Partial<Pick<LevelColorGroup, 'fillColor' | 'strokeColor'>>,
    options?: { pushHistory?: boolean },
  ) => {
    if (!selectedObjectId) {
      return;
    }

    updateLevelData((draft) => {
      const object = draft.objects.find((entry) => entry.id === selectedObjectId);

      if (!object || !isPaintableObjectType(object.type)) {
        return;
      }

      const linkedGroupId = getObjectPaintGroupId(object);

      if (linkedGroupId) {
        const currentGroups = draft.meta.colorGroups ?? [];
        const existingGroup = getColorGroupById(currentGroups, linkedGroupId);
        const fallbackFillColor = getObjectFillColor(object, currentGroups);
        const fallbackStrokeColor = getObjectStrokeColor(object, currentGroups);
        const nextGroups = currentGroups.filter((group) => group.id !== linkedGroupId);
        nextGroups.push({
          id: linkedGroupId,
          fillColor: nextColors.fillColor ?? existingGroup?.fillColor ?? fallbackFillColor,
          strokeColor: nextColors.strokeColor ?? existingGroup?.strokeColor ?? fallbackStrokeColor,
        });
        nextGroups.sort((left, right) => left.id - right.id);
        draft.meta.colorGroups = nextGroups;
        return;
      }

      object.props = {
        ...object.props,
        ...(nextColors.fillColor ? { fillColor: nextColors.fillColor } : {}),
        ...(nextColors.strokeColor ? { strokeColor: nextColors.strokeColor } : {}),
      };
    }, options);
  };

  const updateSelectedObjectPaint = (
    field: 'fillColor' | 'strokeColor',
    value: string,
    options?: { pushHistory?: boolean },
  ) => {
    updateSelectedObjectPaintColors({ [field]: value }, options);
  };

  const resetSelectedObjectPaintToDefault = () => {
    if (!paintableSelectedObject) {
      return;
    }

    const definition = levelObjectDefinitions[paintableSelectedObject.type];
    updateSelectedObjectPaintColors({
      fillColor: definition.color,
      strokeColor: definition.strokeColor,
    });
  };

  const assignSelectedObjectToPaintGroup = (groupId: number) => {
    if (!paintableSelectedObjects.length) {
      return;
    }

    updateLevelData((draft) => {
      const selectedIdsSet = new Set(paintableSelectedObjects.map((object) => object.id));
      const currentGroups = draft.meta.colorGroups ?? [];
      const existingGroup = currentGroups.find((group) => group.id === groupId);

      if (!existingGroup) {
        const anchorObject = paintableSelectedObjects[0];
        const fillColor = getObjectFillColor(anchorObject, currentGroups);
        const strokeColor = getObjectStrokeColor(anchorObject, currentGroups);
        const nextGroups = [...currentGroups, { id: groupId, fillColor, strokeColor }];
        nextGroups.sort((left, right) => left.id - right.id);
        draft.meta.colorGroups = nextGroups;
      }

      for (const object of draft.objects) {
        if (!selectedIdsSet.has(object.id) || !isPaintableObjectType(object.type)) {
          continue;
        }

        object.props = {
          ...object.props,
          paintGroupId: groupId,
        };
        delete object.props.fillColor;
        delete object.props.strokeColor;
      }
    });

    setActivePaintGroupId(groupId);
  };

  const detachSelectedObjectFromPaintGroup = () => {
    if (!paintableSelectedObjects.length) {
      return;
    }

    updateLevelData((draft) => {
      const selectedIdsSet = new Set(paintableSelectedObjects.map((object) => object.id));

      for (const object of draft.objects) {
        if (!selectedIdsSet.has(object.id) || !isPaintableObjectType(object.type)) {
          continue;
        }

        const fillColor = getObjectFillColor(object, draft.meta.colorGroups ?? []);
        const strokeColor = getObjectStrokeColor(object, draft.meta.colorGroups ?? []);
        object.props = {
          ...object.props,
          fillColor,
          strokeColor,
        };
        delete object.props.paintGroupId;
      }
    });
  };

  const assignSelectedObjectToNextFreePaintGroup = () => {
    if (!paintableSelectedObjects.length) {
      return;
    }

    assignSelectedObjectToPaintGroup(nextFreePaintGroupId);
  };

  const addPaintGroup = () => {
    if (paintableSelectedObjects.length) {
      assignSelectedObjectToPaintGroup(nextFreePaintGroupId);
      return;
    }

    const activePaintDefinition = activePaintTool ? levelObjectDefinitions[activePaintTool] : null;
    const fillColor = activePaintDefinition?.color ?? '#ffffff';
    const strokeColor = activePaintDefinition?.strokeColor ?? '#1b243d';

    updateLevelData((draft) => {
      const currentGroups = draft.meta.colorGroups ?? [];

      if (currentGroups.some((group) => group.id === nextFreePaintGroupId)) {
        return;
      }

      const nextGroups = [...currentGroups, { id: nextFreePaintGroupId, fillColor, strokeColor }];
      nextGroups.sort((left, right) => left.id - right.id);
      draft.meta.colorGroups = nextGroups;
    });

    setActivePaintGroupId(nextFreePaintGroupId);
  };

  const toggleEditObjectPopup = () => {
    setEditorWorkspaceMode('edit');
    setSelectedTool('select');

    if (selectedTriggerObject) {
      setIsPaintPopupOpen(false);
      setIsPaintHsvPopupOpen(false);
      setIsTriggerPopupOpen((current) => !current);
      return;
    }

    if (!canOpenSelectedObjectPaintPopup) {
      return;
    }

    setIsTriggerPopupOpen(false);
    setIsPaintPopupOpen((current) => (current && paintableSelectedObject ? false : true));
  };

  const openSelectedObjectPaintHsv = () => {
    if (!paintableSelectedObject) {
      return;
    }

    paintHsvBaseColorsRef.current = {
      fillColor: selectedPaintFillColor,
      strokeColor: selectedPaintStrokeColor,
    };
    setPaintHsvState({
      hue: 0,
      saturation: 1,
      brightness: 1,
    });
    setIsPaintHsvPopupOpen(true);
  };

  const resetSelectedObjectPaintHsv = () => {
    const baseColors = paintHsvBaseColorsRef.current;

    if (!baseColors) {
      return;
    }

    setPaintHsvState({
      hue: 0,
      saturation: 1,
      brightness: 1,
    });
    updateSelectedObjectPaintColors(
      {
        fillColor: baseColors.fillColor,
        strokeColor: baseColors.strokeColor,
      },
      { pushHistory: false },
    );
  };

  const applySelectedObjectPaintHsv = (nextState: PaintHsvState) => {
    const baseColors = paintHsvBaseColorsRef.current;

    if (!baseColors) {
      return;
    }

    updateSelectedObjectPaintColors(
      {
        fillColor: applyHsvToHex(baseColors.fillColor, nextState),
        strokeColor: applyHsvToHex(baseColors.strokeColor, nextState),
      },
      { pushHistory: false },
    );
  };

  const handleSelectedObjectPaintHsvChange = (patch: Partial<PaintHsvState>) => {
    setPaintHsvState((current) => {
      const nextState = {
        ...current,
        ...patch,
      };
      applySelectedObjectPaintHsv(nextState);
      return nextState;
    });
  };

  const confirmSelectedObjectPaintHsv = () => {
    const hasAdjustment =
      Math.abs(paintHsvState.hue) > 0.001 ||
      Math.abs(paintHsvState.saturation - 1) > 0.001 ||
      Math.abs(paintHsvState.brightness - 1) > 0.001;

    if (hasAdjustment) {
      commitLevelData(structuredClone(liveLevelDataRef.current));
    }

    setIsPaintHsvPopupOpen(false);
  };

  const beginTouchGesture = () => {
    const touchPoints = [...touchPointsRef.current.values()];

    if (touchPoints.length < 2) {
      touchGestureRef.current = null;
      return;
    }

    const [firstPoint, secondPoint] = touchPoints;
    touchGestureRef.current = {
      startDistance: getPointerDistance(firstPoint, secondPoint),
      startZoom: zoom,
      startPanX: pan.x,
      startPanY: pan.y,
      startCenterX: (firstPoint.x + secondPoint.x) / 2,
      startCenterY: (firstPoint.y + secondPoint.y) / 2,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    if (isSelectedObjectPaintPopupOpen || isPaintHsvPopupOpen || isTriggerPopupOpen) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const { screenX, screenY } = getCanvasScreenPoint(canvas, event.clientX, event.clientY);
    const cell = levelData.meta.gridSize * zoom;
    const world = screenToWorld(screenX, screenY, pan.x, pan.y, cell);

    updateCursorWorld(Math.floor(world.x), Math.floor(world.y));

    if (event.button === 2) {
      if (selectedTool === 'select') {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragPreviewStateRef.current = null;
        setDragPreviewState(null);
        const nextSelectionBox = {
          startScreenX: screenX,
          startScreenY: screenY,
          endScreenX: screenX,
          endScreenY: screenY,
        };
        dragRef.current = {
          mode: 'box-select',
          startScreenX: screenX,
          startScreenY: screenY,
        };
        setSelectionBox(nextSelectionBox);
      }
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (event.pointerType === 'touch') {
      touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (touchPointsRef.current.size >= 2) {
        dragRef.current = null;
        beginTouchGesture();
        return;
      }
    }

    if (event.button === 1) {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        mode: 'pan',
        originX: event.clientX,
        originY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      return;
    }

    if (selectedTool === 'pan' || isSpacePressedRef.current) {
      dragRef.current = {
        mode: 'pan',
        originX: event.clientX,
        originY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      return;
    }

    if (selectedTool === 'select') {
      const hitObject = activeLayerObjectsTopDown.find((object) => pointInsideObject(world.x, world.y, object));

      if (hitObject) {
        const nextSelectedIds =
          selectedObjectIdSet.has(hitObject.id) && selectedObjectIds.length > 1 ? selectedObjectIds : [hitObject.id];
        const originPositions = Object.fromEntries(
          levelData.objects
            .filter((object) => nextSelectedIds.includes(object.id))
            .map((object) => [object.id, { x: object.x, y: object.y }]),
        );

        applySelection(nextSelectedIds, hitObject.id);
        setSelectionBox(null);
        const previewState = {
          positions: originPositions,
        };
        dragPreviewStateRef.current = previewState;
        setDragPreviewState(previewState);
        dragRef.current = {
          mode: 'move',
          objectId: hitObject.id,
          offsetX: world.x - hitObject.x,
          offsetY: world.y - hitObject.y,
          originX: hitObject.x,
          originY: hitObject.y,
          selectedIds: nextSelectedIds,
          originPositions,
        };
      } else {
        clearSelection();
      }

      return;
    }

    if (placementMode === 'drag' && canUseDragPlacementTool(selectedTool)) {
      paintStrokeCellsRef.current = new Set();
      paintStrokeDirtyRef.current = false;
      dragRef.current = {
        mode: 'paint',
        tool: selectedTool,
      };
      paintStrokeDirtyRef.current =
        placeObject(selectedTool, Math.floor(world.x), Math.floor(world.y), {
          pushHistory: false,
          selectPlacedObject: false,
          trackStroke: true,
        }) || paintStrokeDirtyRef.current;
      return;
    }

    placeObject(selectedTool, Math.floor(world.x), Math.floor(world.y));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const { screenX, screenY } = getCanvasScreenPoint(canvas, event.clientX, event.clientY);
    const cell = levelData.meta.gridSize * zoom;
    const world = screenToWorld(screenX, screenY, pan.x, pan.y, cell);

    updateCursorWorld(Math.floor(world.x), Math.floor(world.y));

    if (event.pointerType === 'touch' && touchPointsRef.current.has(event.pointerId)) {
      touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (touchPointsRef.current.size >= 2) {
        event.preventDefault();

        if (!touchGestureRef.current) {
          beginTouchGesture();
        }

        const touchPoints = [...touchPointsRef.current.values()];
        const [firstPoint, secondPoint] = touchPoints;

        if (firstPoint && secondPoint && touchGestureRef.current) {
          const centerX = (firstPoint.x + secondPoint.x) / 2;
          const centerY = (firstPoint.y + secondPoint.y) / 2;
          const distance = getPointerDistance(firstPoint, secondPoint);
          const zoomFactor = touchGestureRef.current.startDistance > 0 ? distance / touchGestureRef.current.startDistance : 1;

          setZoom(clamp(roundToStep(touchGestureRef.current.startZoom * zoomFactor, 0.01), 0.45, 2.4));
          setPan({
            x: touchGestureRef.current.startPanX + (centerX - touchGestureRef.current.startCenterX),
            y: touchGestureRef.current.startPanY + (centerY - touchGestureRef.current.startCenterY),
          });
        }

        dragRef.current = null;
        return;
      }
    }

    const dragState = dragRef.current;

    if (event.buttons & 4) {
      if (!dragState || dragState.mode !== 'pan') {
        dragRef.current = {
          mode: 'pan',
          originX: event.clientX,
          originY: event.clientY,
          startPanX: pan.x,
          startPanY: pan.y,
        };
        return;
      }

      setPan({
        x: dragState.startPanX + (event.clientX - dragState.originX),
        y: dragState.startPanY + (event.clientY - dragState.originY),
      });
      return;
    }

    if (!dragState) {
      return;
    }

    if (dragState.mode === 'pan') {
      setPan({
        x: dragState.startPanX + (event.clientX - dragState.originX),
        y: dragState.startPanY + (event.clientY - dragState.originY),
      });
      return;
    }

    if (dragState.mode === 'box-select') {
      setSelectionBox({
        startScreenX: dragState.startScreenX,
        startScreenY: dragState.startScreenY,
        endScreenX: screenX,
        endScreenY: screenY,
      });
      return;
    }

    if (dragState.mode === 'paint') {
      paintStrokeDirtyRef.current =
        placeObject(dragState.tool, Math.floor(world.x), Math.floor(world.y), {
          pushHistory: false,
          selectPlacedObject: false,
          trackStroke: true,
        }) || paintStrokeDirtyRef.current;
      return;
    }

    if (dragState.mode === 'move') {
      const nextX = Math.floor(world.x - dragState.offsetX);
      const nextY = Math.floor(world.y - dragState.offsetY);
      const deltaX = nextX - dragState.originX;
      const deltaY = nextY - dragState.originY;
      const nextPreviewState = {
        positions: Object.fromEntries(
          dragState.selectedIds.map((id) => [
            id,
            {
              x: dragState.originPositions[id].x + deltaX,
              y: dragState.originPositions[id].y + deltaY,
            },
          ]),
        ),
      };
      const currentPreview = dragPreviewStateRef.current;

      if (dragPreviewStatesEqual(currentPreview, nextPreviewState)) {
        return;
      }

      dragPreviewStateRef.current = nextPreviewState;
      setDragPreviewState(nextPreviewState);
    }
  };

  const handlePointerUp = (event?: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event && touchPointsRef.current.has(event.pointerId)) {
      touchPointsRef.current.delete(event.pointerId);

      if (touchPointsRef.current.size < 2) {
        touchGestureRef.current = null;
      }
    }

    const dragState = dragRef.current;

    if (dragState?.mode === 'box-select') {
      const nextSelectionBox =
        selectionBox ??
        ({
          startScreenX: dragState.startScreenX,
          startScreenY: dragState.startScreenY,
          endScreenX: dragState.startScreenX,
          endScreenY: dragState.startScreenY,
        } satisfies SelectionBox);
      const normalizedBox = normalizeSelectionBox(nextSelectionBox);
      const cell = levelData.meta.gridSize * zoom;
      const matchedIds = [...levelData.objects]
        .filter((object) => {
          if (object.editorLayer !== activeEditorLayer) {
            return false;
          }

          const { x, y } = worldToScreen(object.x, object.y, pan.x, pan.y, cell);
          return rectanglesIntersect(normalizedBox, {
            left: x,
            top: y,
            right: x + object.w * cell,
            bottom: y + object.h * cell,
          });
        })
        .map((object) => object.id);

      applySelection(matchedIds, matchedIds[matchedIds.length - 1] ?? null);
    }

    if (dragState?.mode === 'move') {
      const previewState = dragPreviewStateRef.current;

      if (
        previewState &&
        dragState.selectedIds.some((id) => {
          const origin = dragState.originPositions[id];
          const preview = previewState.positions[id];
          return preview && (preview.x !== origin.x || preview.y !== origin.y);
        })
      ) {
        const next = structuredClone(liveLevelDataRef.current);
        const selectedIdsSet = new Set(dragState.selectedIds);

        for (const object of next.objects) {
          if (!selectedIdsSet.has(object.id)) {
            continue;
          }

          const preview = previewState.positions[object.id];

          if (!preview) {
            continue;
          }

          object.x = preview.x;
          object.y = preview.y;

          if (object.type === 'START_MARKER') {
            next.player.startX = object.x;
            next.player.startY = object.y;
          }

          if (object.type === 'FINISH_PORTAL') {
            next.finish.x = object.x;
            next.finish.y = object.y;
          }
        }

        commitLevelData(next);
      }
    }

    if (dragState?.mode === 'paint') {
      if (paintStrokeDirtyRef.current) {
        commitLevelData(structuredClone(liveLevelDataRef.current));
      }

      paintStrokeCellsRef.current = new Set();
      paintStrokeDirtyRef.current = false;
    }

    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragPreviewStateRef.current = null;
    setDragPreviewState(null);
    setSelectionBox(null);
    dragRef.current = null;
  };

  const applyWheelZoom = (deltaY: number) => {
    setZoom((current) => Math.min(2.4, Math.max(0.45, current + (deltaY < 0 ? 0.1 : -0.1))));
  };

  const setHorizontalScrollPosition = useCallback((nextScroll: number) => {
    const clampedScroll = clamp(nextScroll, 0, horizontalScrollMax);
    setPan((current) => ({
      ...current,
      x: EDITOR_DEFAULT_PAN_X - clampedScroll * stageCell,
    }));
  }, [horizontalScrollMax, stageCell]);

  const handleToolSelect = (tool: EditorTool) => {
    setSelectedTool(tool);
    setActivePaletteGroup(getPaletteGroupTitle(tool));
    setPaletteDrawerGroup(null);
  };

  const handleEditorLayerSelect = (nextLayer: EditorLayerId) => {
    const clampedLayer = clampEditorLayer(nextLayer);

    if (clampedLayer > maxEditorLayer) {
      return;
    }

    setActiveEditorLayer(clampedLayer);
    clearSelection();
  };

  const handleAddEditorLayer = () => {
    if (maxEditorLayer >= MAX_EDITOR_LAYERS) {
      return;
    }

    const nextLayer = clampEditorLayer(maxEditorLayer + 1);
    setMaxEditorLayer(nextLayer);
    setActiveEditorLayer(nextLayer);
    clearSelection();
    setMessage(`Layer ${nextLayer} enabled. You can now build across ${nextLayer} layers.`);
  };

  const stepEditorLayer = (direction: -1 | 1) => {
    if (direction < 0) {
      if (activeEditorLayer > MIN_EDITOR_LAYER) {
        handleEditorLayerSelect(activeEditorLayer - 1);
      }
      return;
    }

    if (activeEditorLayer < maxEditorLayer) {
      handleEditorLayerSelect(activeEditorLayer + 1);
      return;
    }

    if (canAddEditorLayer) {
      handleAddEditorLayer();
    }
  };

  const handlePaletteGroupClick = (groupTitle: string) => {
    setActivePaletteGroup(groupTitle);
    setPaletteDrawerGroup((current) => (current === groupTitle ? null : groupTitle));
  };

  const handleDesktopPaletteGroupSelect = (groupTitle: string) => {
    setEditorWorkspaceMode('build');
    setActivePaletteGroup(groupTitle);
    setPaletteDrawerGroup(groupTitle);
  };

  const cycleDesktopPaletteGroup = (direction: -1 | 1) => {
    if (!desktopPaletteGroups.length) {
      return;
    }

    const nextIndex = (desktopPaletteGroupIndex + direction + desktopPaletteGroups.length) % desktopPaletteGroups.length;
    const nextGroup = desktopPaletteGroups[nextIndex];
    handleDesktopPaletteGroupSelect(nextGroup.title);
  };

  const startInlineTestMode = () => {
    stopMusicSyncPreview();
    setShowPreview(false);
    setShowDesktopSetup(false);
    setIsPaintPopupOpen(false);
    setIsTriggerPopupOpen(false);
    setIsInlineTestMode(true);
    setInlineTestDeathMarker(null);
    setInlineTestPathPoints([]);
    setInlineTestRunSeed((current) => current + 1);
    setMessage('');
  };

  const stopInlineTestMode = (nextMessage?: string) => {
    setIsInlineTestMode(false);
    if (nextMessage) {
      setMessage(nextMessage);
    }
  };

  const requestInlineTestStop = () => {
    setInlineTestStopSignal((current) => current + 1);
  };

  const openSetupPanel = () => {
    if (isMobileLayout) {
      setIsMobileSettingsExpanded(true);
      settingsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setShowDesktopSetup(true);
  };

  useEffect(() => {
    const stageFrame = stageFrameRef.current;

    if (!stageFrame) {
      return;
    }

    const handleStageWheel = (event: WheelEvent) => {
      if (isInlineTestMode) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Node) || !stageFrame.contains(target)) {
        return;
      }

      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        event.preventDefault();
        event.stopPropagation();
        const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
        setHorizontalScrollPosition(horizontalScrollValue + delta / stageCell);
        return;
      }

      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      applyWheelZoom(event.deltaY);
    };

    stageFrame.addEventListener('wheel', handleStageWheel, { passive: false, capture: true });

    return () => {
      stageFrame.removeEventListener('wheel', handleStageWheel, true);
    };
  }, [horizontalScrollValue, isInlineTestMode, setHorizontalScrollPosition, stageCell]);

  const handleSave = async () => {
    setSaveState('saving');
    setSaveProgressPercent(0);
    setMessage('');

    try {
      const dataToSave = structuredClone(levelData);
      dataToSave.meta.theme = theme;
      dataToSave.meta.background = theme;

      await onSave(
        {
          title,
          description,
          theme,
          dataJson: dataToSave,
        },
        {
          onUploadProgress: (progressPercent) => {
            setSaveProgressPercent(progressPercent);
          },
        },
      );
      setSaveProgressPercent(100);
      setSaveState('saved');
      setMessage('Level saved successfully.');
      return true;
    } catch (error) {
      setSaveProgressPercent(null);
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Failed to save level');
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!onSubmit) {
      return;
    }

    if (hasStartPositions) {
      setMessage('Remove all Start Pos markers before publishing the level.');
      return;
    }

    try {
      await onSubmit();
      setMessage('Level submitted for admin review.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to submit level');
    }
  };

  const closeEditorPauseMenu = () => {
    setIsEditorPauseMenuOpen(false);
  };

  const handlePauseSave = async () => {
    const didSave = await handleSave();

    if (didSave) {
      setIsEditorPauseMenuOpen(false);
    }
  };

  const handlePauseSaveAndPlay = async () => {
    const didSave = await handleSave();

    if (!didSave) {
      return;
    }

    setIsEditorPauseMenuOpen(false);
    openGameplayPreview();
  };

  const handlePauseSaveAndExit = async () => {
    const didSave = await handleSave();

    if (!didSave) {
      return;
    }

    setIsEditorPauseMenuOpen(false);

    if (onClose) {
      onClose();
    }
  };

  const handlePauseExit = () => {
    setIsEditorPauseMenuOpen(false);

    if (onClose) {
      onClose();
    }
  };

  const saveActionLabel =
    saveState === 'saving'
      ? saveProgressPercent != null
        ? `Saving ${saveProgressPercent}%`
        : 'Saving...'
      : saveLabel;
  const pauseSaveLabel = saveState === 'saving' ? saveActionLabel : 'Save';
  const pauseSaveAndPlayLabel = saveState === 'saving' ? saveActionLabel : 'Save and Play';
  const pauseSaveAndExitLabel = saveState === 'saving' ? saveActionLabel : 'Save and Exit';
  const saveStatusMessage =
    saveState === 'saving'
      ? saveProgressPercent != null
        ? `Uploading level data: ${saveProgressPercent}%`
        : 'Uploading level data...'
      : message;

  const deleteAllStartPositions = () => {
    if (!hasStartPositions) {
      return;
    }

    updateLevelData((draft) => {
      draft.objects = draft.objects.filter((object) => object.type !== 'START_POS');
    });

    setMessage('All Start Pos markers were removed from the level.');
  };

  return (
    <div
      className={cn(
        'arcade-editor-workstation editor-workbench flex flex-col space-y-5',
        isInlineTestMode ? 'editor-workbench--inline-test' : '',
        isMobileLayout ? 'editor-workbench--mobile' : '',
      )}
    >
      <Panel className="arcade-editor-topbar editor-workbench-toolbar game-screen bg-transparent">
        <div className="editor-workbench-toolbar-main">
          <div className="editor-workbench-heading">
            <p className="editor-workbench-kicker font-display text-[11px] tracking-[0.26em] text-[#ffd44a]">
              Forge Workstation
            </p>
            <h3 className="editor-workbench-title mt-2 font-display text-3xl text-white">{title}</h3>
            <p className="editor-workbench-subcopy mt-2 max-w-3xl text-sm leading-7 text-white/72">
              Compact build surface with on-stage tools, quick paint access, and instant preview.
            </p>
          </div>

          <div className="editor-primary-actions">
            {onClose ? (
              <button
                type="button"
                className="editor-close-button"
                onClick={onClose}
                aria-label="Close editor"
                title="Close editor"
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
            <Button onClick={handleSave} disabled={saveState === 'saving'}>
              {saveActionLabel}
            </Button>
            {onSubmit ? (
              <Button
                variant="secondary"
                onClick={handleSubmit}
                disabled={hasStartPositions}
                title={hasStartPositions ? 'Remove all Start Pos markers before publishing' : undefined}
              >
                Submit for Review
              </Button>
            ) : null}
            <Button variant="ghost" onClick={toggleGameplayPreview}>
              {showPreview ? 'Hide Preview' : 'Preview'}
            </Button>
          </div>
        </div>

        <div className="editor-workbench-toolbar-meta">
          <HintChip label="Tool" value={activeToolLabel} />
          <HintChip label="Build Layer" value={activeEditorLayerLabel} />
          <HintChip label="Selected" value={selectionLabel} />
          <HintChip label="History" value={historyPosition} />
          <HintChip label="Theme" value={theme} />
          <HintChip label="Objects" value={objectCount} />
        </div>
      </Panel>

      <Panel className="arcade-editor-stage-panel editor-stage-shell game-screen bg-transparent">
        <div
          ref={stageFrameRef}
          className="editor-canvas-frame"
          style={
            {
              '--editor-stage-top': stageThemePalette.editorGradientTop,
              '--editor-stage-mid': stageThemePalette.editorGradientMid,
              '--editor-stage-bottom': stageThemePalette.editorGradientBottom,
            } as CSSProperties
          }
        >
          {isMobileLayout ? (
            <>
              <div className="editor-canvas-overlay editor-canvas-overlay--hud">
                <div className="editor-canvas-hud-bar">
                  <HintChip label="Tool" value={activeToolLabel} />
                  <HintChip label="Selected" value={selectionSummary} />
                  <HintChip label="Layer" value={activeEditorLayerLabel} />
                  <HintChip label="Place" value={placementModeLabel} />
                  <HintChip label="Zoom" value={`${zoom.toFixed(2)}x`} />
                  <HintChip label="Cursor" value={`${cursorWorld.x}, ${cursorWorld.y}`} />
                </div>
              </div>

              <div className="editor-canvas-overlay editor-canvas-overlay--left">
                <div className="editor-canvas-rail editor-canvas-rail--categories">
                  {paletteGroups.map((group) => (
                    <button
                      key={group.title}
                      type="button"
                      className={cn('editor-canvas-rail-button', activePaletteGroup === group.title ? 'is-active' : '')}
                      onClick={() => handlePaletteGroupClick(group.title)}
                      title={group.title}
                    >
                      {getPaletteGroupButtonLabel(group.title)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="editor-canvas-overlay editor-canvas-overlay--desktop-top">
                <div className="editor-stage-topbar">
                  <div className="editor-stage-topbar-cluster editor-stage-topbar-cluster--left">
                    {onClose ? (
                      <button
                        type="button"
                        className="editor-stage-orb-button"
                        onClick={onClose}
                        aria-label="Close editor"
                        title="Close editor"
                      >
                        <EditorStageBackIcon />
                      </button>
                    ) : null}
                    <button type="button" className="editor-stage-orb-button" onClick={performUndo} disabled={!canUndo} title="Undo">
                      <EditorStageUndoIcon />
                    </button>
                    <button type="button" className="editor-stage-orb-button" onClick={performRedo} disabled={!canRedo} title="Redo">
                      <EditorStageRedoIcon />
                    </button>
                    <button
                      type="button"
                      className="editor-stage-orb-button editor-stage-orb-button--danger"
                      onClick={deleteSelected}
                      disabled={!selectedObjectIds.length}
                      title="Delete selected"
                    >
                      <EditorStageTrashIcon />
                    </button>
                  </div>

                  <div className="editor-stage-scrollbar-shell">
                    <button
                      type="button"
                      className="editor-stage-orb-button editor-stage-orb-button--slider"
                      onClick={() => {
                        setPan({ x: EDITOR_DEFAULT_PAN_X, y: EDITOR_DEFAULT_PAN_Y });
                        setZoom(1);
                      }}
                      title="Reset camera"
                    >
                      ↔
                    </button>
                    <div className="editor-stage-scrollbar-track editor-stage-scrollbar-track--desktop">
                      <div className="editor-stage-scrollbar-copy">
                        <span>Stage Scroll</span>
                        <strong>
                          {Math.round(horizontalScrollValue)} / {Math.max(0, Math.round(horizontalScrollMax))}
                        </strong>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(horizontalScrollMax, 0)}
                        step={1}
                        value={horizontalScrollValue}
                        disabled={horizontalScrollMax <= 0}
                        className="editor-horizontal-scroll editor-horizontal-scroll--desktop"
                        aria-label="Horizontal stage scroll"
                        onChange={(event) => setHorizontalScrollPosition(Number(event.target.value))}
                      />
                    </div>
                  </div>

                  <div className="editor-stage-topbar-cluster editor-stage-topbar-cluster--right">
                    <button type="button" className="editor-stage-orb-button" onClick={openSetupPanel} title="Open setup">
                      ⚙
                    </button>
                    <button
                      type="button"
                      className={cn('editor-stage-orb-button', showPreview ? 'is-active' : '')}
                      onClick={toggleGameplayPreview}
                      title="Open test preview"
                    >
                      {showPreview ? '■' : '▶'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="editor-canvas-overlay editor-canvas-overlay--desktop-left">
                <div className="editor-stage-utility-stack">
                  <button
                    type="button"
                    className={cn('editor-stage-utility-button', isMusicSyncPreviewActive ? 'is-active' : '')}
                    onClick={() => launchMusicSyncPreview()}
                    title="Start music sync preview"
                  >
                    <EditorStageMusicIcon />
                  </button>
                  <button
                    type="button"
                    className={cn('editor-stage-utility-button', isInlineTestMode ? 'is-active' : '')}
                    onClick={startInlineTestMode}
                    title="Start editor test play"
                  >
                    <EditorStageTestPlayIcon />
                  </button>
                  <button
                    type="button"
                    className="editor-stage-utility-button"
                    onClick={() => setZoom((current) => Math.min(2.4, current + 0.1))}
                    title="Zoom in"
                  >
                    <EditorStageZoomIcon mode="in" />
                  </button>
                  <button
                    type="button"
                    className="editor-stage-utility-button"
                    onClick={() => setZoom((current) => Math.max(0.45, current - 0.1))}
                    title="Zoom out"
                  >
                    <EditorStageZoomIcon mode="out" />
                  </button>
                </div>
              </div>
            </>
          )}

          <canvas
            ref={canvasRef}
            className="editor-stage-canvas cursor-crosshair border-[4px] border-[#39105f] bg-[#130326]"
            aria-label="Level editor stage"
            style={{
              width: `${canvasViewport.width}px`,
              height: `${canvasViewport.height}px`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onContextMenu={(event) => event.preventDefault()}
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault();
              }
            }}
          />

          {isInlineTestMode ? (
            <div className="editor-inline-test-shell" role="dialog" aria-modal="true" aria-label="Editor test play">
              <label className="editor-inline-test-toggle">
                <input
                  type="checkbox"
                  checked={inlineTestShowTriggersOnPlayMode}
                  onChange={(event) => setInlineTestShowTriggersOnPlayMode(event.target.checked)}
                />
                <span>Show triggers on play mode</span>
              </label>
              <button
                type="button"
                className="editor-inline-test-stop"
                onClick={requestInlineTestStop}
                title="Stop editor test play"
                aria-label="Stop editor test play"
              >
                Stop
              </button>
              <GameCanvas
                key={`editor-inline-test-${inlineTestRunSeed}`}
                levelData={levelData}
                runId={`editor-inline-test-${inlineTestRunSeed}`}
                attemptNumber={1}
                previewStartPosEnabled
                previewStartPosInheritPortalState={false}
                showTriggersInPlayMode={inlineTestShowTriggersOnPlayMode}
                showHitboxes={editorShowHitboxes}
                stopSignal={inlineTestStopSignal}
                showRunPath
                fullscreen
                className="editor-inline-test-runtime"
                onFail={({ deathX, deathY, pathPoints }) => {
                  setInlineTestPathPoints(pathPoints ?? []);
                  setInlineTestDeathMarker(
                    typeof deathX === 'number' && typeof deathY === 'number'
                      ? { x: deathX, y: deathY }
                      : null,
                  );
                  stopInlineTestMode('Editor test play failed. The death marker was dropped where the run ended.');
                }}
                onComplete={({ pathPoints }) => {
                  setInlineTestPathPoints(pathPoints ?? []);
                  setInlineTestDeathMarker(null);
                  stopInlineTestMode('Editor test play completed.');
                }}
                onExitToMenu={({ pathPoints }) => {
                  setInlineTestPathPoints(pathPoints ?? []);
                  stopInlineTestMode('Returned to the editor from test play.');
                }}
                onStop={({ pathPoints }) => {
                  setInlineTestPathPoints(pathPoints ?? []);
                  setInlineTestDeathMarker(null);
                  stopInlineTestMode('Editor test play stopped.');
                }}
              />
            </div>
          ) : null}

          {isEditorPauseMenuOpen ? (
            <div className="editor-stage-pause-overlay" role="dialog" aria-modal="true" aria-label="Editor pause menu">
              <div className="editor-stage-pause-panel">
                <div className="editor-stage-pause-actions">
                  <button type="button" className="editor-stage-pause-button" onClick={closeEditorPauseMenu}>
                    Resume
                  </button>
                  <button
                    type="button"
                    className="editor-stage-pause-button"
                    onClick={handlePauseSaveAndPlay}
                    disabled={saveState === 'saving'}
                  >
                    {pauseSaveAndPlayLabel}
                  </button>
                  <button
                    type="button"
                    className="editor-stage-pause-button"
                    onClick={handlePauseSaveAndExit}
                    disabled={saveState === 'saving' || !onClose}
                  >
                    {pauseSaveAndExitLabel}
                  </button>
                  <button
                    type="button"
                    className="editor-stage-pause-button"
                    onClick={handlePauseSave}
                    disabled={saveState === 'saving'}
                  >
                    {pauseSaveLabel}
                  </button>
                  <button
                    type="button"
                    className="editor-stage-pause-button"
                    onClick={handlePauseExit}
                    disabled={!onClose}
                  >
                    Exit
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {isMobileLayout ? (
            <div className="editor-canvas-overlay editor-canvas-overlay--right">
              <div className="editor-canvas-rail editor-canvas-rail--actions">
                <button type="button" className="editor-canvas-rail-button" onClick={() => setZoom((current) => Math.min(2.4, current + 0.1))}>
                  Zoom In
                </button>
                <button type="button" className="editor-canvas-rail-button" onClick={() => setZoom((current) => Math.max(0.45, current - 0.1))}>
                  Zoom Out
                </button>
                <button
                  type="button"
                  className="editor-canvas-rail-button"
                  onClick={() => {
                    setPan({ x: EDITOR_DEFAULT_PAN_X, y: EDITOR_DEFAULT_PAN_Y });
                    setZoom(1);
                  }}
                >
                  Home
                </button>
                <button type="button" className="editor-canvas-rail-button" onClick={performUndo} disabled={!canUndo}>
                  Undo
                </button>
                <button type="button" className="editor-canvas-rail-button" onClick={performRedo} disabled={!canRedo}>
                  Redo
                </button>
                <button type="button" className="editor-canvas-rail-button" onClick={duplicateSelected} disabled={!selectedObject}>
                  Copy
                </button>
                <button
                  type="button"
                  className={cn('editor-canvas-rail-button', isPaintPopupOpen ? 'is-active' : '')}
                  onClick={() => setIsPaintPopupOpen((current) => !current)}
                  disabled={!canOpenPaintPopup}
                >
                  Color
                </button>
                <button
                  type="button"
                  className="editor-canvas-rail-button"
                  onClick={() => stepEditorLayer(-1)}
                  disabled={!canStepEditorLayerBackward}
                  title="Go to previous build layer"
                >
                  Prev L
                </button>
                {canAddEditorLayer ? (
                  <button
                    type="button"
                    className="editor-canvas-rail-button"
                    onClick={handleAddEditorLayer}
                    title="Add a new build layer"
                  >
                    Add L
                  </button>
                ) : null}
                <button
                  type="button"
                  className={cn('editor-canvas-rail-button', canStepEditorLayerForward && activeEditorLayer >= maxEditorLayer ? 'is-active' : '')}
                  onClick={() => stepEditorLayer(1)}
                  disabled={!canStepEditorLayerForward}
                  title={canAddEditorLayer ? 'Go to the next layer or create it' : 'Go to next build layer'}
                >
                  Next L
                </button>
                <button
                  type="button"
                  className={cn('editor-canvas-rail-button', placementMode === 'single' ? 'is-active' : '')}
                  onClick={() => setPlacementMode('single')}
                  title="Place one object per click"
                >
                  Snap
                </button>
                <button
                  type="button"
                  className={cn('editor-canvas-rail-button', placementMode === 'drag' ? 'is-active' : '')}
                  onClick={() => setPlacementMode('drag')}
                  title={
                    dragPlacementAvailable
                      ? 'Hold and drag through new cells to place continuously'
                      : 'Drag mode works with blocks, hazards, boosts, and most portals'
                  }
                >
                  Swipe
                </button>
                <button
                  type="button"
                  className="editor-canvas-rail-button editor-canvas-rail-button--danger"
                  onClick={deleteSelected}
                  disabled={!selectedObject}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className={cn('editor-canvas-rail-button', showPreview ? 'is-active' : '')}
                  onClick={toggleGameplayPreview}
                >
                  {showPreview ? 'Hide Test' : 'Test'}
                </button>
              </div>
            </div>
          ) : (
            <div className="editor-canvas-overlay editor-canvas-overlay--desktop-right">
              <div className="editor-stage-action-grid">
                <button type="button" className="editor-stage-action-button" onClick={duplicateSelected} disabled={!selectedObjectIds.length}>
                  Copy
                </button>
                <button
                  type="button"
                  className="editor-stage-action-button"
                  disabled
                >
                  Paste
                </button>
                <button type="button" className="editor-stage-action-button" onClick={duplicateSelected} disabled={!selectedObjectIds.length}>
                  Copy + Paste
                </button>
                <button
                  type="button"
                  className="editor-stage-action-button"
                  onClick={() => {
                    setEditorWorkspaceMode('edit');
                    openSetupPanel();
                  }}
                >
                  Edit Special
                </button>
                <button
                  type="button"
                  className={cn('editor-stage-action-button', isPaintPopupOpen ? 'is-active' : '')}
                  onClick={() => setIsPaintPopupOpen((current) => !current)}
                  disabled={!canOpenPaintPopup}
                >
                  Edit Group
                </button>
                <button
                  type="button"
                  className={cn('editor-stage-action-button', isEditObjectPopupOpen ? 'is-active' : '')}
                  onClick={toggleEditObjectPopup}
                  disabled={!canOpenSelectedObjectPaintPopup && !canOpenTriggerPopup}
                >
                  Edit Object
                </button>
                <button type="button" className="editor-stage-action-button" disabled>
                  Copy Values
                </button>
                <button type="button" className="editor-stage-action-button" disabled>
                  Paste State
                </button>
                <button
                  type="button"
                  className="editor-stage-action-button"
                  onClick={() => setIsPaintPopupOpen(true)}
                  disabled={!canOpenPaintPopup}
                >
                  Paste Color
                </button>
                <button
                  type="button"
                  className={cn('editor-stage-action-button', isPaintPopupOpen ? 'is-active' : '')}
                  onClick={() => setIsPaintPopupOpen((current) => !current)}
                  disabled={!canOpenPaintPopup}
                >
                  Color
                </button>
                <button
                  type="button"
                  className={cn('editor-stage-action-button', activeEditorLayer > MIN_EDITOR_LAYER ? 'is-active' : '')}
                  onClick={() => stepEditorLayer(1)}
                >
                  Go To Layer
                </button>
                <button type="button" className="editor-stage-action-button" onClick={clearSelection} disabled={!selectedObjectIds.length}>
                  De-Select
                </button>
              </div>
              <div className="editor-stage-layer-strip">
                <button
                  type="button"
                  className="editor-stage-layer-arrow editor-stage-layer-arrow--prev"
                  onClick={() => stepEditorLayer(-1)}
                  disabled={!canStepEditorLayerBackward}
                  aria-label="Previous layer"
                  title="Previous layer"
                >
                  <span className="editor-stage-layer-arrow-icon editor-stage-layer-arrow-icon--left" aria-hidden="true" />
                </button>
                <div className="editor-stage-layer-readout" aria-live="polite">
                  <span className="editor-stage-layer-readout-label">Layer</span>
                  <strong>{activeEditorLayer}</strong>
                  <span className="editor-stage-layer-readout-meta">{activeEditorLayerProgressLabel}</span>
                </div>
                <button
                  type="button"
                  className="editor-stage-layer-arrow editor-stage-layer-arrow--next"
                  onClick={() => stepEditorLayer(1)}
                  disabled={!canStepEditorLayerForward}
                  aria-label={canAddEditorLayer ? 'Next layer or add a new layer' : 'Next layer'}
                  title={canAddEditorLayer ? 'Next layer or add a new layer' : 'Next layer'}
                >
                  <span className="editor-stage-layer-arrow-icon editor-stage-layer-arrow-icon--right" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {isTriggerPopupOpen && selectedTriggerObject ? (
            <div className="editor-canvas-overlay editor-canvas-overlay--paint editor-canvas-overlay--paint-editor">
              <div className="editor-object-color-dialog editor-trigger-dialog">
                <div className="editor-object-color-shell editor-trigger-shell">
                  <div className="editor-trigger-header">
                    <div className="editor-trigger-info-pill" aria-hidden="true">
                      i
                    </div>
                    <div className="editor-trigger-header-copy">
                      <h4 className="font-display text-[2.2rem] text-[#ffd44a]">
                        {getTriggerSetupTitle(selectedTriggerObject.type)}
                      </h4>
                      <div className="editor-trigger-header-meta">
                        <Badge tone="accent">{selectedDefinition?.label ?? selectedTriggerObject.type}</Badge>
                        <Badge tone="default">
                          {selectedPaintGroupTriggerObject
                            ? `Group ${Number(selectedPaintGroupTriggerObject.props.groupId ?? 1)}`
                            : 'Scene FX'}
                        </Badge>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="editor-canvas-popup-close editor-object-color-close"
                      onClick={() => setIsTriggerPopupOpen(false)}
                    >
                      Close
                    </button>
                  </div>

                  <div className="editor-trigger-grid">
                    {selectedPaintGroupTriggerObject ? (
                      <div className="editor-trigger-field editor-trigger-field--wide">
                        <span className="editor-trigger-field-label">Group ID</span>
                        <div className="editor-trigger-stepper">
                          <button type="button" className="editor-trigger-stepper-button" onClick={() => nudgeSelectedTriggerGroupId(-1)}>
                            {'<'}
                          </button>
                          <input
                            className="editor-trigger-input editor-trigger-input--stepper"
                            type="number"
                            min="1"
                            value={Number(selectedPaintGroupTriggerObject.props.groupId ?? 1)}
                            onChange={(event) =>
                              updateSelectedTriggerNumericProp('groupId', event.target.value, {
                                min: 1,
                              })
                            }
                          />
                          <button type="button" className="editor-trigger-stepper-button" onClick={() => nudgeSelectedTriggerGroupId(1)}>
                            {'>'}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {selectedTriggerObject.type === 'MOVE_TRIGGER' ? (
                      <>
                        <div className="editor-trigger-field">
                          <span className="editor-trigger-field-label">Move X</span>
                          <input
                            className="editor-trigger-input"
                            type="number"
                            step="0.5"
                            value={Number(selectedTriggerObject.props.moveX ?? 2)}
                            onChange={(event) => updateSelectedTriggerNumericProp('moveX', event.target.value)}
                          />
                        </div>
                        <div className="editor-trigger-field">
                          <span className="editor-trigger-field-label">Move Y (up +)</span>
                          <input
                            className="editor-trigger-input"
                            type="number"
                            step="0.5"
                            value={Number(selectedTriggerObject.props.moveY ?? 0)}
                            onChange={(event) => updateSelectedTriggerNumericProp('moveY', event.target.value)}
                          />
                        </div>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Move Time</span>
                          <input
                            className="editor-trigger-input"
                            type="number"
                            min="0.01"
                            step="0.05"
                            value={Number((Number(selectedTriggerObject.props.durationMs ?? getDefaultTriggerDurationMs(selectedTriggerObject.type)) / 1000).toFixed(2))}
                            onChange={(event) => updateSelectedTriggerDurationSeconds(event.target.value)}
                          />
                        </div>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Easing</span>
                          <select
                            className="editor-trigger-select"
                            value={String(selectedTriggerObject.props.easing ?? 'none')}
                            onChange={(event) =>
                              updateSelectedTriggerStringProp('easing', event.target.value as MoveTriggerEasing)
                            }
                          >
                            {moveTriggerEasingOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Follow Player</span>
                          <div className="editor-trigger-check-grid">
                            <button
                              type="button"
                              className={cn(
                                'editor-trigger-check-button',
                                selectedTriggerObject.props.lockToPlayerX ? 'is-active' : '',
                              )}
                              onClick={() =>
                                updateSelectedTriggerBooleanProp(
                                  'lockToPlayerX',
                                  !selectedTriggerObject.props.lockToPlayerX,
                                )
                              }
                            >
                              <span className="editor-trigger-check-box" />
                              <span>Player X</span>
                            </button>
                            <button
                              type="button"
                              className={cn(
                                'editor-trigger-check-button',
                                selectedTriggerObject.props.lockToPlayerY ? 'is-active' : '',
                              )}
                              onClick={() =>
                                updateSelectedTriggerBooleanProp(
                                  'lockToPlayerY',
                                  !selectedTriggerObject.props.lockToPlayerY,
                                )
                              }
                            >
                              <span className="editor-trigger-check-box" />
                              <span>Player Y</span>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : null}

                    {selectedTriggerObject.type === 'ROTATE_TRIGGER' ? (
                      <>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Center Group</span>
                          <div className="editor-trigger-stepper">
                            <button
                              type="button"
                              className="editor-trigger-stepper-button"
                              onClick={() =>
                                updateSelectedTriggerNumericProp(
                                  'centerGroupId',
                                  String(Number(selectedTriggerObject.props.centerGroupId ?? 1) - 1),
                                  { min: 1 },
                                )
                              }
                            >
                              {'<'}
                            </button>
                            <input
                              className="editor-trigger-input editor-trigger-input--stepper"
                              type="number"
                              min="1"
                              value={Number(selectedTriggerObject.props.centerGroupId ?? 1)}
                              onChange={(event) =>
                                updateSelectedTriggerNumericProp('centerGroupId', event.target.value, {
                                  min: 1,
                                })
                              }
                            />
                            <button
                              type="button"
                              className="editor-trigger-stepper-button"
                              onClick={() =>
                                updateSelectedTriggerNumericProp(
                                  'centerGroupId',
                                  String(Number(selectedTriggerObject.props.centerGroupId ?? 1) + 1),
                                  { min: 1 },
                                )
                              }
                            >
                              {'>'}
                            </button>
                          </div>
                        </div>
                        <div className="editor-trigger-field">
                          <span className="editor-trigger-field-label">Degrees</span>
                          <input
                            className="editor-trigger-input"
                            type="number"
                            step="15"
                            value={Number(selectedTriggerObject.props.degrees ?? 90)}
                            onChange={(event) => updateSelectedTriggerNumericProp('degrees', event.target.value)}
                          />
                        </div>
                        <div className="editor-trigger-field">
                          <span className="editor-trigger-field-label">Times 360</span>
                          <input
                            className="editor-trigger-input"
                            type="number"
                            min="0"
                            step="1"
                            value={Number(selectedTriggerObject.props.times360 ?? 0)}
                            onChange={(event) =>
                              updateSelectedTriggerNumericProp('times360', event.target.value, { min: 0 })
                            }
                          />
                        </div>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Rotate Time</span>
                          <input
                            className="editor-trigger-input"
                            type="number"
                            min="0.01"
                            step="0.05"
                            value={Number(
                              (
                                Number(
                                  selectedTriggerObject.props.durationMs ??
                                    getDefaultTriggerDurationMs(selectedTriggerObject.type),
                                ) / 1000
                              ).toFixed(2),
                            )}
                            onChange={(event) => updateSelectedTriggerDurationSeconds(event.target.value)}
                          />
                        </div>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Easing</span>
                          <select
                            className="editor-trigger-select"
                            value={String(selectedTriggerObject.props.easing ?? 'none')}
                            onChange={(event) =>
                              updateSelectedTriggerStringProp('easing', event.target.value as MoveTriggerEasing)
                            }
                          >
                            {moveTriggerEasingOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Object Angle</span>
                          <div className="editor-trigger-check-grid">
                            <button
                              type="button"
                              className={cn(
                                'editor-trigger-check-button',
                                selectedTriggerObject.props.lockObjectRotation ? 'is-active' : '',
                              )}
                              onClick={() =>
                                updateSelectedTriggerBooleanProp(
                                  'lockObjectRotation',
                                  !selectedTriggerObject.props.lockObjectRotation,
                                )
                              }
                            >
                              <span className="editor-trigger-check-box" />
                              <span>Keep Original Angle</span>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : null}

                    {selectedTriggerObject.type === 'ALPHA_TRIGGER' ? (
                      <>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Fade Time</span>
                          <input
                            className="editor-trigger-input"
                            type="number"
                            min="0.01"
                            step="0.05"
                            value={Number((Number(selectedTriggerObject.props.durationMs ?? getDefaultTriggerDurationMs(selectedTriggerObject.type)) / 1000).toFixed(2))}
                            onChange={(event) => updateSelectedTriggerDurationSeconds(event.target.value)}
                          />
                        </div>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">
                            Opacity: {Number(selectedTriggerObject.props.alpha ?? 0.35).toFixed(2)}
                          </span>
                          <input
                            className="editor-trigger-range editor-trigger-range--alpha"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={Number(selectedTriggerObject.props.alpha ?? 0.35)}
                            onChange={(event) => updateSelectedTriggerNumericProp('alpha', event.target.value, { min: 0, max: 1 })}
                          />
                        </div>
                      </>
                    ) : null}

                    {selectedTriggerObject.type === 'TOGGLE_TRIGGER' ? (
                      <div className="editor-trigger-field editor-trigger-field--wide">
                        <span className="editor-trigger-field-label">Activate Group</span>
                        <div className="editor-trigger-toggle-row">
                          <button
                            type="button"
                            className={cn('editor-trigger-choice-button', selectedTriggerObject.props.enabled ? 'is-active' : '')}
                            onClick={() => updateSelectedTriggerBooleanProp('enabled', true)}
                          >
                            On
                          </button>
                          <button
                            type="button"
                            className={cn('editor-trigger-choice-button', !selectedTriggerObject.props.enabled ? 'is-active' : '')}
                            onClick={() => updateSelectedTriggerBooleanProp('enabled', false)}
                          >
                            Off
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {selectedTriggerObject.type === 'PULSE_TRIGGER' ? (
                      <>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Pulse Color</span>
                          <div className="editor-trigger-color-row">
                            <label className="editor-trigger-color-swatch">
                              <span>Fill</span>
                              <span
                                className="editor-trigger-color-preview"
                                style={{
                                  backgroundColor:
                                    typeof selectedTriggerObject.props.fillColor === 'string'
                                      ? selectedTriggerObject.props.fillColor
                                      : '#ffffff',
                                }}
                              />
                              <input
                                type="color"
                                value={getEditorColorInputValue(
                                  typeof selectedTriggerObject.props.fillColor === 'string'
                                    ? selectedTriggerObject.props.fillColor
                                    : '#ffffff',
                                  '#ffffff',
                                )}
                                onChange={(event) => updateSelectedTriggerStringProp('fillColor', event.target.value)}
                              />
                            </label>
                            <label className="editor-trigger-color-swatch">
                              <span>Stroke</span>
                              <span
                                className="editor-trigger-color-preview"
                                style={{
                                  backgroundColor:
                                    typeof selectedTriggerObject.props.strokeColor === 'string'
                                      ? selectedTriggerObject.props.strokeColor
                                      : '#ffffff',
                                }}
                              />
                              <input
                                type="color"
                                value={getEditorColorInputValue(
                                  typeof selectedTriggerObject.props.strokeColor === 'string'
                                    ? selectedTriggerObject.props.strokeColor
                                    : '#ffffff',
                                  '#ffffff',
                                )}
                                onChange={(event) => updateSelectedTriggerStringProp('strokeColor', event.target.value)}
                              />
                            </label>
                          </div>
                        </div>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Pulse Time</span>
                          <input
                            className="editor-trigger-input"
                            type="number"
                            min="0.01"
                            step="0.05"
                            value={Number((Number(selectedTriggerObject.props.durationMs ?? getDefaultTriggerDurationMs(selectedTriggerObject.type)) / 1000).toFixed(2))}
                            onChange={(event) => updateSelectedTriggerDurationSeconds(event.target.value)}
                          />
                        </div>
                      </>
                    ) : null}

                    {selectedTriggerObject.type === 'POST_FX_TRIGGER' ? (
                      <>
                        <div className="editor-trigger-field">
                          <span className="editor-trigger-field-label">Effect</span>
                          <select
                            className="editor-trigger-select"
                            value={String(selectedTriggerObject.props.effectType ?? 'flash')}
                            onChange={(event) => updateSelectedTriggerStringProp('effectType', event.target.value as PostFxEffectType)}
                          >
                            {postFxEffectOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="editor-trigger-field">
                          <span className="editor-trigger-field-label">Strength</span>
                          <input
                            className="editor-trigger-input"
                            type="number"
                            step="0.05"
                            min="0"
                            max="1.5"
                            value={Number(selectedTriggerObject.props.intensity ?? 0.75)}
                            onChange={(event) => updateSelectedTriggerNumericProp('intensity', event.target.value, { min: 0, max: 1.5 })}
                          />
                        </div>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Effect Time</span>
                          <input
                            className="editor-trigger-input"
                            type="number"
                            min="0.01"
                            step="0.05"
                            value={Number((Number(selectedTriggerObject.props.durationMs ?? getDefaultTriggerDurationMs(selectedTriggerObject.type)) / 1000).toFixed(2))}
                            onChange={(event) => updateSelectedTriggerDurationSeconds(event.target.value)}
                          />
                        </div>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Primary Color</span>
                          <label className="editor-trigger-color-swatch editor-trigger-color-swatch--wide">
                            <span
                              className="editor-trigger-color-preview"
                              style={{
                                backgroundColor:
                                  typeof selectedTriggerObject.props.primaryColor === 'string'
                                    ? selectedTriggerObject.props.primaryColor
                                    : '#ffffff',
                              }}
                            />
                            <input
                              type="color"
                              value={getEditorColorInputValue(
                                typeof selectedTriggerObject.props.primaryColor === 'string'
                                  ? selectedTriggerObject.props.primaryColor
                                  : '#ffffff',
                                '#ffffff',
                              )}
                              onChange={(event) => updateSelectedTriggerStringProp('primaryColor', event.target.value)}
                            />
                          </label>
                        </div>
                        <div className="editor-trigger-field editor-trigger-field--wide">
                          <span className="editor-trigger-field-label">Secondary Color</span>
                          <label className="editor-trigger-color-swatch editor-trigger-color-swatch--wide">
                            <span
                              className="editor-trigger-color-preview"
                              style={{
                                backgroundColor:
                                  typeof selectedTriggerObject.props.secondaryColor === 'string'
                                    ? selectedTriggerObject.props.secondaryColor
                                    : '#7c3aed',
                              }}
                            />
                            <input
                              type="color"
                              value={getEditorColorInputValue(
                                typeof selectedTriggerObject.props.secondaryColor === 'string'
                                  ? selectedTriggerObject.props.secondaryColor
                                  : '#7c3aed',
                                '#7c3aed',
                              )}
                              onChange={(event) => updateSelectedTriggerStringProp('secondaryColor', event.target.value)}
                            />
                          </label>
                        </div>

                        {selectedTriggerObject.props.effectType === 'blur' ? (
                          <div className="editor-trigger-field">
                            <span className="editor-trigger-field-label">Blur Amount</span>
                            <input
                              className="editor-trigger-input"
                              type="number"
                              min="0"
                              step="0.5"
                              value={Number(selectedTriggerObject.props.blurAmount ?? 8)}
                              onChange={(event) => updateSelectedTriggerNumericProp('blurAmount', event.target.value, { min: 0, max: 24 })}
                            />
                          </div>
                        ) : null}

                        {selectedTriggerObject.props.effectType === 'scanlines' ? (
                          <div className="editor-trigger-field">
                            <span className="editor-trigger-field-label">Line Density</span>
                            <input
                              className="editor-trigger-input"
                              type="number"
                              min="0.1"
                              max="1"
                              step="0.05"
                              value={Number(selectedTriggerObject.props.scanlineDensity ?? 0.45)}
                              onChange={(event) =>
                                updateSelectedTriggerNumericProp('scanlineDensity', event.target.value, {
                                  min: 0.1,
                                  max: 1,
                                })
                              }
                            />
                          </div>
                        ) : null}

                        {selectedTriggerObject.props.effectType === 'shake' ? (
                          <div className="editor-trigger-field">
                            <span className="editor-trigger-field-label">Shake Power</span>
                            <input
                              className="editor-trigger-input"
                              type="number"
                              min="0"
                              max="2"
                              step="0.05"
                              value={Number(selectedTriggerObject.props.shakePower ?? 0.85)}
                              onChange={(event) => updateSelectedTriggerNumericProp('shakePower', event.target.value, { min: 0, max: 2 })}
                            />
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  <div className="editor-trigger-footer">
                    <div className="editor-trigger-check-grid">
                      <button
                        type="button"
                        className={cn(
                          'editor-trigger-check-button',
                          String(selectedTriggerObject.props.activationMode ?? 'zone') === 'touch' ? 'is-active' : '',
                        )}
                        onClick={() =>
                          updateSelectedTriggerStringProp(
                            'activationMode',
                            String(selectedTriggerObject.props.activationMode ?? 'zone') === 'touch' ? 'zone' : 'touch',
                          )
                        }
                      >
                        <span className="editor-trigger-check-box" />
                        <span>Touch Trigger</span>
                      </button>
                    </div>

                    <div className="editor-object-color-confirm-row editor-trigger-confirm-row">
                      <button
                        type="button"
                        className="editor-object-color-action editor-object-color-action--confirm"
                        onClick={() => setIsTriggerPopupOpen(false)}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : isPaintPopupOpen && paintableSelectedObject ? (
            <div className="editor-canvas-overlay editor-canvas-overlay--paint editor-canvas-overlay--paint-editor">
              <div className="editor-object-color-dialog">
                <div className="editor-object-color-topbar">
                  <button type="button" className="editor-object-color-chip editor-object-color-chip--active">
                    Base
                  </button>
                  <button type="button" className="editor-object-color-hsv-trigger" onClick={openSelectedObjectPaintHsv}>
                    HSV
                  </button>
                  <button
                    type="button"
                    className="editor-canvas-popup-close editor-object-color-close"
                    onClick={() => setIsPaintPopupOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="editor-object-color-shell">
                  <div className="editor-object-color-header">
                    <div>
                      <p className="font-display text-[10px] tracking-[0.18em] text-[#ffe18a]">Edit Object</p>
                      <h4 className="font-display text-[2rem] text-[#ffd44a]">Base Color</h4>
                    </div>
                    <div className="editor-object-color-meta">
                      <Badge tone="accent">{selectedDefinition?.label ?? paintableSelectedObject.type}</Badge>
                      <Badge tone="default">
                        {selectedPaintGroupId ? `Group ${selectedPaintGroupId}` : 'Direct Color'}
                      </Badge>
                    </div>
                  </div>

                  <div className="editor-object-color-subcopy">
                    {selectedPaintGroupId
                      ? 'Changing OBJ color updates every object that uses this group.'
                      : 'Pick a group first if you want multiple objects to share the same color.'}
                  </div>

                  <div className="editor-object-color-group-grid">
                    {paintGroupIds.map((groupId) => {
                      const group = getColorGroupById(colorGroups, groupId);
                      const isCurrentGroup = selectedPaintGroupId === groupId;

                      return (
                        <button
                          key={groupId}
                          type="button"
                          className={cn('editor-object-color-group-button', isCurrentGroup ? 'is-active' : '')}
                          onClick={() => assignSelectedObjectToPaintGroup(groupId)}
                        >
                          <span className="editor-object-color-group-number">{groupId}</span>
                          <span className="editor-object-color-group-preview">
                            <span
                              className="editor-object-color-group-swatch"
                              style={{ backgroundColor: group?.fillColor ?? 'rgba(255,255,255,0.14)' }}
                            />
                            <span
                              className="editor-object-color-group-swatch"
                              style={{ backgroundColor: group?.strokeColor ?? 'rgba(255,255,255,0.3)' }}
                            />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="editor-object-color-footer">
                    <div className="editor-object-color-actions">
                      <button
                        type="button"
                        className="editor-object-color-action editor-object-color-action--ghost"
                        onClick={assignSelectedObjectToNextFreePaintGroup}
                      >
                        Add Group
                      </button>
                      <button
                        type="button"
                        className="editor-object-color-action editor-object-color-action--ghost"
                        onClick={resetSelectedObjectPaintToDefault}
                      >
                        Default
                      </button>
                      {selectedPaintGroupId ? (
                        <button
                          type="button"
                          className="editor-object-color-action editor-object-color-action--ghost"
                          onClick={detachSelectedObjectFromPaintGroup}
                        >
                          Detach
                        </button>
                      ) : null}
                    </div>

                    <div className="editor-object-color-confirm-row">
                      <button
                        type="button"
                        className="editor-object-color-action editor-object-color-action--confirm"
                        onClick={() => setIsPaintPopupOpen(false)}
                      >
                        OK
                      </button>

                      <label className="editor-object-color-swatch-control">
                        <span className="editor-object-color-swatch-label">Fill</span>
                        <span
                          className="editor-object-color-swatch-preview"
                          style={{ backgroundColor: selectedPaintFillColor }}
                        />
                        <input
                          type="color"
                          aria-label="Selected object fill color"
                          value={getEditorColorInputValue(
                            selectedPaintFillColor,
                            levelObjectDefinitions[paintableSelectedObject.type].color,
                          )}
                          onChange={(event) => updateSelectedObjectPaint('fillColor', event.target.value)}
                        />
                      </label>

                      <label className="editor-object-color-swatch-control">
                        <span className="editor-object-color-swatch-label">Stroke</span>
                        <span
                          className="editor-object-color-swatch-preview"
                          style={{ backgroundColor: selectedPaintStrokeColor }}
                        />
                        <input
                          type="color"
                          aria-label="Selected object stroke color"
                          value={getEditorColorInputValue(
                            selectedPaintStrokeColor,
                            levelObjectDefinitions[paintableSelectedObject.type].strokeColor,
                          )}
                          onChange={(event) => updateSelectedObjectPaint('strokeColor', event.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {isPaintHsvPopupOpen ? (
                  <div className="editor-object-hsv-overlay">
                    <div className="editor-object-hsv-dialog">
                      <div className="editor-object-hsv-header">
                        <h5 className="font-display text-[2rem] text-[#ffd44a]">Base HSV</h5>
                        <button
                          type="button"
                          className="editor-object-hsv-trash"
                          onClick={resetSelectedObjectPaintHsv}
                          title="Reset HSV"
                        >
                          Reset
                        </button>
                      </div>

                      <div className="editor-object-hsv-panel">
                        <label className="editor-object-hsv-row">
                          <div className="editor-object-hsv-copy">
                            <span>Hue</span>
                            <strong>{Math.round(paintHsvState.hue)}</strong>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="1"
                            value={paintHsvState.hue}
                            onChange={(event) =>
                              handleSelectedObjectPaintHsvChange({ hue: Number(event.target.value) })
                            }
                          />
                        </label>

                        <label className="editor-object-hsv-row">
                          <div className="editor-object-hsv-copy">
                            <span>Saturation</span>
                            <strong>{paintHsvState.saturation.toFixed(2)}</strong>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.01"
                            value={paintHsvState.saturation}
                            onChange={(event) =>
                              handleSelectedObjectPaintHsvChange({ saturation: Number(event.target.value) })
                            }
                          />
                        </label>

                        <label className="editor-object-hsv-row">
                          <div className="editor-object-hsv-copy">
                            <span>Brightness</span>
                            <strong>{paintHsvState.brightness.toFixed(2)}</strong>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.01"
                            value={paintHsvState.brightness}
                            onChange={(event) =>
                              handleSelectedObjectPaintHsvChange({ brightness: Number(event.target.value) })
                            }
                          />
                        </label>
                      </div>

                      <div className="editor-object-hsv-footer">
                        <button
                          type="button"
                          className="editor-object-color-action editor-object-color-action--confirm"
                          onClick={confirmSelectedObjectPaintHsv}
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : isPaintPopupOpen ? (
            <div className="editor-canvas-overlay editor-canvas-overlay--paint">
              <div className="editor-canvas-popup editor-canvas-paint-popup">
                <div className="editor-canvas-popup-header">
                  <div>
                    <p className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">Paint & Groups</p>
                    <h4 className="font-display text-xl text-white">
                      {activePaintTool ? levelObjectDefinitions[activePaintTool].label : 'Placement Paint'}
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="editor-canvas-popup-close"
                    onClick={() => setIsPaintPopupOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="editor-note-box px-4 py-3 text-sm text-white/72">
                  Choose a saved group for new blocks, spikes, and saws, or select an existing painted object to write its
                  colors into one of the groups below.
                </div>

                <div className="editor-paint-groups">
                  <div className="flex items-center justify-between gap-3">
                    <span className="editor-color-control-label">Color Groups</span>
                    <Badge tone="accent">
                      {activePaintGroupId ? `Placing: Group ${activePaintGroupId}` : 'Placing: Direct'}
                    </Badge>
                  </div>

                  <div className="editor-paint-group-grid">
                    {paintGroupIds.map((groupId) => {
                      const group = getColorGroupById(colorGroups, groupId);

                      return (
                        <button
                          key={groupId}
                          type="button"
                          className={cn('editor-paint-group-button', activePaintGroupId === groupId ? 'is-active' : '')}
                          onClick={() => setActivePaintGroupId(groupId)}
                          disabled={!group}
                        >
                          <span className="editor-paint-group-title">Group {groupId}</span>
                          <span className="editor-paint-group-swatches">
                            <span
                              className="editor-paint-group-swatch"
                              style={{ backgroundColor: group?.fillColor ?? 'rgba(255,255,255,0.12)' }}
                            />
                            <span
                              className="editor-paint-group-swatch"
                              style={{ backgroundColor: group?.strokeColor ?? 'rgba(255,255,255,0.28)' }}
                            />
                          </span>
                          <span className="editor-paint-group-status">{group ? 'Saved' : 'Empty'}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="editor-paint-inline-actions">
                    <Button variant="ghost" onClick={() => setActivePaintGroupId(null)}>
                      Place Direct
                    </Button>
                    <Button variant="ghost" onClick={addPaintGroup}>
                      Add Group
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isMobileLayout ? (
            <div className="editor-canvas-overlay editor-canvas-overlay--bottom">
              <div className="editor-canvas-toolstrip">
                <div className="editor-canvas-toolstrip-header">
                  <div className="editor-canvas-toolstrip-copy">
                    <p className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">
                      {paletteDrawer ? paletteDrawer.title : 'Build Drawer'}
                    </p>
                    <p className="text-sm text-white/72">
                      {paletteDrawer
                        ? 'Pick the exact piece you want to place.'
                        : 'Choose a lane on the left to open the picker.'}
                    </p>
                  </div>
                  {paletteDrawer ? (
                    <button
                      type="button"
                      className="editor-canvas-drawer-close"
                      onClick={() => setPaletteDrawerGroup(null)}
                    >
                      Close
                    </button>
                  ) : (
                    <Badge tone="accent">{activeToolLabel}</Badge>
                  )}
                </div>

                <div className="editor-inline-actions">
                  <Button variant="ghost" onClick={() => stepEditorLayer(-1)} disabled={!canStepEditorLayerBackward}>
                    Prev Layer
                  </Button>
                  <Button variant="primary" disabled>
                    {activeEditorLayerLabel}
                  </Button>
                  <Button variant="ghost" onClick={() => stepEditorLayer(1)} disabled={!canStepEditorLayerForward}>
                    {canAddEditorLayer ? 'Next / Add' : 'Next Layer'}
                  </Button>
                  {canAddEditorLayer ? (
                    <Button variant="ghost" onClick={handleAddEditorLayer}>
                      Add Layer
                    </Button>
                  ) : null}
                  <Button
                    variant={placementMode === 'single' ? 'primary' : 'ghost'}
                    onClick={() => setPlacementMode('single')}
                  >
                    Single Place
                  </Button>
                  <Button
                    variant={placementMode === 'drag' ? 'primary' : 'ghost'}
                    onClick={() => setPlacementMode('drag')}
                  >
                    Drag Place
                  </Button>
                </div>

                {paletteDrawer ? (
                  <div className="editor-canvas-toolstrip-row">
                    {paletteDrawer.items.map((tool) => (
                      <ToolButton
                        key={tool}
                        tool={tool}
                        label={tool === 'select' ? 'Select' : tool === 'pan' ? 'Pan' : levelObjectDefinitions[tool].label}
                        description={toolDescriptions[tool]}
                        active={selectedTool === tool}
                        compact
                        onClick={() => handleToolSelect(tool)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="editor-canvas-toolstrip-empty">
                    <span className="font-display text-[10px] tracking-[0.16em] text-[#ffd44a]">Current Tool</span>
                    <strong>{activeToolLabel}</strong>
                    <span>{activeToolDescription}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="editor-canvas-overlay editor-canvas-overlay--desktop-bottom">
              <div className="editor-stage-category-row">
                {desktopPaletteGroups.map((group) => (
                  <button
                    key={group.title}
                    type="button"
                    className={cn(
                      'editor-stage-category-button',
                      desktopActivePaletteGroupTitle === group.title ? 'is-active' : '',
                    )}
                    onClick={() => handleDesktopPaletteGroupSelect(group.title)}
                    title={group.title}
                  >
                    <ToolButtonPreview
                      tool={getDesktopPalettePreviewTool(group.title)}
                      active={desktopActivePaletteGroupTitle === group.title}
                    />
                    <span>{getPaletteGroupButtonLabel(group.title)}</span>
                  </button>
                ))}
              </div>

              <div className="editor-stage-bottom-shell">
                <div className="editor-stage-mode-stack">
                  <button
                    type="button"
                    className={cn('editor-stage-mode-button', editorWorkspaceMode === 'build' ? 'is-active' : '')}
                    onClick={() => setEditorWorkspaceMode('build')}
                  >
                    Build
                  </button>
                  <button
                    type="button"
                    className={cn('editor-stage-mode-button', editorWorkspaceMode === 'edit' ? 'is-active' : '')}
                    onClick={() => {
                      setEditorWorkspaceMode('edit');
                      setSelectedTool('select');
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="editor-stage-mode-button editor-stage-mode-button--danger"
                    onClick={deleteSelected}
                    disabled={!selectedObjectIds.length}
                  >
                    Delete
                  </button>
                </div>

                <div className="editor-stage-tray-window">
                  {editorWorkspaceMode === 'build' ? (
                    <>
                      <div className="editor-stage-tray-toolbar">
                        <button
                          type="button"
                          className="editor-stage-tray-arrow"
                          onClick={() => cycleDesktopPaletteGroup(-1)}
                          aria-label="Previous category"
                          title="Previous category"
                        >
                          {'<'}
                        </button>
                        <div className="editor-stage-tray-copy">
                          <span>{trayPaletteGroup?.title ?? 'Build'}</span>
                          <strong>{trayPaletteGroup ? desktopPaletteGroupIndex + 1 : 0}</strong>
                        </div>
                        <button
                          type="button"
                          className="editor-stage-tray-arrow"
                          onClick={() => cycleDesktopPaletteGroup(1)}
                          aria-label="Next category"
                          title="Next category"
                        >
                          {'>'}
                        </button>
                      </div>

                      {trayPaletteGroup ? (
                        <div className="editor-stage-tray-grid">
                          {trayPaletteGroup.items.map((tool) => (
                            <ToolButton
                              key={tool}
                              tool={tool}
                              label={tool === 'select' ? 'Select' : tool === 'pan' ? 'Pan' : levelObjectDefinitions[tool].label}
                              description={toolDescriptions[tool]}
                              active={selectedTool === tool}
                              compact
                              hideDescription
                              hideLabel
                              onClick={() => handleToolSelect(tool)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="editor-stage-quick-edit-empty">
                          Pick a lane above to load build pieces into the tray.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="editor-stage-quick-edit">
                      <div className="editor-stage-quick-edit-header">
                        <div>
                          <span>Edit Tray</span>
                          <strong>{selectedObject ? selectedDefinition?.label ?? selectedObject.type : 'Nothing selected'}</strong>
                        </div>
                        <Badge tone="accent">{selectionLabel}</Badge>
                      </div>

                      {selectedObject ? (
                        <>
                          <div className="editor-stage-quick-edit-stats">
                            <div className="editor-stage-quick-stat">
                              <span>Pos</span>
                              <strong>
                                {selectedObject.x}, {selectedObject.y}
                              </strong>
                            </div>
                            <div className="editor-stage-quick-stat">
                              <span>Size</span>
                              <strong>
                                {selectedObject.w} x {selectedObject.h}
                              </strong>
                            </div>
                            <div className="editor-stage-quick-stat">
                              <span>Layer</span>
                              <strong>{selectedObject.editorLayer}</strong>
                            </div>
                            <div className="editor-stage-quick-stat">
                              <span>Rotate</span>
                              <strong>{selectedRotationLabel}</strong>
                            </div>
                          </div>

                          <div className="editor-stage-quick-edit-actions">
                            <button type="button" className="editor-stage-mode-grid-button" onClick={() => rotateSelectedObject(-1)}>
                              Rotate L
                            </button>
                            <button type="button" className="editor-stage-mode-grid-button" onClick={() => rotateSelectedObject(1)}>
                              Rotate R
                            </button>
                            <button
                              type="button"
                              className="editor-stage-mode-grid-button"
                              onClick={() => setIsPaintPopupOpen(true)}
                              disabled={!canOpenPaintPopup}
                            >
                              Paint
                            </button>
                            <button type="button" className="editor-stage-mode-grid-button" onClick={clearSelection}>
                              Clear
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="editor-stage-quick-edit-empty">
                          Select an object on the stage, then switch to Edit for quick tweaks.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="editor-stage-mode-grid">
                  <button
                    type="button"
                    className={cn('editor-stage-mode-grid-button', placementMode === 'drag' ? 'is-active' : '')}
                    onClick={() => setPlacementMode('drag')}
                    title={
                      dragPlacementAvailable
                        ? 'Hold and drag through new cells to place continuously'
                        : 'Drag mode works with blocks, hazards, boosts, and most portals'
                    }
                  >
                    Swipe
                  </button>
                  <button
                    type="button"
                    className="editor-stage-mode-grid-button"
                    onClick={() => rotateSelectedObject(1)}
                    disabled={!selectedObject}
                  >
                    Rotate
                  </button>
                  <button
                    type="button"
                    className={cn('editor-stage-mode-grid-button', selectedTool === 'select' ? 'is-active' : '')}
                    onClick={() => handleToolSelect('select')}
                  >
                    Free Move
                  </button>
                  <button
                    type="button"
                    className={cn('editor-stage-mode-grid-button', placementMode === 'single' ? 'is-active' : '')}
                    onClick={() => setPlacementMode('single')}
                  >
                    Snap
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {isMobileLayout ? (
          <div className="editor-stage-footer">
            <div className="editor-stage-scrollbar-row">
              <Button
                variant="ghost"
                onClick={() => setHorizontalScrollPosition(horizontalScrollValue - 8)}
                disabled={horizontalScrollMax <= 0}
              >
                Left
              </Button>

              <div className="editor-stage-scrollbar-track">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/72">
                  <p className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">Stage Scroll</p>
                  <p>
                    X: <span className="text-white">{Math.round(horizontalScrollValue)}</span> /{' '}
                    <span className="text-white">{Math.max(0, Math.round(horizontalScrollMax))}</span>
                  </p>
                </div>

                <input
                  type="range"
                  min={0}
                  max={Math.max(horizontalScrollMax, 0)}
                  step={1}
                  value={horizontalScrollValue}
                  disabled={horizontalScrollMax <= 0}
                  className="editor-horizontal-scroll"
                  aria-label="Horizontal stage scroll"
                  onChange={(event) => setHorizontalScrollPosition(Number(event.target.value))}
                />
              </div>

              <Button
                variant="ghost"
                onClick={() => setHorizontalScrollPosition(horizontalScrollValue + 8)}
                disabled={horizontalScrollMax <= 0}
              >
                Right
              </Button>
            </div>

            <div className="editor-stage-meta">
              <p>
                Tool: <span className="text-white">{activeToolLabel}</span>
              </p>
              <p>
                Selected: <span className="text-white">{selectionLabel}</span>
              </p>
              <p>
                Cursor: <span className="text-white">{cursorWorld.x}, {cursorWorld.y}</span>
              </p>
              <p>
                Zoom: <span className="text-white">{zoom.toFixed(2)}x</span>
              </p>
              <p>
                Objects: <span className="text-white">{levelData.objects.length}</span>
              </p>
              <p>
                History: <span className="text-white">{historyPosition}</span>
              </p>
            </div>
          </div>
        ) : null}

        {saveStatusMessage ? (
          <div
            className={cn(
              'editor-note-box px-4 py-3 text-sm',
              saveState === 'error' ? 'text-[#ff8aa1]' : 'text-[#82f6ff]',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{saveStatusMessage}</span>
              {saveState === 'saving' && saveProgressPercent != null ? <span>{saveProgressPercent}%</span> : null}
            </div>
            {saveState === 'saving' ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#82f6ff] transition-[width] duration-150"
                  style={{ width: `${saveProgressPercent ?? 0}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </Panel>

      {showPreview ? (
        <div className="editor-mobile-preview-shell" role="dialog" aria-modal="true" aria-label="Editor preview">
          <div className="editor-mobile-preview-actions" aria-label="Preview controls">
            <button
              type="button"
              className="editor-mobile-preview-action"
              onClick={() => setPreviewRunSeed((current) => current + 1)}
              aria-label="Restart preview"
              title="Restart preview"
            >
              <span aria-hidden="true">↻</span>
            </button>
            <button
              type="button"
              className="editor-mobile-preview-action editor-mobile-preview-action--close"
              onClick={() => setShowPreview(false)}
              aria-label="Close preview"
              title="Close preview"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <GameCanvas
            key={`editor-preview-mobile-${previewRunSeed}`}
            levelData={levelData}
            runId={`editor-preview-mobile-${previewRunSeed}`}
            attemptNumber={1}
            autoRestartOnFail
            previewStartPosEnabled
            showHitboxes={editorShowHitboxes}
            fullscreen
            className="editor-mobile-preview-runtime"
            onExitToMenu={() => {
              setShowPreview(false);
              setMessage('Returned to the editor from preview.');
            }}
          />
        </div>
      ) : null}

      <div
        ref={settingsPanelRef}
        className={cn(
          'editor-level-settings-host',
          !isMobileLayout ? 'editor-level-settings-host--desktop' : '',
          showDesktopSetup ? 'is-open' : '',
        )}
      >
        <Panel
          className={cn(
            'game-screen space-y-4 bg-transparent editor-level-settings-panel',
            isMobileLayout && !isMobileSettingsExpanded ? 'editor-level-settings-panel--collapsed' : '',
          )}
        >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">Level Setup</p>
            <h3 className="font-display text-2xl text-white">Level Settings</h3>
          </div>
          <div className="editor-inline-actions">
            <Badge tone="accent">{themePresets.find((preset) => preset.value === theme)?.label ?? 'Custom'}</Badge>
            {isMobileLayout ? (
              <Button variant="ghost" onClick={() => setIsMobileSettingsExpanded((current) => !current)}>
                {isMobileSettingsExpanded ? 'Hide Setup' : 'Show Setup'}
              </Button>
            ) : (
              <>
              <Button onClick={handleSave} disabled={saveState === 'saving'}>
                {saveActionLabel}
              </Button>
                {onSubmit ? (
                  <Button
                    variant="secondary"
                    onClick={handleSubmit}
                    disabled={hasStartPositions}
                    title={hasStartPositions ? 'Remove all Start Pos markers before publishing' : undefined}
                  >
                    Submit
                  </Button>
                ) : null}
                <Button variant="ghost" onClick={() => setShowDesktopSetup(false)}>
                  Close Setup
                </Button>
              </>
            )}
          </div>
        </div>

        {isMobileLayout && !isMobileSettingsExpanded ? (
          <div className="editor-mobile-settings-summary">
            <HintChip label="Theme" value={themePresets.find((preset) => preset.value === theme)?.label ?? 'Custom'} />
            <HintChip label="Mode" value={getPlayerModeLabel(levelData.player.mode)} />
            <HintChip label="Objects" value={objectCount} />
            <HintChip label="Start Pos" value={hasStartPositions ? String(startPosCount) : 'None'} />
          </div>
        ) : null}

        {!isMobileLayout || isMobileSettingsExpanded ? (
          <>
            <div>
              <FieldLabel>Title</FieldLabel>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>

            <div className="editor-inline-card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <FieldLabel>Start Pos</FieldLabel>
                  <p className="mt-1 text-sm text-white/68">
                    Start Pos markers affect editor preview only. Levels with Start Pos markers cannot be submitted.
                  </p>
                </div>
                <Badge tone={hasStartPositions ? 'danger' : 'default'}>
                  {hasStartPositions ? `${startPosCount} active` : 'None'}
                </Badge>
              </div>
              <div className="editor-inline-actions">
                <Button variant="ghost" onClick={deleteAllStartPositions} disabled={!hasStartPositions}>
                  Delete All Start Pos
                </Button>
                <Badge tone="accent">
                  {activePreviewStartPos ? `Preview starts at ${activePreviewStartPos.x}, ${activePreviewStartPos.y}` : 'Preview uses main start'}
                </Badge>
              </div>
            </div>

            <div className="editor-inline-card space-y-3">
              <div>
                <FieldLabel>Preview Helpers</FieldLabel>
                <p className="mt-1 text-sm text-white/68">
                  Extra debug overlays for editor test play and the mobile preview.
                </p>
              </div>
              <div className="toggle-row">
                <label className="toggle-box cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editorShowHitboxes}
                    onChange={(event) => setEditorShowHitboxes(event.target.checked)}
                    style={{ accentColor: '#9eff3d' }}
                  />
                  <div>
                    <p className="editor-color-control-label">Show Hitboxes</p>
                    <p className="text-sm text-white/68">
                      Draw the real player and object collision shapes on top of the preview.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {selectedObject ? (
              <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <FieldLabel>Selected Object</FieldLabel>
                <p className="mt-1 text-sm text-white/68">
                  Fine-tune transform, layer, and object-specific behavior without leaving the editor.
                </p>
              </div>
              <Badge tone="accent">{selectedDefinition?.label ?? selectedObject.type}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <FieldLabel>X</FieldLabel>
                <Input
                  type="number"
                  step="0.5"
                  value={selectedObject.x}
                  onChange={(event) => updateSelectedObjectNumeric('x', event.target.value, { step: 0.5 })}
                />
              </div>
              <div>
                <FieldLabel>Y</FieldLabel>
                <Input
                  type="number"
                  step="0.5"
                  value={selectedObject.y}
                  onChange={(event) => updateSelectedObjectNumeric('y', event.target.value, { step: 0.5 })}
                />
              </div>
              <div>
                <FieldLabel>Width</FieldLabel>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={selectedObject.w}
                  onChange={(event) => updateSelectedObjectNumeric('w', event.target.value, { min: 0.5, step: 0.5 })}
                />
              </div>
              <div>
                <FieldLabel>Height</FieldLabel>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={selectedObject.h}
                  onChange={(event) => updateSelectedObjectNumeric('h', event.target.value, { min: 0.5, step: 0.5 })}
                />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="editor-inline-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="editor-color-control-label">Rotation</span>
                  <Badge tone="default">{selectedRotationLabel}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <div>
                    <FieldLabel>Angle (deg)</FieldLabel>
                    <Input
                      type="number"
                      step="1"
                      value={normalizedSelectedRotation}
                      onChange={(event) => updateSelectedObjectRotation(event.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button variant="ghost" onClick={() => nudgeSelectedObjectRotation(-15)}>
                      -15
                    </Button>
                  </div>
                  <div className="flex items-end">
                    <Button variant="ghost" onClick={() => nudgeSelectedObjectRotation(15)}>
                      +15
                    </Button>
                  </div>
                </div>
                <div className="editor-inline-actions">
                  <Button variant="ghost" onClick={() => rotateSelectedObject(-1)}>
                    Rotate -90
                  </Button>
                  <Button variant="ghost" onClick={() => rotateSelectedObject(1)}>
                    Rotate +90
                  </Button>
                </div>
              </div>

              <div className="editor-inline-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="editor-color-control-label">Build Layer</span>
                  <Badge tone="accent">Layer {selectedObject.editorLayer}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <FieldLabel>Editor Layer</FieldLabel>
                    <Input
                      type="number"
                      min={MIN_EDITOR_LAYER}
                      max={MAX_EDITOR_LAYERS}
                      step="1"
                      value={selectedObject.editorLayer}
                      onChange={(event) => updateSelectedObjectEditorLayer(clampEditorLayer(event.target.value))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button variant="ghost" onClick={() => updateSelectedObjectEditorLayer(activeEditorLayer)}>
                      Use Current
                    </Button>
                  </div>
                </div>
              </div>

              <div className="editor-inline-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="editor-color-control-label">Runtime Layer</span>
                  <Badge tone="default">{selectedObject.layer}</Badge>
                </div>
                <div className="editor-inline-actions">
                  <Button
                    variant={selectedObject.layer === 'gameplay' ? 'primary' : 'ghost'}
                    onClick={() => updateSelectedObjectLayer('gameplay')}
                  >
                    Gameplay
                  </Button>
                  <Button
                    variant={selectedObject.layer === 'decoration' ? 'primary' : 'ghost'}
                    onClick={() => updateSelectedObjectLayer('decoration')}
                  >
                    Decoration
                  </Button>
                </div>
              </div>
            </div>

            {paintableSelectedObjects.length ? (
              <div className="editor-inline-card space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="editor-color-control-label">Assign Group</span>
                  <Badge tone="accent">
                    {paintableSelectedObjects.length > 1
                      ? `${paintableSelectedObjects.length} objects`
                      : selectedPaintGroupId
                        ? `Group ${selectedPaintGroupId}`
                        : 'Direct'}
                  </Badge>
                </div>
                <div className="editor-inline-actions">
                  {paintGroupIds.map((groupId) => {
                    const isActive = selectedPaintGroupId === groupId;

                    return (
                      <Button
                        key={groupId}
                        variant={isActive ? 'primary' : 'ghost'}
                        className="min-w-[4.25rem]"
                        onClick={() => assignSelectedObjectToPaintGroup(groupId)}
                      >
                        Group {groupId}
                      </Button>
                    );
                  })}
                  <Button variant="ghost" className="min-w-[4.25rem]" onClick={assignSelectedObjectToNextFreePaintGroup}>
                    Add Group
                  </Button>
                </div>
                <div className="editor-inline-actions">
                  <Button variant="ghost" onClick={() => setIsPaintPopupOpen(true)}>
                    Open Paint
                  </Button>
                  <Button variant="ghost" onClick={detachSelectedObjectFromPaintGroup}>
                    Detach Group
                  </Button>
                </div>
              </div>
            ) : null}

            {selectedObject.type === 'JUMP_PAD' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Jump Boost</FieldLabel>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    value={Number(selectedObject.props.boost ?? 16)}
                    onChange={(event) => updateSelectedObject((object) => {
                      object.props = {
                        ...object.props,
                        boost: Number(event.target.value),
                      };
                    })}
                  />
                </div>
              </div>
            ) : null}

            {selectedObject.type === 'DASH_ORB' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Dash Speed</FieldLabel>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={Number(selectedObject.props.dashSpeed ?? DASH_ORB_SPEED)}
                    onChange={(event) =>
                      updateSelectedObject((object) => {
                        object.props = {
                          ...object.props,
                          dashSpeed: Math.max(0.5, Number(event.target.value) || DASH_ORB_SPEED),
                        };
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {selectedObject.type === 'SPEED_PORTAL' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Speed Multiplier</FieldLabel>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.2"
                    value={Number(selectedObject.props.multiplier ?? 1.4)}
                    onChange={(event) =>
                      updateSelectedObject((object) => {
                        object.props = {
                          ...object.props,
                          multiplier: Number(event.target.value),
                        };
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {isSawObjectType(selectedObject.type) ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Rotation Speed (deg/s)</FieldLabel>
                  <Input
                    type="number"
                    step="10"
                    value={Number(selectedObject.props.rotationSpeed ?? 240)}
                    onChange={(event) =>
                      updateSelectedObject((object) => {
                        object.props = {
                          ...object.props,
                          rotationSpeed: Number(event.target.value),
                        };
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {selectedTriggerObject ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel>Trigger Settings</FieldLabel>
                  <Badge tone="accent">
                    {selectedPaintGroupTriggerObject
                      ? `Group ${Number(selectedPaintGroupTriggerObject.props.groupId ?? 1)}`
                      : 'Post FX'}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <FieldLabel>Activation</FieldLabel>
                    <Select
                      value={String(selectedTriggerObject.props.activationMode ?? 'zone')}
                      onChange={(event) =>
                        updateSelectedTriggerStringProp('activationMode', event.target.value as TriggerActivationMode)
                      }
                    >
                      {triggerActivationModeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {selectedPaintGroupTriggerObject ? (
                    <div>
                      <FieldLabel>Target Group</FieldLabel>
                      <Input
                        type="number"
                        min="1"
                        value={Number(selectedPaintGroupTriggerObject.props.groupId ?? 1)}
                        onChange={(event) =>
                          updateSelectedTriggerNumericProp('groupId', event.target.value, {
                            min: 1,
                          })
                        }
                      />
                    </div>
                  ) : null}

                  {selectedTriggerObject.type === 'MOVE_TRIGGER' ? (
                    <>
                      <div>
                        <FieldLabel>Move X</FieldLabel>
                        <Input
                          type="number"
                          step="0.5"
                          value={Number(selectedTriggerObject.props.moveX ?? 2)}
                          onChange={(event) => updateSelectedTriggerNumericProp('moveX', event.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Move Y (up +)</FieldLabel>
                        <Input
                          type="number"
                          step="0.5"
                          value={Number(selectedTriggerObject.props.moveY ?? 0)}
                          onChange={(event) => updateSelectedTriggerNumericProp('moveY', event.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Duration (ms)</FieldLabel>
                        <Input
                          type="number"
                          min="1"
                          value={Number(selectedTriggerObject.props.durationMs ?? 650)}
                          onChange={(event) =>
                            updateSelectedTriggerNumericProp('durationMs', event.target.value, { min: 1 })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Easing</FieldLabel>
                        <Select
                          value={String(selectedTriggerObject.props.easing ?? 'none')}
                          onChange={(event) =>
                            updateSelectedTriggerStringProp('easing', event.target.value as MoveTriggerEasing)
                          }
                        >
                          {moveTriggerEasingOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <FieldLabel>Follow Player</FieldLabel>
                        <div className="editor-trigger-check-grid mt-2">
                          <button
                            type="button"
                            className={cn(
                              'editor-trigger-check-button',
                              selectedTriggerObject.props.lockToPlayerX ? 'is-active' : '',
                            )}
                            onClick={() =>
                              updateSelectedTriggerBooleanProp(
                                'lockToPlayerX',
                                !selectedTriggerObject.props.lockToPlayerX,
                              )
                            }
                          >
                            <span className="editor-trigger-check-box" />
                            <span>Player X</span>
                          </button>
                          <button
                            type="button"
                            className={cn(
                              'editor-trigger-check-button',
                              selectedTriggerObject.props.lockToPlayerY ? 'is-active' : '',
                            )}
                            onClick={() =>
                              updateSelectedTriggerBooleanProp(
                                'lockToPlayerY',
                                !selectedTriggerObject.props.lockToPlayerY,
                              )
                            }
                          >
                            <span className="editor-trigger-check-box" />
                            <span>Player Y</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {selectedTriggerObject.type === 'ROTATE_TRIGGER' ? (
                    <>
                      <div>
                        <FieldLabel>Center Group</FieldLabel>
                        <Input
                          type="number"
                          min="1"
                          value={Number(selectedTriggerObject.props.centerGroupId ?? 1)}
                          onChange={(event) =>
                            updateSelectedTriggerNumericProp('centerGroupId', event.target.value, {
                              min: 1,
                            })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Degrees</FieldLabel>
                        <Input
                          type="number"
                          step="15"
                          value={Number(selectedTriggerObject.props.degrees ?? 90)}
                          onChange={(event) => updateSelectedTriggerNumericProp('degrees', event.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Times 360</FieldLabel>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={Number(selectedTriggerObject.props.times360 ?? 0)}
                          onChange={(event) =>
                            updateSelectedTriggerNumericProp('times360', event.target.value, { min: 0 })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Duration (ms)</FieldLabel>
                        <Input
                          type="number"
                          min="1"
                          value={Number(selectedTriggerObject.props.durationMs ?? 650)}
                          onChange={(event) =>
                            updateSelectedTriggerNumericProp('durationMs', event.target.value, { min: 1 })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Easing</FieldLabel>
                        <Select
                          value={String(selectedTriggerObject.props.easing ?? 'none')}
                          onChange={(event) =>
                            updateSelectedTriggerStringProp('easing', event.target.value as MoveTriggerEasing)
                          }
                        >
                          {moveTriggerEasingOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <FieldLabel>Object Angle</FieldLabel>
                        <div className="editor-trigger-check-grid mt-2">
                          <button
                            type="button"
                            className={cn(
                              'editor-trigger-check-button',
                              selectedTriggerObject.props.lockObjectRotation ? 'is-active' : '',
                            )}
                            onClick={() =>
                              updateSelectedTriggerBooleanProp(
                                'lockObjectRotation',
                                !selectedTriggerObject.props.lockObjectRotation,
                              )
                            }
                          >
                            <span className="editor-trigger-check-box" />
                            <span>Keep Original Angle</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {selectedTriggerObject.type === 'ALPHA_TRIGGER' ? (
                    <div>
                      <FieldLabel>Alpha</FieldLabel>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={Number(selectedTriggerObject.props.alpha ?? 0.35)}
                        onChange={(event) =>
                          updateSelectedTriggerNumericProp('alpha', event.target.value, { min: 0, max: 1 })
                        }
                      />
                    </div>
                  ) : null}

                  {selectedTriggerObject.type === 'TOGGLE_TRIGGER' ? (
                    <div className="sm:col-span-2">
                      <FieldLabel>Toggle Result</FieldLabel>
                      <div className="editor-inline-actions">
                        <Button
                          variant={selectedTriggerObject.props.enabled ? 'primary' : 'ghost'}
                          onClick={() =>
                            updateSelectedObject((object) => {
                              object.props = { ...object.props, enabled: true };
                            })
                          }
                        >
                          Show Group
                        </Button>
                        <Button
                          variant={!selectedTriggerObject.props.enabled ? 'primary' : 'ghost'}
                          onClick={() =>
                            updateSelectedObject((object) => {
                              object.props = { ...object.props, enabled: false };
                            })
                          }
                        >
                          Hide Group
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {selectedTriggerObject.type === 'PULSE_TRIGGER' ? (
                    <>
                      <div>
                        <FieldLabel>Duration (ms)</FieldLabel>
                        <Input
                          type="number"
                          min="1"
                          value={Number(selectedTriggerObject.props.durationMs ?? 900)}
                          onChange={(event) =>
                            updateSelectedTriggerNumericProp('durationMs', event.target.value, { min: 1 })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Pulse Fill</FieldLabel>
                        <Input
                          type="color"
                          value={getEditorColorInputValue(
                            typeof selectedTriggerObject.props.fillColor === 'string'
                              ? selectedTriggerObject.props.fillColor
                              : '#ffffff',
                            '#ffffff',
                          )}
                          onChange={(event) => updateSelectedTriggerStringProp('fillColor', event.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Pulse Stroke</FieldLabel>
                        <Input
                          type="color"
                          value={getEditorColorInputValue(
                            typeof selectedTriggerObject.props.strokeColor === 'string'
                              ? selectedTriggerObject.props.strokeColor
                              : '#ffffff',
                            '#ffffff',
                          )}
                          onChange={(event) => updateSelectedTriggerStringProp('strokeColor', event.target.value)}
                        />
                      </div>
                    </>
                  ) : null}

                  {selectedTriggerObject.type === 'POST_FX_TRIGGER' ? (
                    <>
                      <div>
                        <FieldLabel>Effect</FieldLabel>
                        <Select
                          value={String(selectedTriggerObject.props.effectType ?? 'flash')}
                          onChange={(event) =>
                            updateSelectedTriggerStringProp('effectType', event.target.value as PostFxEffectType)
                          }
                        >
                          {postFxEffectOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <FieldLabel>Duration (ms)</FieldLabel>
                        <Input
                          type="number"
                          min="1"
                          value={Number(selectedTriggerObject.props.durationMs ?? 900)}
                          onChange={(event) =>
                            updateSelectedTriggerNumericProp('durationMs', event.target.value, { min: 1 })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Strength</FieldLabel>
                        <Input
                          type="number"
                          step="0.05"
                          min="0"
                          max="1.5"
                          value={Number(selectedTriggerObject.props.intensity ?? 0.75)}
                          onChange={(event) =>
                            updateSelectedTriggerNumericProp('intensity', event.target.value, { min: 0, max: 1.5 })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Primary Color</FieldLabel>
                        <Input
                          type="color"
                          value={getEditorColorInputValue(
                            typeof selectedTriggerObject.props.primaryColor === 'string'
                              ? selectedTriggerObject.props.primaryColor
                              : '#ffffff',
                            '#ffffff',
                          )}
                          onChange={(event) => updateSelectedTriggerStringProp('primaryColor', event.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Secondary Color</FieldLabel>
                        <Input
                          type="color"
                          value={getEditorColorInputValue(
                            typeof selectedTriggerObject.props.secondaryColor === 'string'
                              ? selectedTriggerObject.props.secondaryColor
                              : '#7c3aed',
                            '#7c3aed',
                          )}
                          onChange={(event) => updateSelectedTriggerStringProp('secondaryColor', event.target.value)}
                        />
                      </div>

                      {selectedTriggerObject.props.effectType === 'blur' ? (
                        <div>
                          <FieldLabel>Blur Amount (px)</FieldLabel>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={Number(selectedTriggerObject.props.blurAmount ?? 8)}
                            onChange={(event) =>
                              updateSelectedTriggerNumericProp('blurAmount', event.target.value, { min: 0, max: 24 })
                            }
                          />
                        </div>
                      ) : null}

                      {selectedTriggerObject.props.effectType === 'scanlines' ? (
                        <div>
                          <FieldLabel>Line Density</FieldLabel>
                          <Input
                            type="number"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={Number(selectedTriggerObject.props.scanlineDensity ?? 0.45)}
                            onChange={(event) =>
                              updateSelectedTriggerNumericProp('scanlineDensity', event.target.value, {
                                min: 0.1,
                                max: 1,
                              })
                            }
                          />
                        </div>
                      ) : null}

                      {selectedTriggerObject.props.effectType === 'shake' ? (
                        <div>
                          <FieldLabel>Shake Power</FieldLabel>
                          <Input
                            type="number"
                            min="0"
                            max="2"
                            step="0.05"
                            value={Number(selectedTriggerObject.props.shakePower ?? 0.85)}
                            onChange={(event) =>
                              updateSelectedTriggerNumericProp('shakePower', event.target.value, {
                                min: 0,
                                max: 2,
                              })
                            }
                          />
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
              </div>
            ) : null}

            <div className="space-y-3">
              <FieldLabel>Theme Preset</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {themePresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => applyThemePreset(preset.value)}
                    className={cn(
                      'tool-tile px-3 py-3 text-left transition',
                      theme === preset.value ? 'tool-tile-active text-[#173300]' : 'text-white hover:brightness-110',
                    )}
                  >
                    <span className="font-display block text-[10px] tracking-[0.18em] uppercase">{preset.label}</span>
                    <span
                      className={cn(
                        'mt-1 block text-[10px] normal-case',
                        theme === preset.value ? 'text-[#173300]/80' : 'text-white/60',
                      )}
                    >
                      {preset.value}
                    </span>
                  </button>
                ))}
              </div>
              <Input
                value={theme}
                onChange={(event) => {
                  applyThemePreset(event.target.value);
                }}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <FieldLabel>Ground Color</FieldLabel>
                <Badge tone={levelData.meta.groundColor ? 'accent' : 'default'}>
                  {levelData.meta.groundColor ? 'Custom Ground' : 'Theme Ground'}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-[92px,1fr,auto]">
                <Input
                  type="color"
                  value={resolvedGroundColor}
                  onChange={(event) =>
                    updateLevelData((draft) => {
                      draft.meta.groundColor = event.target.value;
                    })
                  }
                />
                <Input
                  value={resolvedGroundColor}
                  onChange={(event) =>
                    updateLevelData((draft) => {
                      draft.meta.groundColor = getEditorColorInputValue(event.target.value, resolvedGroundColor);
                    })
                  }
                />
                <Button
                  variant="ghost"
                  onClick={() =>
                    updateLevelData((draft) => {
                      delete draft.meta.groundColor;
                    })
                  }
                >
                  Use Theme
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <FieldLabel>Level Music</FieldLabel>
                <Badge tone={resolvedMusic.src ? 'accent' : 'default'}>
                  {resolvedMusic.src ? 'Custom Track Ready' : 'No Custom Audio'}
                </Badge>
              </div>

          <div>
            <FieldLabel>Track Label</FieldLabel>
            <Input
              value={musicLabelInput}
              placeholder="My custom song"
              onChange={(event) => setMusicLabelInput(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Music URL</FieldLabel>
            <div className="editor-music-url-row">
              <Input
                value={musicUrlInput}
                placeholder="https://example.com/track.mp3"
                onChange={(event) => setMusicUrlInput(event.target.value)}
              />
              <Button variant="ghost" onClick={applyCustomMusicUrl}>
                Apply URL
              </Button>
            </div>
          </div>

          <div className="editor-music-upload-row">
            <label className="editor-music-upload-button">
              <span>Upload Audio</span>
              <input type="file" accept="audio/*" onChange={handleMusicFilePicked} />
            </label>

            <Button variant="ghost" onClick={clearLevelMusic}>
              Clear Music
            </Button>

            <Button variant="ghost" onClick={restartPreviewFromMusicOffset}>
              Test Sync
            </Button>
          </div>

          <div>
            <FieldLabel>Music Offset (ms)</FieldLabel>
            <Input
              type="number"
              min="0"
              step="10"
              value={musicOffsetMsValue}
              onChange={(event) =>
                updateLevelData((draft) => {
                  draft.meta.musicOffsetMs = Math.max(0, Number(event.target.value) || 0);
                })
              }
            />
          </div>

          <div className="editor-note-box px-4 py-3 text-sm text-white/72">
            Add your own track by URL or upload an audio file, then use offset plus sync test to line the song up with
            your gameplay. Uploaded files are embedded into the level data, so keep them reasonably small.
          </div>

          {resolvedMusic.src ? (
            <div className="editor-music-preview">
              <div className="flex items-center justify-between gap-3">
                <span className="editor-color-control-label">Preview</span>
                <span className="text-xs text-white/72">{resolvedMusic.label}</span>
              </div>
              <audio controls preload="metadata" src={resolvedMusic.src} className="w-full" />
            </div>
          ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <FieldLabel>Player Mode</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {(['cube', 'ball', 'ship', 'arrow'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPlayerMode(mode)}
                      className={cn(
                        'tool-tile px-3 py-3 text-left transition',
                        levelData.player.mode === mode ? 'tool-tile-active text-[#173300]' : 'text-white hover:brightness-110',
                      )}
                    >
                      <span className="font-display block text-[10px] tracking-[0.18em] uppercase">
                        {getPlayerModeLabel(mode)}
                      </span>
                      <span
                        className={cn(
                          'mt-1 block text-[10px] normal-case',
                          levelData.player.mode === mode ? 'text-[#173300]/80' : 'text-white/60',
                        )}
                      >
                        {mode === 'ship'
                          ? 'Hold to climb, release to descend'
                          : mode === 'ball'
                            ? 'Tap to flip gravity between floor and ceiling'
                            : mode === 'arrow'
                              ? 'Hold to rise, release to dive'
                              : 'Classic jump timing'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>Auto Length Units</FieldLabel>
                <Input type="number" value={levelData.meta.lengthUnits} readOnly />
              </div>
              <div>
                <FieldLabel>Base Speed</FieldLabel>
                <Input
                  type="number"
                  step="0.1"
                  value={levelData.player.baseSpeed}
                  onChange={(event) =>
                    updateLevelData((draft) => {
                      draft.player.baseSpeed = Number(event.target.value);
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <HintChip label="Objects" value={String(levelData.objects.length)} />
              <HintChip label="Length" value={`${levelData.meta.lengthUnits} units`} />
              <HintChip label="Base Speed" value={levelData.player.baseSpeed.toFixed(1)} />
              <HintChip label="Mode" value={getPlayerModeLabel(levelData.player.mode)} />
              <HintChip label="Theme" value={theme} />
            </div>
          </>
        ) : (
          <div className="editor-note-box px-4 py-3 text-sm text-white/72">
            Mobile setup is collapsed so the stage stays front and center. Open it only when you need level tuning,
            music, or trigger details.
          </div>
        )}
        </Panel>
      </div>
    </div>
  );
}

function ToolButton({
  tool,
  label,
  description,
  active,
  compact = false,
  hideDescription = false,
  hideLabel = false,
  onClick,
}: {
  tool: EditorTool;
  label: string;
  description?: string;
  active: boolean;
  compact?: boolean;
  hideDescription?: boolean;
  hideLabel?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'tool-tile text-left transition',
        compact ? 'px-2.5 py-2' : 'px-3 py-3',
        active ? 'tool-tile-active text-[#173300]' : 'text-white hover:brightness-110',
      )}
    >
      <ToolButtonPreview tool={tool} active={active} />
      {!hideLabel ? (
        <span className={cn('font-display block uppercase', compact ? 'text-[9px] tracking-[0.14em]' : 'text-[10px] tracking-[0.18em]')}>
          {label}
        </span>
      ) : null}
      {description && !hideDescription ? (
        <span
          className={cn(
            'mt-1 block normal-case',
            compact ? 'text-[9px] leading-4' : 'text-[10px] leading-5',
            active ? 'text-[#173300]/80' : 'text-white/62',
          )}
        >
          {description}
        </span>
      ) : null}
    </button>
  );
}

function ToolButtonPreview({ tool, active }: { tool: EditorTool; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const width = 64;
    const height = 40;
    const renderScale = getCanvasRenderScale();
    canvas.width = Math.max(1, Math.floor(width * renderScale));
    canvas.height = Math.max(1, Math.floor(height * renderScale));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    context.imageSmoothingEnabled = true;
    const paintPreview = () => {
      context.clearRect(0, 0, width, height);

      if (tool === 'select' || tool === 'pan') {
        context.fillStyle = active ? 'rgba(23, 51, 0, 0.12)' : 'rgba(255,255,255,0.08)';
        context.fillRect(0, 0, width, height);
        context.strokeStyle = active ? 'rgba(23, 51, 0, 0.48)' : 'rgba(255,255,255,0.18)';
        context.lineWidth = 2;
        context.strokeRect(1, 1, width - 2, height - 2);
        context.fillStyle = active ? '#173300' : 'rgba(255,255,255,0.9)';
        context.font = "900 12px 'Arial Black', 'Trebuchet MS', 'Verdana', sans-serif";
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(tool === 'select' ? 'SEL' : 'PAN', width / 2, height / 2 + 0.5);
        return;
      }

      const definition = levelObjectDefinitions[tool];
      const object: LevelObject = {
        id: `preview-${tool}`,
        type: tool,
        x: 0,
        y: 0,
        w: definition.defaultSize.w,
        h: definition.defaultSize.h,
        rotation: 0,
        layer: isDecorationObjectType(tool) ? 'decoration' : 'gameplay',
        editorLayer: 1,
        props: {},
      };

      const padding = 5;
      const scale = Math.min(
        (width - padding * 2) / Math.max(object.w, 0.001),
        (height - padding * 2) / Math.max(object.h, 0.001),
      );
      const drawWidth = object.w * scale;
      const drawHeight = object.h * scale;
      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;

      drawStageObjectSprite({
        context,
        object,
        x: drawX,
        y: drawY,
        w: drawWidth,
        h: drawHeight,
        fillColor: definition.color,
        strokeColor: definition.strokeColor,
        isActive: active,
        isUsedOrb: false,
      });
    };

    paintPreview();

    if (tool === 'select' || tool === 'pan') {
      return;
    }

    const sprite = getStageObjectPreviewSpriteImage(tool);
    if (!sprite || (sprite.complete && sprite.naturalWidth > 0)) {
      return;
    }

    const handleSpriteReady = () => {
      paintPreview();
    };

    sprite.addEventListener('load', handleSpriteReady);
    sprite.addEventListener('error', handleSpriteReady);

    return () => {
      sprite.removeEventListener('load', handleSpriteReady);
      sprite.removeEventListener('error', handleSpriteReady);
    };
  }, [tool, active]);

  return (
    <span className="tool-tile-preview" aria-hidden="true">
      <canvas ref={canvasRef} width={64} height={40} />
    </span>
  );
}

function HintChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="editor-hint-box">
      <p className="font-display text-[9px] tracking-[0.16em] text-[#ffd44a]">{label}</p>
      <p className="mt-1 text-[11px] leading-5 text-white/78">{value}</p>
    </div>
  );
}

function getCanvasScreenPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const styles = window.getComputedStyle(canvas);
  const borderLeft = Number.parseFloat(styles.borderLeftWidth) || 0;
  const borderRight = Number.parseFloat(styles.borderRightWidth) || 0;
  const borderTop = Number.parseFloat(styles.borderTopWidth) || 0;
  const borderBottom = Number.parseFloat(styles.borderBottomWidth) || 0;
  const innerWidth = Math.max(1, rect.width - borderLeft - borderRight);
  const innerHeight = Math.max(1, rect.height - borderTop - borderBottom);
  const offsetX = clamp(clientX - rect.left - borderLeft, 0, innerWidth);
  const offsetY = clamp(clientY - rect.top - borderTop, 0, innerHeight);
  const logicalWidth = Number.parseFloat(canvas.dataset.logicalWidth ?? '') || innerWidth;
  const logicalHeight = Number.parseFloat(canvas.dataset.logicalHeight ?? '') || innerHeight;

  return {
    screenX: (offsetX / innerWidth) * logicalWidth,
    screenY: (offsetY / innerHeight) * logicalHeight,
  };
}

function getCanvasRenderScale() {
  if (typeof window === 'undefined') {
    return 1;
  }

  return Math.max(1, Math.min(2, window.devicePixelRatio || 1));
}

function screenToWorld(screenX: number, screenY: number, panX: number, panY: number, cell: number) {
  return {
    x: (screenX - panX) / cell,
    y: (screenY - panY) / cell,
  };
}

function worldToScreen(x: number, y: number, panX: number, panY: number, cell: number) {
  return {
    x: x * cell + panX,
    y: y * cell + panY,
  };
}

function buildEditorMusicSyncPreview(
  levelData: LevelData,
  bootstrap: {
    startX: number;
    startY: number;
    speedMultiplier: number;
  },
  elapsedMs: number,
): EditorMusicSyncPreview {
  const levelEndX = computeAutoLevelFinishX(levelData);
  const speedPortals = levelData.objects
    .filter((object) => object.type === 'SPEED_PORTAL' && object.x + object.w >= bootstrap.startX)
    .sort((left, right) => left.x - right.x || left.y - right.y);

  let cursorX = bootstrap.startX;
  let currentSpeedMultiplier = Math.max(0.1, Number(bootstrap.speedMultiplier) || levelData.player.baseSpeed || 1);
  let remainingMs = Math.max(0, elapsedMs);

  for (const portal of speedPortals) {
    const portalX = clamp(portal.x, cursorX, levelEndX);

    if (portalX > cursorX) {
      const segmentDurationMs = ((portalX - cursorX) / (BASE_HORIZONTAL_SPEED * currentSpeedMultiplier)) * 1000;

      if (remainingMs <= segmentDurationMs) {
        cursorX += (remainingMs / 1000) * BASE_HORIZONTAL_SPEED * currentSpeedMultiplier;
        remainingMs = 0;
        break;
      }

      remainingMs -= segmentDurationMs;
      cursorX = portalX;
    }

    const nextMultiplier = Number(portal.props.multiplier ?? currentSpeedMultiplier);
    if (Number.isFinite(nextMultiplier) && nextMultiplier > 0) {
      currentSpeedMultiplier = nextMultiplier;
    }
  }

  if (remainingMs > 0) {
    cursorX = Math.min(levelEndX, cursorX + (remainingMs / 1000) * BASE_HORIZONTAL_SPEED * currentSpeedMultiplier);
  }

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((cursorX - bootstrap.startX) / Math.max(1, levelEndX - bootstrap.startX)) * 100)),
  );

  return {
    x: clamp(cursorX, bootstrap.startX, levelEndX),
    y: bootstrap.startY,
    speedMultiplier: currentSpeedMultiplier,
    progressPercent,
  };
}

function drawEditorMusicSyncGuide(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  panX: number,
  panY: number,
  cell: number,
  preview: EditorMusicSyncPreview,
  elapsedMs: number,
) {
  const stripeX = worldToScreen(preview.x, 0, panX, panY, cell).x;
  const marker = worldToScreen(preview.x, preview.y + 0.5, panX, panY, cell);
  const bandWidth = Math.max(4, cell * 0.12);
  const markerSize = Math.max(12, cell * 0.46);

  context.save();
  context.fillStyle = 'rgba(96, 255, 92, 0.12)';
  context.fillRect(stripeX - bandWidth * 1.4, 0, bandWidth * 2.8, height);
  context.strokeStyle = 'rgba(92, 255, 72, 0.92)';
  context.shadowColor = 'rgba(125, 255, 73, 0.55)';
  context.shadowBlur = cell * 0.42;
  context.lineWidth = bandWidth;
  context.beginPath();
  context.moveTo(stripeX, 0);
  context.lineTo(stripeX, height);
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = '#11192f';
  context.strokeStyle = '#7dff49';
  context.lineWidth = Math.max(2, cell * 0.06);
  context.beginPath();
  context.arc(marker.x, marker.y, markerSize * 0.52, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(marker.x, marker.y, markerSize * 0.15, 0, Math.PI * 2);
  context.fill();
  context.restore();

  const labelText = `SYNC ${(elapsedMs / 1000).toFixed(1)}s  x${preview.speedMultiplier.toFixed(2)}  ${preview.progressPercent}%`;
  const labelWidth = Math.max(118, labelText.length * 7.6);
  const labelX = clamp(stripeX - labelWidth / 2, 12, Math.max(12, width - labelWidth - 12));
  const labelY = 18;

  context.save();
  context.fillStyle = 'rgba(11, 18, 44, 0.88)';
  context.strokeStyle = 'rgba(125, 255, 73, 0.8)';
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(labelX, labelY, labelWidth, 26, 10);
  context.fill();
  context.stroke();
  context.fillStyle = '#dfffe0';
  context.font = '700 12px Segoe UI';
  context.textBaseline = 'middle';
  context.fillText(labelText, labelX + 10, labelY + 13);
  context.restore();
}

function drawEditorPermanentStageFloor(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  topY: number,
  cell: number,
  panX: number,
  groundPalette: ReturnType<typeof getStageGroundPalette>,
) {
  const deckHeight = Math.max(cell * 1.06, 18);
  const floorGradient = context.createLinearGradient(0, topY, 0, topY + deckHeight);
  floorGradient.addColorStop(0, groundPalette.top);
  floorGradient.addColorStop(0.18, groundPalette.mid);
  floorGradient.addColorStop(1, groundPalette.bottom);

  context.fillStyle = floorGradient;
  context.fillRect(0, topY, width, deckHeight);

  context.fillStyle = groundPalette.shadow;
  context.fillRect(0, topY + deckHeight, width, Math.max(0, height - topY - deckHeight));

  context.strokeStyle = groundPalette.seam;
  context.lineWidth = 1;
  const seamOffset = ((panX % cell) + cell) % cell;
  for (let x = seamOffset - cell; x < width + cell; x += cell) {
    context.beginPath();
    context.moveTo(x, topY + deckHeight * 0.18);
    context.lineTo(x, topY + deckHeight);
    context.stroke();
  }

  context.strokeStyle = groundPalette.highlight;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(0, topY);
  context.lineTo(width, topY);
  context.stroke();
}

function drawEditorObjectHitbox(
  context: CanvasRenderingContext2D,
  object: LevelObject,
  playerMode: LevelData['player']['mode'],
  panX: number,
  panY: number,
  cell: number,
  viewportHeight: number,
  alpha = 1,
) {
  if (object.type === 'DASH_BLOCK' || object.type === 'START_MARKER' || object.type === 'START_POS') {
    return;
  }

  if (isTriggerObjectType(object.type)) {
    const activationMode = getEditorTriggerActivationMode(object.props.activationMode);
    const playerHitboxLayout = getPlayerHitboxLayout(playerMode);

    if (activationMode === 'zone') {
      const zoneWidth = Math.max(0.18, object.w * 0.18, playerHitboxLayout.width * 0.22);
      const zoneCenterX = object.x + object.w / 2;
      const zonePosition = worldToScreen(zoneCenterX - zoneWidth / 2, 0, panX, panY, cell);
      drawEditorHitboxRect(
        context,
        zonePosition.x,
        0,
        zoneWidth * cell,
        viewportHeight,
        'rgba(153, 255, 104, 0.08)',
        'rgba(153, 255, 104, 0.96)',
        alpha,
        [8, 6],
      );
    } else {
      const position = worldToScreen(object.x, object.y, panX, panY, cell);
      drawEditorHitboxRect(
        context,
        position.x,
        position.y,
        object.w * cell,
        object.h * cell,
        'rgba(153, 255, 104, 0.12)',
        'rgba(153, 255, 104, 0.96)',
        alpha,
        [8, 6],
      );
    }

    return;
  }

  if (isSpikeObjectType(object.type)) {
    const spikeHitbox = getSpikeHitboxRect(object);
    drawEditorHazardHitboxPolygon(
      context,
      [
        worldToScreen(spikeHitbox.x, spikeHitbox.y, panX, panY, cell),
        worldToScreen(spikeHitbox.x + spikeHitbox.w, spikeHitbox.y, panX, panY, cell),
        worldToScreen(spikeHitbox.x + spikeHitbox.w, spikeHitbox.y + spikeHitbox.h, panX, panY, cell),
        worldToScreen(spikeHitbox.x, spikeHitbox.y + spikeHitbox.h, panX, panY, cell),
      ],
      'rgba(255, 56, 56, 0.16)',
      'rgba(255, 36, 36, 0.98)',
      alpha,
    );
    return;
  }

  if (object.type === 'ARROW_RAMP_ASC' || object.type === 'ARROW_RAMP_DESC') {
    drawEditorHitboxPolygon(
      context,
      getEditorArrowRampTriangle(object).map((point) => {
        const screenPoint = worldToScreen(point.x, point.y, panX, panY, cell);
        return { x: screenPoint.x, y: screenPoint.y };
      }),
      'rgba(102, 211, 255, 0.14)',
      'rgba(116, 226, 255, 0.96)',
      alpha,
    );
    return;
  }

  if (isSawObjectType(object.type)) {
    const center = worldToScreen(object.x + object.w / 2, object.y + object.h / 2, panX, panY, cell);
    const radius = Math.max(0.18, Math.min(object.w, object.h) * getEditorSawHitRadiusFactor(object.type)) * cell;
    drawEditorHitboxCircle(
      context,
      center.x,
      center.y,
      radius,
      'rgba(255, 83, 109, 0.16)',
      'rgba(255, 95, 124, 0.98)',
      alpha,
    );
    return;
  }

  if (editorOrbHitboxTypes.has(object.type)) {
    const center = worldToScreen(object.x + object.w / 2, object.y + object.h / 2, panX, panY, cell);
    const radius = Math.max(0.18, Math.min(object.w, object.h) * 0.39 + 0.02) * cell;
    drawEditorHitboxCircle(
      context,
      center.x,
      center.y,
      radius,
      'rgba(255, 217, 94, 0.16)',
      'rgba(255, 228, 126, 0.98)',
      alpha,
    );
    return;
  }

  if (isCollidableBlockType(object.type)) {
    for (const band of getEditorBlockSupportRects(object)) {
      const bandPosition = worldToScreen(band.x, band.y, panX, panY, cell);
      drawEditorHitboxRect(
        context,
        bandPosition.x,
        bandPosition.y,
        band.w * cell,
        band.h * cell,
        'rgba(92, 176, 255, 0.14)',
        'rgba(92, 176, 255, 0.96)',
        alpha,
      );
    }
    return;
  }

  const position = worldToScreen(object.x, object.y, panX, panY, cell);
  const isPassBlock = isPassThroughBlockType(object.type);
  const fillColor = isPassBlock
    ? 'rgba(255, 255, 255, 0.05)'
    : editorPortalHitboxTypes.has(object.type)
      ? 'rgba(191, 129, 255, 0.14)'
      : object.type === 'JUMP_PAD'
        ? 'rgba(255, 217, 94, 0.16)'
        : 'rgba(255, 255, 255, 0.1)';
  const strokeColor = isPassBlock
    ? 'rgba(255, 255, 255, 0.5)'
    : editorPortalHitboxTypes.has(object.type)
      ? 'rgba(210, 158, 255, 0.96)'
      : object.type === 'JUMP_PAD'
        ? 'rgba(255, 228, 126, 0.98)'
        : 'rgba(255, 255, 255, 0.92)';
  const strokeDash = isPassBlock ? [6, 5] : undefined;

  drawEditorHitboxRect(
    context,
    position.x,
    position.y,
    object.w * cell,
    object.h * cell,
    fillColor,
    strokeColor,
    alpha,
    strokeDash,
  );
}

function getEditorBlockSupportRects(object: LevelObject) {
  const collisionMask = getBlockCollisionMask(object.type);

  if (!collisionMask || !hasBlockSupport(collisionMask)) {
    return [];
  }

  const thickness = Math.min(
    Math.max(EDITOR_BLOCK_SUPPORT_BAND_THICKNESS_UNITS, Math.min(object.w, object.h) * 0.18),
    Math.min(object.w, object.h),
  );
  const bands: Array<{ x: number; y: number; w: number; h: number }> = [];

  if (collisionMask.top) {
    bands.push({
      x: object.x,
      y: object.y,
      w: object.w,
      h: thickness,
    });
  }

  if (collisionMask.bottom) {
    bands.push({
      x: object.x,
      y: object.y + object.h - thickness,
      w: object.w,
      h: thickness,
    });
  }

  if (collisionMask.left) {
    bands.push({
      x: object.x,
      y: object.y,
      w: thickness,
      h: object.h,
    });
  }

  if (collisionMask.right) {
    bands.push({
      x: object.x + object.w - thickness,
      y: object.y,
      w: thickness,
      h: object.h,
    });
  }

  return bands;
}

function drawEditorPlayerHitbox(
  context: CanvasRenderingContext2D,
  mode: LevelData['player']['mode'],
  playerX: number,
  playerY: number,
  panX: number,
  panY: number,
  cell: number,
) {
  const layout = getPlayerHitboxLayout(mode);
  const position = worldToScreen(playerX + layout.offsetX, playerY + layout.offsetY, panX, panY, cell);
  drawEditorHitboxRect(
    context,
    position.x,
    position.y,
    layout.width * cell,
    layout.height * cell,
    'rgba(38, 255, 225, 0.16)',
    'rgba(96, 255, 235, 0.98)',
    1,
  );
}

function drawEditorHitboxRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor: string,
  strokeColor: string,
  alpha = 1,
  lineDash?: number[],
) {
  context.save();
  context.globalAlpha *= alpha;
  if (lineDash?.length) {
    context.setLineDash(lineDash);
  }
  context.fillStyle = fillColor;
  context.strokeStyle = strokeColor;
  context.lineWidth = 2.5;
  context.fillRect(x, y, w, h);
  context.strokeRect(x, y, w, h);
  context.restore();
}

function drawEditorHitboxCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fillColor: string,
  strokeColor: string,
  alpha = 1,
) {
  context.save();
  context.globalAlpha *= alpha;
  context.fillStyle = fillColor;
  context.strokeStyle = strokeColor;
  context.lineWidth = 2.5;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawEditorHitboxPolygon(
  context: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  fillColor: string,
  strokeColor: string,
  alpha = 1,
) {
  if (!points.length) {
    return;
  }

  context.save();
  context.globalAlpha *= alpha;
  context.fillStyle = fillColor;
  context.strokeStyle = strokeColor;
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }

  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawEditorHazardHitboxPolygon(
  context: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  fillColor: string,
  strokeColor: string,
  alpha = 1,
) {
  if (!points.length) {
    return;
  }

  context.save();
  context.globalAlpha *= alpha;
  context.fillStyle = fillColor;
  context.strokeStyle = strokeColor;
  context.lineWidth = 3;
  context.shadowColor = strokeColor;
  context.shadowBlur = 6;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }

  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function getEditorTriggerActivationMode(value: unknown): TriggerActivationMode {
  return value === 'touch' ? 'touch' : 'zone';
}

function getEditorArrowRampTriangle(object: LevelObject) {
  const centerX = object.x + object.w / 2;
  const centerY = object.y + object.h / 2;
  const normalizedRotation = normalizeQuarterRotation(object.rotation ?? 0);
  const baseVertices =
    object.type === 'ARROW_RAMP_ASC'
      ? [
          { x: object.x, y: object.y + object.h },
          { x: object.x + object.w, y: object.y + object.h },
          { x: object.x + object.w, y: object.y },
        ]
      : [
          { x: object.x, y: object.y },
          { x: object.x, y: object.y + object.h },
          { x: object.x + object.w, y: object.y + object.h },
        ];

  if (normalizedRotation === 0) {
    return baseVertices;
  }

  const angle = (normalizedRotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return baseVertices.map((point) => {
    const offsetX = point.x - centerX;
    const offsetY = point.y - centerY;

    return {
      x: centerX + offsetX * cos - offsetY * sin,
      y: centerY + offsetX * sin + offsetY * cos,
    };
  });
}

function getEditorSawHitRadiusFactor(type: LevelObjectType) {
  if (type === 'SAW_STAR' || type === 'SAW_STAR_MEDIUM' || type === 'SAW_STAR_LARGE') {
    return 0.38;
  }

  if (type === 'SAW_GEAR' || type === 'SAW_GEAR_MEDIUM' || type === 'SAW_GEAR_LARGE') {
    return 0.4;
  }

  if (type === 'SAW_GLOW' || type === 'SAW_GLOW_MEDIUM' || type === 'SAW_GLOW_LARGE') {
    return 0.36;
  }

  return 0.42;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    return value;
  }

  return Math.round(value / step) * step;
}

function normalizeObjectRotationDegrees(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalized = ((value % 360) + 360) % 360;
  return roundToStep(normalized, 0.01);
}

function formatRotationDegrees(value: number) {
  const normalized = normalizeObjectRotationDegrees(value);
  return Number.isInteger(normalized) ? `${normalized}deg` : `${normalized.toFixed(2).replace(/\.?0+$/, '')}deg`;
}

function isQuarterAlignedRotation(value: number) {
  return Math.abs(normalizeObjectRotationDegrees(value) - normalizeQuarterRotation(value)) <= 0.001;
}

function normalizeQuarterRotation(value: number) {
  const normalized = ((Math.round(value / 90) * 90) % 360 + 360) % 360;
  return normalized === 360 ? 0 : normalized;
}

function dragPreviewStatesEqual(left: DragPreviewState | null, right: DragPreviewState | null) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  const leftIds = Object.keys(left.positions);
  const rightIds = Object.keys(right.positions);

  if (leftIds.length !== rightIds.length) {
    return false;
  }

  return leftIds.every((id) => {
    const leftPosition = left.positions[id];
    const rightPosition = right.positions[id];

    return !!leftPosition && !!rightPosition && leftPosition.x === rightPosition.x && leftPosition.y === rightPosition.y;
  });
}

function getObjectSelectionBounds(objects: LevelObject[]) {
  return objects.reduce(
    (bounds, object) => ({
      left: Math.min(bounds.left, object.x),
      top: Math.min(bounds.top, object.y),
      right: Math.max(bounds.right, object.x + object.w),
      bottom: Math.max(bounds.bottom, object.y + object.h),
    }),
    {
      left: Number.POSITIVE_INFINITY,
      top: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
    },
  );
}

function rotateObjectCenterAroundPivot(
  centerX: number,
  centerY: number,
  pivotX: number,
  pivotY: number,
  direction: -1 | 1,
) {
  const deltaX = centerX - pivotX;
  const deltaY = centerY - pivotY;

  return direction === 1
    ? {
        x: pivotX - deltaY,
        y: pivotY + deltaX,
      }
    : {
        x: pivotX + deltaY,
        y: pivotY - deltaX,
      };
}

function normalizeSelectionBox(selectionBox: SelectionBox) {
  return {
    left: Math.min(selectionBox.startScreenX, selectionBox.endScreenX),
    top: Math.min(selectionBox.startScreenY, selectionBox.endScreenY),
    right: Math.max(selectionBox.startScreenX, selectionBox.endScreenX),
    bottom: Math.max(selectionBox.startScreenY, selectionBox.endScreenY),
  };
}

function rectanglesIntersect(
  left: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  },
  right: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  },
) {
  return left.left <= right.right && left.right >= right.left && left.top <= right.bottom && left.bottom >= right.top;
}

function getPointerDistance(
  firstPoint: {
    x: number;
    y: number;
  },
  secondPoint: {
    x: number;
    y: number;
  },
) {
  return Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y);
}

function pointInsideObject(x: number, y: number, object: LevelObject) {
  return x >= object.x && x <= object.x + object.w && y >= object.y && y <= object.y + object.h;
}

function isTextInputLike(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
