import type { WheelEvent as ReactWheelEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, FieldLabel, Input, Panel } from '../components/ui';
import { GameCanvas } from '../features/game/game-canvas';
import {
  FIXED_LEVEL_START_X,
  FIXED_LEVEL_START_Y,
  createEmptyLevelData,
  levelObjectDefinitions,
} from '../features/game/object-definitions';
import { PLAYER_HITBOX_SIZE, getPlayerHitboxLayout } from '../features/game/player-physics';
import { PlayerModelCanvas } from '../features/game/player-model-canvas';
import { getPlayerModeLabel } from '../features/game/player-mode-config';
import {
  createEmptyPlayerSkinData,
  createEmptyPlayerSkinRecord,
  createPlayerSkinLayer,
  normalizePlayerSkinData,
  playerSkinEditorConfigs,
  usePlayerSkinsQuery,
} from '../features/game/player-skins';
import { apiRequest } from '../services/api';
import type { LevelData, PlayerMode, PlayerSkinData, PlayerSkinLayer, PlayerSkinRecord } from '../types/models';
import { cn } from '../utils/cn';

type SkinTool = 'paint' | 'erase' | 'fill' | 'select' | 'pick';

type SkinHistoryState = {
  past: PlayerSkinData[];
  present: PlayerSkinData;
  future: PlayerSkinData[];
};

type SkinSelection = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type SkinSelectionDraft = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type SkinHoverCell = {
  x: number;
  y: number;
  compositeColor: string | null;
  activeLayerColor: string | null;
  selected: boolean;
};

const colorPresets = ['#F4F7FF', '#182133', '#FFD44A', '#63FFBD', '#79F7FF', '#FF6B9E', '#FF8F3D', '#845CFF'];
const playerModes: PlayerMode[] = ['cube', 'ball', 'ship', 'arrow'];
const MAX_SKIN_LAYERS = 32;
const MAX_HISTORY_STEPS = 120;
const SKIN_CANVAS_CELL_SIZE = 24;
const MIN_SKIN_CANVAS_ZOOM = 0.75;
const MAX_SKIN_CANVAS_ZOOM = 4;
const DEFAULT_SKIN_CANVAS_ZOOM = 1.6;
const DEFAULT_FULLSCREEN_SKIN_CANVAS_ZOOM = 2.25;
const PLAYER_SKIN_DRAFTS_STORAGE_KEY = 'dashforge-player-skin-studio-drafts-v1';
const skinToolOptions: Array<{
  tool: SkinTool;
  label: string;
  hotkey: string;
  description: string;
  activeVariant: 'primary' | 'secondary' | 'ghost' | 'danger';
}> = [
  {
    tool: 'paint',
    label: 'Brush',
    hotkey: 'B',
    description: 'Draw one cell at a time on the active layer.',
    activeVariant: 'primary',
  },
  {
    tool: 'erase',
    label: 'Eraser',
    hotkey: 'E',
    description: 'Remove pixels only from the active layer.',
    activeVariant: 'danger',
  },
  {
    tool: 'fill',
    label: 'Fill',
    hotkey: 'F',
    description: 'Flood-fill the current layer without touching the rest.',
    activeVariant: 'secondary',
  },
  {
    tool: 'select',
    label: 'Select',
    hotkey: 'V',
    description: 'Drag a box selection with the main mouse button or touch.',
    activeVariant: 'secondary',
  },
  {
    tool: 'pick',
    label: 'Picker',
    hotkey: 'I',
    description: 'Sample a color from the sprite and jump back to Brush.',
    activeVariant: 'secondary',
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isHexColor(value: string) {
  return /^#[0-9A-F]{6}$/.test(value.trim().toUpperCase());
}

function getSkinToolLabel(tool: SkinTool) {
  return skinToolOptions.find((entry) => entry.tool === tool)?.label ?? 'Brush';
}

function createDraftRecord(source?: PlayerSkinRecord | null): Record<PlayerMode, PlayerSkinData> {
  return {
    cube: normalizePlayerSkinData(source?.cube ?? createEmptyPlayerSkinData('cube')),
    ball: normalizePlayerSkinData(source?.ball ?? createEmptyPlayerSkinData('ball')),
    ship: normalizePlayerSkinData(source?.ship ?? createEmptyPlayerSkinData('ship')),
    arrow: normalizePlayerSkinData(source?.arrow ?? createEmptyPlayerSkinData('arrow')),
  };
}

function createHistoryState(skinData: PlayerSkinData): SkinHistoryState {
  return {
    past: [],
    present: normalizePlayerSkinData(skinData),
    future: [],
  };
}

function createHistoryRecord(source?: PlayerSkinRecord | null) {
  const drafts = createDraftRecord(source);

  return {
    cube: createHistoryState(drafts.cube),
    ball: createHistoryState(drafts.ball),
    ship: createHistoryState(drafts.ship),
    arrow: createHistoryState(drafts.arrow),
  } satisfies Record<PlayerMode, SkinHistoryState>;
}

function readStoredPlayerSkinDrafts(): PlayerSkinRecord | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PLAYER_SKIN_DRAFTS_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return createDraftRecord(JSON.parse(raw) as PlayerSkinRecord);
  } catch {
    return null;
  }
}

function writeStoredPlayerSkinDrafts(source: Record<PlayerMode, PlayerSkinData>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(PLAYER_SKIN_DRAFTS_STORAGE_KEY, JSON.stringify(source));
  } catch {
    // Ignore storage write failures so the editor keeps working normally.
  }
}

function normalizeSkinSelection(selection: SkinSelectionDraft): SkinSelection {
  return {
    left: Math.min(selection.startX, selection.endX),
    top: Math.min(selection.startY, selection.endY),
    right: Math.max(selection.startX, selection.endX),
    bottom: Math.max(selection.startY, selection.endY),
  };
}

function isCellInsideSelection(x: number, y: number, selection: SkinSelection) {
  return x >= selection.left && x <= selection.right && y >= selection.top && y <= selection.bottom;
}

function getSelectionCellCount(selection: SkinSelection | null) {
  if (!selection) {
    return 0;
  }

  return (selection.right - selection.left + 1) * (selection.bottom - selection.top + 1);
}

function getSkinLayers(skinData: PlayerSkinData) {
  return skinData.layers?.length ? skinData.layers : [createPlayerSkinLayer()];
}

function getLayerPixelColor(layer: PlayerSkinLayer, x: number, y: number) {
  const match = layer.pixels.find((pixel) => pixel.x === x && pixel.y === y);
  return match?.color ?? null;
}

function getCompositePixelColor(skinData: PlayerSkinData, x: number, y: number) {
  const layers = getSkinLayers(skinData);

  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];

    if (!layer.visible) {
      continue;
    }

    const color = getLayerPixelColor(layer, x, y);
    if (color) {
      return color;
    }
  }

  return null;
}

function getResolvedLayerSelection(skinData: PlayerSkinData, preferredLayerId?: string | null) {
  const layers = getSkinLayers(skinData);
  const preferredIndex = preferredLayerId ? layers.findIndex((layer) => layer.id === preferredLayerId) : -1;
  const index = preferredIndex >= 0 ? preferredIndex : 0;

  return {
    index,
    layer: layers[index],
  };
}

function createActiveLayerRecord(source: Record<PlayerMode, PlayerSkinData>) {
  return {
    cube: getSkinLayers(source.cube)[0].id,
    ball: getSkinLayers(source.ball)[0].id,
    ship: getSkinLayers(source.ship)[0].id,
    arrow: getSkinLayers(source.arrow)[0].id,
  } satisfies Record<PlayerMode, string>;
}

function serializeSkinData(skinData: PlayerSkinData) {
  return JSON.stringify(normalizePlayerSkinData(skinData));
}

function updateLayerPixels(
  skinData: PlayerSkinData,
  layerId: string,
  updater: (layer: PlayerSkinLayer, pixelMap: Map<string, PlayerSkinLayer['pixels'][number]>) => PlayerSkinLayer | null,
) {
  const layers = getSkinLayers(skinData);
  const layerIndex = layers.findIndex((layer) => layer.id === layerId);

  if (layerIndex < 0) {
    return skinData;
  }

  const layer = layers[layerIndex];
  const pixelMap = new Map<string, PlayerSkinLayer['pixels'][number]>(
    layer.pixels.map((pixel) => [`${pixel.x}:${pixel.y}`, pixel] as const),
  );
  const nextLayer = updater(layer, pixelMap);

  if (!nextLayer) {
    return skinData;
  }

  const nextLayers = layers.map((entry, index) => (index === layerIndex ? nextLayer : entry));
  return normalizePlayerSkinData({
    ...skinData,
    layers: nextLayers,
  });
}

function applyPixelToLayer(
  skinData: PlayerSkinData,
  layerId: string,
  x: number,
  y: number,
  color: string | null,
) {
  const nextColor = color?.toUpperCase() ?? null;

  return updateLayerPixels(skinData, layerId, (layer, pixelMap) => {
    const key = `${x}:${y}`;
    const currentColor = pixelMap.get(key)?.color ?? null;

    if (currentColor === nextColor) {
      return null;
    }

    if (nextColor) {
      pixelMap.set(key, { x, y, color: nextColor });
    } else {
      pixelMap.delete(key);
    }

    return {
      ...layer,
      pixels: Array.from(pixelMap.values()),
    };
  });
}

function fillLayer(
  skinData: PlayerSkinData,
  layerId: string,
  startX: number,
  startY: number,
  color: string | null,
) {
  const replacementColor = color?.toUpperCase() ?? null;

  return updateLayerPixels(skinData, layerId, (layer, pixelMap) => {
    const startKey = `${startX}:${startY}`;
    const targetColor = pixelMap.get(startKey)?.color ?? null;

    if (targetColor === replacementColor) {
      return null;
    }

    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      if (
        current.x < 0 ||
        current.y < 0 ||
        current.x >= skinData.gridCols ||
        current.y >= skinData.gridRows
      ) {
        continue;
      }

      const key = `${current.x}:${current.y}`;

      if (visited.has(key)) {
        continue;
      }

      visited.add(key);

      const currentColor = pixelMap.get(key)?.color ?? null;
      if (currentColor !== targetColor) {
        continue;
      }

      if (replacementColor) {
        pixelMap.set(key, {
          x: current.x,
          y: current.y,
          color: replacementColor,
        });
      } else {
        pixelMap.delete(key);
      }

      queue.push(
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      );
    }

    return {
      ...layer,
      pixels: Array.from(pixelMap.values()),
    };
  });
}

function applyToolToSelection(
  skinData: PlayerSkinData,
  layerId: string,
  selection: SkinSelection,
  tool: SkinTool,
  color: string,
) {
  const nextColor = tool === 'erase' ? null : color.toUpperCase();

  return updateLayerPixels(skinData, layerId, (layer, pixelMap) => {
    let changed = false;

    for (let y = selection.top; y <= selection.bottom; y += 1) {
      for (let x = selection.left; x <= selection.right; x += 1) {
        const key = `${x}:${y}`;
        const currentColor = pixelMap.get(key)?.color ?? null;

        if (currentColor === nextColor) {
          continue;
        }

        changed = true;

        if (nextColor) {
          pixelMap.set(key, {
            x,
            y,
            color: nextColor,
          });
        } else {
          pixelMap.delete(key);
        }
      }
    }

    if (!changed) {
      return null;
    }

    return {
      ...layer,
      pixels: Array.from(pixelMap.values()),
    };
  });
}

function createLayerDraft(existingLayers: PlayerSkinLayer[]) {
  let nextIndex = existingLayers.length + 1;

  while (existingLayers.some((layer) => layer.id === `layer-${nextIndex}`)) {
    nextIndex += 1;
  }

  return createPlayerSkinLayer(`layer-${nextIndex}`, `Layer ${nextIndex}`);
}

function buildSkinPreviewLevel(mode: PlayerMode): LevelData {
  const level = createEmptyLevelData('neon-grid');

  level.meta.lengthUnits = 42;
  level.player.mode = mode;
  level.player.startX = FIXED_LEVEL_START_X;
  level.player.startY = FIXED_LEVEL_START_Y;
  level.finish.x = FIXED_LEVEL_START_X + 34;
  level.finish.y = FIXED_LEVEL_START_Y;
  level.objects = [
    createPreviewObject('preview-planet', 'DECOR_PLANET', 11, 2),
    createPreviewObject('preview-stars', 'DECOR_STAR_CLUSTER', 17, 4),
    createPreviewObject('preview-comet', 'DECOR_COMET', 24, 3),
    createPreviewObject('preview-ring', 'DECOR_RING_PLANET', 31, 2),
  ];

  return level;
}

function createPreviewObject(
  id: string,
  type: LevelData['objects'][number]['type'],
  x: number,
  y: number,
): LevelData['objects'][number] {
  const definition = levelObjectDefinitions[type];

  return {
    id,
    type,
    x,
    y,
    w: definition.defaultSize.w,
    h: definition.defaultSize.h,
    rotation: 0,
    layer: type.startsWith('DECOR') ? 'decoration' : 'gameplay',
    editorLayer: 1,
    props: {},
  };
}

function drawSelectionOverlay(
  context: CanvasRenderingContext2D,
  selection: SkinSelection,
  cellSize: number,
  options: {
    fill: string;
    stroke: string;
    lineDash?: number[];
    lineWidth?: number;
  },
) {
  const x = selection.left * cellSize;
  const y = selection.top * cellSize;
  const width = (selection.right - selection.left + 1) * cellSize;
  const height = (selection.bottom - selection.top + 1) * cellSize;

  context.save();
  context.fillStyle = options.fill;
  context.fillRect(x, y, width, height);
  context.strokeStyle = options.stroke;
  context.lineWidth = options.lineWidth ?? 3;
  context.setLineDash(options.lineDash ?? [12, 8]);
  context.strokeRect(x + 1.5, y + 1.5, Math.max(0, width - 3), Math.max(0, height - 3));
  context.restore();
}

function PlayerSkinPaintCanvas({
  mode,
  skinData,
  activeLayerId,
  tool,
  selection,
  cellSize = SKIN_CANVAS_CELL_SIZE,
  containerClassName,
  canvasClassName,
  onCanvasWheel,
  onUseTool,
  onPickColor,
  onSelectionChange,
  onHoverCellChange,
  onGestureStart,
  onGestureEnd,
}: {
  mode: PlayerMode;
  skinData: PlayerSkinData;
  activeLayerId: string;
  tool: SkinTool;
  selection: SkinSelection | null;
  cellSize?: number;
  containerClassName?: string;
  canvasClassName?: string;
  onCanvasWheel?: (event: ReactWheelEvent<HTMLDivElement>) => void;
  onUseTool: (x: number, y: number, options?: { applySelection: boolean }) => void;
  onPickColor: (x: number, y: number) => void;
  onSelectionChange: (selection: SkinSelection | null) => void;
  onHoverCellChange?: (cell: SkinHoverCell | null) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectionDraft, setSelectionDraft] = useState<SkinSelectionDraft | null>(null);
  const pointerStateRef = useRef<{
    mode: 'paint' | 'select' | null;
    lastCellKey: string | null;
    selectionStart: { x: number; y: number } | null;
  }>({
    mode: null,
    lastCellKey: null,
    selectionStart: null,
  });

  const activeLayer = getResolvedLayerSelection(skinData, activeLayerId).layer;

  const buildHoverCell = (x: number, y: number): SkinHoverCell => ({
    x,
    y,
    compositeColor: getCompositePixelColor(skinData, x, y),
    activeLayerColor: getLayerPixelColor(activeLayer, x, y),
    selected: selection ? isCellInsideSelection(x, y, selection) : false,
  });

  const emitHoverCell = (position: { x: number; y: number } | null) => {
    onHoverCellChange?.(position ? buildHoverCell(position.x, position.y) : null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const width = skinData.gridCols * cellSize;
    const height = skinData.gridRows * cellSize;
    const normalizedSelectionDraft = selectionDraft ? normalizeSkinSelection(selectionDraft) : null;

    canvas.width = width;
    canvas.height = height;

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#09101e';
    context.fillRect(0, 0, width, height);

    context.fillStyle = 'rgba(255,255,255,0.03)';
    for (let row = 0; row < skinData.gridRows; row += 1) {
      for (let column = 0; column < skinData.gridCols; column += 1) {
        if ((row + column) % 2 === 0) {
          context.fillRect(column * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }

    for (const layer of getSkinLayers(skinData)) {
      const shouldGhostHiddenLayer = !layer.visible && layer.id === activeLayer.id;

      if (!layer.visible && !shouldGhostHiddenLayer) {
        continue;
      }

      context.globalAlpha = shouldGhostHiddenLayer ? 0.32 : 1;

      for (const pixel of layer.pixels) {
        context.fillStyle = pixel.color;
        context.fillRect(pixel.x * cellSize, pixel.y * cellSize, cellSize, cellSize);
      }
    }

    context.globalAlpha = 1;

    if (!activeLayer.visible && activeLayer.pixels.length > 0) {
      context.strokeStyle = 'rgba(122, 247, 255, 0.55)';
      context.lineWidth = 1.6;

      for (const pixel of activeLayer.pixels) {
        context.strokeRect(pixel.x * cellSize + 1.5, pixel.y * cellSize + 1.5, cellSize - 3, cellSize - 3);
      }
    }

    context.strokeStyle = 'rgba(255,255,255,0.09)';
    context.lineWidth = 1;
    for (let column = 0; column <= skinData.gridCols; column += 1) {
      const x = column * cellSize + 0.5;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let row = 0; row <= skinData.gridRows; row += 1) {
      const y = row * cellSize + 0.5;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    if (selection) {
      drawSelectionOverlay(context, selection, cellSize, {
        fill: 'rgba(121, 247, 255, 0.12)',
        stroke: 'rgba(121, 247, 255, 0.96)',
      });
    }

    if (normalizedSelectionDraft) {
      drawSelectionOverlay(context, normalizedSelectionDraft, cellSize, {
        fill: 'rgba(202, 255, 69, 0.16)',
        stroke: 'rgba(202, 255, 69, 0.98)',
        lineDash: [10, 6],
        lineWidth: 3.5,
      });
    }

    const contactLayout = getPlayerHitboxLayout(mode, 'contact');
    const solidLayout = getPlayerHitboxLayout(mode, 'solid');
    const scaleX = width / PLAYER_HITBOX_SIZE;
    const scaleY = height / PLAYER_HITBOX_SIZE;

    context.strokeStyle = 'rgba(255, 212, 74, 0.95)';
    context.lineWidth = 3;
    context.strokeRect(
      contactLayout.offsetX * scaleX,
      contactLayout.offsetY * scaleY,
      contactLayout.width * scaleX,
      contactLayout.height * scaleY,
    );

    context.strokeStyle = 'rgba(71, 232, 255, 0.92)';
    context.lineWidth = 2;
    context.setLineDash([8, 6]);
    context.strokeRect(
      solidLayout.offsetX * scaleX,
      solidLayout.offsetY * scaleY,
      solidLayout.width * scaleX,
      solidLayout.height * scaleY,
    );
    context.setLineDash([]);

    context.strokeStyle = 'rgba(255,255,255,0.2)';
    context.lineWidth = 2;
    context.strokeRect(1, 1, width - 2, height - 2);
  }, [activeLayer, cellSize, mode, selection, selectionDraft, skinData]);

  const getGridPosition = (event: React.PointerEvent<HTMLCanvasElement>, clampToBounds = false) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width) * skinData.gridCols;
    const normalizedY = ((event.clientY - rect.top) / rect.height) * skinData.gridRows;
    const x = clampToBounds
      ? Math.min(skinData.gridCols - 1, Math.max(0, Math.floor(normalizedX)))
      : Math.floor(normalizedX);
    const y = clampToBounds
      ? Math.min(skinData.gridRows - 1, Math.max(0, Math.floor(normalizedY)))
      : Math.floor(normalizedY);

    if (x < 0 || y < 0 || x >= skinData.gridCols || y >= skinData.gridRows) {
      return null;
    }

    return { x, y };
  };

  const applyPointerTool = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const position = getGridPosition(event);

    if (!position) {
      return;
    }

    const cellKey = `${position.x}:${position.y}`;

    if (pointerStateRef.current.lastCellKey === cellKey) {
      return;
    }

    pointerStateRef.current.lastCellKey = cellKey;
    onUseTool(position.x, position.y, { applySelection: false });
  };

  const startSelectionGesture = (
    event: React.PointerEvent<HTMLCanvasElement>,
    position: { x: number; y: number },
  ) => {
    pointerStateRef.current.mode = 'select';
    pointerStateRef.current.lastCellKey = null;
    pointerStateRef.current.selectionStart = position;
    setSelectionDraft({
      startX: position.x,
      startY: position.y,
      endX: position.x,
      endY: position.y,
    });
    emitHoverCell(position);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <div
      className={cn(
        'overflow-auto rounded-[28px] border-[4px] border-[#0f1b31] bg-[#09101e] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)]',
        containerClassName,
      )}
      onWheel={onCanvasWheel}
    >
      <canvas
        ref={canvasRef}
        className={cn('mx-auto block max-w-none touch-none rounded-[18px]', canvasClassName)}
        style={{ imageRendering: 'pixelated' }}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          const position = getGridPosition(event, event.button === 2);

          if (!position) {
            emitHoverCell(null);
            return;
          }

          emitHoverCell(position);

          const isInsideSelection = Boolean(selection && isCellInsideSelection(position.x, position.y, selection));

          const shouldStartSelection =
            event.button === 2 || (event.button === 0 && (tool === 'select' || event.shiftKey));

          if (shouldStartSelection) {
            startSelectionGesture(event, position);
            return;
          }

          if (event.button !== 0) {
            return;
          }

          if (tool === 'pick' || event.altKey) {
            onPickColor(position.x, position.y);
            return;
          }

          if (selection && !isInsideSelection) {
            onSelectionChange(null);
          }

          const applySelection = Boolean(tool !== 'fill' && isInsideSelection);

          if (tool === 'fill' || applySelection) {
            onUseTool(position.x, position.y, { applySelection });
            return;
          }

          pointerStateRef.current.mode = 'paint';
          pointerStateRef.current.lastCellKey = null;
          pointerStateRef.current.selectionStart = null;
          onGestureStart();
          event.currentTarget.setPointerCapture(event.pointerId);
          applyPointerTool(event);
        }}
        onPointerMove={(event) => {
          emitHoverCell(getGridPosition(event, true));

          if (pointerStateRef.current.mode === 'select') {
            const position = getGridPosition(event, true);

            if (!position || !pointerStateRef.current.selectionStart) {
              return;
            }

            setSelectionDraft({
              startX: pointerStateRef.current.selectionStart.x,
              startY: pointerStateRef.current.selectionStart.y,
              endX: position.x,
              endY: position.y,
            });
            return;
          }

          if (pointerStateRef.current.mode !== 'paint' || tool === 'fill') {
            return;
          }

          applyPointerTool(event);
        }}
        onPointerUp={(event) => {
          const finalPosition = getGridPosition(event, true);

          if (pointerStateRef.current.mode === 'select') {
            const finalDraft =
              (pointerStateRef.current.selectionStart && finalPosition
                ? {
                    startX: pointerStateRef.current.selectionStart.x,
                    startY: pointerStateRef.current.selectionStart.y,
                    endX: finalPosition.x,
                    endY: finalPosition.y,
                  }
                : null) ??
              selectionDraft ??
              (pointerStateRef.current.selectionStart
                ? {
                    startX: pointerStateRef.current.selectionStart.x,
                    startY: pointerStateRef.current.selectionStart.y,
                    endX: pointerStateRef.current.selectionStart.x,
                    endY: pointerStateRef.current.selectionStart.y,
                  }
                : null);

            if (finalDraft) {
              onSelectionChange(normalizeSkinSelection(finalDraft));
            }

            setSelectionDraft(null);
          }

          if (pointerStateRef.current.mode === 'paint') {
            onGestureEnd();
          }

          pointerStateRef.current.mode = null;
          pointerStateRef.current.lastCellKey = null;
          pointerStateRef.current.selectionStart = null;

          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }

          emitHoverCell(finalPosition);
        }}
        onPointerLeave={() => {
          pointerStateRef.current.lastCellKey = null;
          emitHoverCell(null);
        }}
        onPointerCancel={(event) => {
          if (pointerStateRef.current.mode === 'paint') {
            onGestureEnd();
          }

          pointerStateRef.current.mode = null;
          pointerStateRef.current.lastCellKey = null;
          pointerStateRef.current.selectionStart = null;
          setSelectionDraft(null);

          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }

          emitHoverCell(null);
        }}
      />
    </div>
  );
}

export function AdminPlayerSkinsPage() {
  const queryClient = useQueryClient();
  const playerSkinsQuery = usePlayerSkinsQuery();
  const persistedDraftsRef = useRef<PlayerSkinRecord | null>(readStoredPlayerSkinDrafts());
  const serverDrafts = useMemo(() => createDraftRecord(playerSkinsQuery.data?.skins ?? null), [playerSkinsQuery.data?.skins]);
  const initializedRef = useRef(Boolean(persistedDraftsRef.current));
  const gestureBaseRef = useRef(createEmptyPlayerSkinRecord<PlayerSkinData | null>(null));
  const [activeMode, setActiveMode] = useState<PlayerMode>('cube');
  const [tool, setTool] = useState<SkinTool>('paint');
  const [activeColor, setActiveColor] = useState('#F4F7FF');
  const [colorDraft, setColorDraft] = useState('#F4F7FF');
  const [message, setMessage] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCanvasFullscreenOpen, setIsCanvasFullscreenOpen] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(DEFAULT_SKIN_CANVAS_ZOOM);
  const [fullscreenCanvasZoom, setFullscreenCanvasZoom] = useState(DEFAULT_FULLSCREEN_SKIN_CANVAS_ZOOM);
  const [previewRunSeed, setPreviewRunSeed] = useState(0);
  const [histories, setHistories] = useState<Record<PlayerMode, SkinHistoryState>>(() =>
    createHistoryRecord(persistedDraftsRef.current ?? createEmptyPlayerSkinRecord<PlayerSkinData | null>(null)),
  );
  const [activeLayerIds, setActiveLayerIds] = useState<Record<PlayerMode, string>>(() =>
    createActiveLayerRecord(
      createDraftRecord(persistedDraftsRef.current ?? createEmptyPlayerSkinRecord<PlayerSkinData | null>(null)),
    ),
  );
  const [selections, setSelections] = useState<Record<PlayerMode, SkinSelection | null>>(() =>
    createEmptyPlayerSkinRecord<SkinSelection | null>(null),
  );
  const [hoverCells, setHoverCells] = useState<Record<PlayerMode, SkinHoverCell | null>>(() =>
    createEmptyPlayerSkinRecord<SkinHoverCell | null>(null),
  );

  useEffect(() => {
    if (!playerSkinsQuery.data?.skins || initializedRef.current) {
      return;
    }

    const nextDrafts = createDraftRecord(persistedDraftsRef.current ?? playerSkinsQuery.data.skins);
    initializedRef.current = true;
    setHistories(createHistoryRecord(nextDrafts));
    setActiveLayerIds(createActiveLayerRecord(nextDrafts));
    setSelections(createEmptyPlayerSkinRecord<SkinSelection | null>(null));
    setHoverCells(createEmptyPlayerSkinRecord<SkinHoverCell | null>(null));
  }, [playerSkinsQuery.data?.skins]);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    writeStoredPlayerSkinDrafts({
      cube: histories.cube.present,
      ball: histories.ball.present,
      ship: histories.ship.present,
      arrow: histories.arrow.present,
    });
  }, [histories]);

  useEffect(() => {
    setActiveLayerIds((current) => {
      let changed = false;
      const nextState = { ...current };

      for (const mode of playerModes) {
        const resolvedLayerId = getResolvedLayerSelection(histories[mode].present, current[mode]).layer.id;

        if (resolvedLayerId !== current[mode]) {
          nextState[mode] = resolvedLayerId;
          changed = true;
        }
      }

      return changed ? nextState : current;
    });
  }, [histories]);

  useEffect(() => {
    setColorDraft(activeColor);
  }, [activeColor]);

  const currentHistory = histories[activeMode];
  const currentDraft = currentHistory.present;
  const currentSelection = selections[activeMode];
  const currentHoverCell = hoverCells[activeMode];
  const currentLayers = getSkinLayers(currentDraft);
  const currentLayerSelection = getResolvedLayerSelection(currentDraft, activeLayerIds[activeMode]);
  const currentLayer = currentLayerSelection.layer;
  const currentConfig = playerSkinEditorConfigs[activeMode];
  const canvasCellSize = Math.round(SKIN_CANVAS_CELL_SIZE * canvasZoom);
  const fullscreenCanvasCellSize = Math.round(SKIN_CANVAS_CELL_SIZE * fullscreenCanvasZoom);
  const previewLevelData = useMemo(() => buildSkinPreviewLevel(activeMode), [activeMode]);
  const previewSkinOverrides = useMemo<PlayerSkinRecord>(
    () => ({
      cube: histories.cube.present,
      ball: histories.ball.present,
      ship: histories.ship.present,
      arrow: histories.arrow.present,
    }),
    [histories],
  );
  const dirtyModes = useMemo(
    () =>
      playerModes.filter((mode) => serializeSkinData(histories[mode].present) !== serializeSkinData(serverDrafts[mode])),
    [histories, serverDrafts],
  );
  const isCurrentModeDirty = dirtyModes.includes(activeMode);
  const canUndo = currentHistory.past.length > 0;
  const canRedo = currentHistory.future.length > 0;
  const canAddLayer = currentLayers.length < MAX_SKIN_LAYERS;
  const activeLayerIsTop = currentLayerSelection.index === currentLayers.length - 1;
  const activeLayerIsBottom = currentLayerSelection.index === 0;
  const selectedCellCount = getSelectionCellCount(currentSelection);
  const hasSelection = selectedCellCount > 0;
  const orderedLayers = [...currentLayers].reverse();

  const pushHistoryState = (mode: PlayerMode, previousPresent: PlayerSkinData) => {
    setHistories((current) => {
      const history = current[mode];

      if (serializeSkinData(previousPresent) === serializeSkinData(history.present)) {
        return current;
      }

      return {
        ...current,
        [mode]: {
          past: [...history.past, previousPresent].slice(-MAX_HISTORY_STEPS),
          present: history.present,
          future: [],
        },
      };
    });
  };

  const replaceModePresent = (mode: PlayerMode, updater: (current: PlayerSkinData) => PlayerSkinData) => {
    setHistories((current) => {
      const history = current[mode];
      const nextPresent = normalizePlayerSkinData(updater(history.present));

      if (serializeSkinData(nextPresent) === serializeSkinData(history.present)) {
        return current;
      }

      return {
        ...current,
        [mode]: {
          ...history,
          present: nextPresent,
        },
      };
    });
  };

  const commitModeChange = (mode: PlayerMode, updater: (current: PlayerSkinData) => PlayerSkinData) => {
    setHistories((current) => {
      const history = current[mode];
      const nextPresent = normalizePlayerSkinData(updater(history.present));

      if (serializeSkinData(nextPresent) === serializeSkinData(history.present)) {
        return current;
      }

      return {
        ...current,
        [mode]: {
          past: [...history.past, history.present].slice(-MAX_HISTORY_STEPS),
          present: nextPresent,
          future: [],
        },
      };
    });
  };

  const undoMode = (mode: PlayerMode) => {
    gestureBaseRef.current[mode] = null;

    setHistories((current) => {
      const history = current[mode];

      if (!history.past.length) {
        return current;
      }

      const previousPresent = history.past[history.past.length - 1];

      return {
        ...current,
        [mode]: {
          past: history.past.slice(0, -1),
          present: previousPresent,
          future: [history.present, ...history.future],
        },
      };
    });
  };

  const redoMode = (mode: PlayerMode) => {
    gestureBaseRef.current[mode] = null;

    setHistories((current) => {
      const history = current[mode];

      if (!history.future.length) {
        return current;
      }

      const [nextPresent, ...remainingFuture] = history.future;

      return {
        ...current,
        [mode]: {
          past: [...history.past, history.present].slice(-MAX_HISTORY_STEPS),
          present: nextPresent,
          future: remainingFuture,
        },
      };
    });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: { mode: PlayerMode; data: PlayerSkinData }) =>
      apiRequest<{ skin: { mode: PlayerMode; data: PlayerSkinData } }>(`/api/player-skins/${payload.mode}`, {
        method: 'PUT',
        body: JSON.stringify({
          data: payload.data,
        }),
      }),
    onSuccess: (payload) => {
      queryClient.setQueryData<{ skins: PlayerSkinRecord }>(['player-skins'], (current) => ({
        skins: {
          ...(current?.skins ?? createEmptyPlayerSkinRecord<PlayerSkinData | null>(null)),
          [payload.skin.mode]: payload.skin.data,
        },
      }));

      setHistories((current) => ({
        ...current,
        [payload.skin.mode]: {
          ...current[payload.skin.mode],
          present: normalizePlayerSkinData(payload.skin.data),
        },
      }));
      setMessage(`${getPlayerModeLabel(payload.skin.mode)} skin saved.`);
      initializedRef.current = true;
    },
  });

  const applyActiveColor = (nextColor: string, nextTool: SkinTool = 'paint') => {
    const normalizedColor = nextColor.toUpperCase();

    if (!isHexColor(normalizedColor)) {
      return;
    }

    setActiveColor(normalizedColor);
    setColorDraft(normalizedColor);
    setTool(nextTool);
  };

  const handleCanvasGestureStart = () => {
    if (tool === 'fill' || tool === 'pick' || tool === 'select' || gestureBaseRef.current[activeMode]) {
      return;
    }

    gestureBaseRef.current[activeMode] = currentHistory.present;
  };

  const handleCanvasGestureEnd = () => {
    const gestureBase = gestureBaseRef.current[activeMode];

    if (!gestureBase) {
      return;
    }

    gestureBaseRef.current[activeMode] = null;
    pushHistoryState(activeMode, gestureBase);
  };

  const handleSelectionChange = (selection: SkinSelection | null) => {
    setSelections((current) => ({
      ...current,
      [activeMode]: selection,
    }));
  };

  const handleApplySelectionTool = (selectionTool: SkinTool) => {
    if (!currentSelection) {
      return;
    }

    commitModeChange(activeMode, (current) =>
      applyToolToSelection(current, currentLayer.id, currentSelection, selectionTool, activeColor),
    );
  };

  const handleOpenPreview = () => {
    setPreviewRunSeed((current) => current + 1);
    setIsPreviewOpen(true);
  };

  const handleOpenCanvasFullscreen = () => {
    setFullscreenCanvasZoom((current) =>
      current >= MIN_SKIN_CANVAS_ZOOM && current <= MAX_SKIN_CANVAS_ZOOM ? current : DEFAULT_FULLSCREEN_SKIN_CANVAS_ZOOM,
    );
    setIsCanvasFullscreenOpen(true);
  };

  const handleAdjustWorkspaceZoom = (delta: number) => {
    setCanvasZoom((current) => clamp(Number((current + delta).toFixed(2)), MIN_SKIN_CANVAS_ZOOM, MAX_SKIN_CANVAS_ZOOM));
  };

  const handleWorkspaceZoomChange = (value: number) => {
    setCanvasZoom(clamp(Number(value.toFixed(2)), MIN_SKIN_CANVAS_ZOOM, MAX_SKIN_CANVAS_ZOOM));
  };

  const handleAdjustFullscreenCanvasZoom = (delta: number) => {
    setFullscreenCanvasZoom((current) => clamp(Number((current + delta).toFixed(2)), MIN_SKIN_CANVAS_ZOOM, MAX_SKIN_CANVAS_ZOOM));
  };

  const handleFullscreenCanvasZoomChange = (value: number) => {
    setFullscreenCanvasZoom(clamp(Number(value.toFixed(2)), MIN_SKIN_CANVAS_ZOOM, MAX_SKIN_CANVAS_ZOOM));
  };

  const handleWorkspaceCanvasWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    event.preventDefault();
    handleAdjustWorkspaceZoom(event.deltaY < 0 ? 0.12 : -0.12);
  };

  const handleFullscreenCanvasWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    event.preventDefault();
    handleAdjustFullscreenCanvasZoom(event.deltaY < 0 ? 0.12 : -0.12);
  };

  const handleUseTool = (x: number, y: number, options?: { applySelection: boolean }) => {
    if (tool === 'select' || tool === 'pick') {
      return;
    }

    const activeLayerId = currentLayer.id;
    const shouldApplySelection = Boolean(options?.applySelection && currentSelection);

    if (shouldApplySelection && currentSelection) {
      commitModeChange(activeMode, (current) =>
        applyToolToSelection(current, activeLayerId, currentSelection, tool, activeColor),
      );
      return;
    }

    if (tool === 'fill') {
      commitModeChange(activeMode, (current) => fillLayer(current, activeLayerId, x, y, activeColor));
      return;
    }

    replaceModePresent(activeMode, (current) =>
      applyPixelToLayer(current, activeLayerId, x, y, tool === 'paint' ? activeColor : null),
    );
  };

  const handlePickColor = (x: number, y: number) => {
    const nextColor = getLayerPixelColor(currentLayer, x, y) ?? getCompositePixelColor(currentDraft, x, y);

    if (!nextColor) {
      return;
    }

    applyActiveColor(nextColor);
  };

  const handleHoverCellChange = (cell: SkinHoverCell | null) => {
    setHoverCells((current) => ({
      ...current,
      [activeMode]: cell,
    }));
  };

  const handleResetMode = () => {
    gestureBaseRef.current[activeMode] = null;
    setHistories((current) => ({
      ...current,
      [activeMode]: createHistoryState(serverDrafts[activeMode]),
    }));
    setActiveLayerIds((current) => ({
      ...current,
      [activeMode]: getSkinLayers(serverDrafts[activeMode])[0].id,
    }));
    setSelections((current) => ({
      ...current,
      [activeMode]: null,
    }));
    setHoverCells((current) => ({
      ...current,
      [activeMode]: null,
    }));
    setMessage(`${getPlayerModeLabel(activeMode)} skin reset to the last saved version.`);
  };

  const handleClearMode = () => {
    const nextDraft = createEmptyPlayerSkinData(activeMode);

    gestureBaseRef.current[activeMode] = null;
    setHistories((current) => ({
      ...current,
      [activeMode]: {
        past: [...current[activeMode].past, current[activeMode].present].slice(-MAX_HISTORY_STEPS),
        present: nextDraft,
        future: [],
      },
    }));
    setActiveLayerIds((current) => ({
      ...current,
      [activeMode]: getSkinLayers(nextDraft)[0].id,
    }));
    setSelections((current) => ({
      ...current,
      [activeMode]: null,
    }));
    setHoverCells((current) => ({
      ...current,
      [activeMode]: null,
    }));
    setMessage(`${getPlayerModeLabel(activeMode)} will fall back to the built-in look after save.`);
  };

  const handleSaveMode = async () => {
    setMessage('');

    try {
      await saveMutation.mutateAsync({
        mode: activeMode,
        data: currentDraft,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the skin.');
    }
  };

  const handleColorDraftChange = (value: string) => {
    const normalizedValue = value.toUpperCase();
    setTool('paint');
    setColorDraft(normalizedValue);

    if (isHexColor(normalizedValue)) {
      setActiveColor(normalizedValue);
    }
  };

  const handleColorDraftBlur = () => {
    setColorDraft(activeColor);
  };

  const handleAddLayer = () => {
    if (!canAddLayer) {
      return;
    }

    const nextLayer = createLayerDraft(currentLayers);

    commitModeChange(activeMode, (current) => ({
      ...current,
      layers: [...getSkinLayers(current), nextLayer],
    }));
    setActiveLayerIds((current) => ({
      ...current,
      [activeMode]: nextLayer.id,
    }));
  };

  const handleDeleteLayer = () => {
    if (currentLayers.length <= 1) {
      return;
    }

    const remainingLayers = currentLayers.filter((layer) => layer.id !== currentLayer.id);
    const nextLayerIndex = Math.max(0, Math.min(currentLayerSelection.index, remainingLayers.length - 1));

    commitModeChange(activeMode, (current) => ({
      ...current,
      layers: getSkinLayers(current).filter((layer) => layer.id !== currentLayer.id),
    }));
    setActiveLayerIds((current) => ({
      ...current,
      [activeMode]: remainingLayers[nextLayerIndex].id,
    }));
  };

  const handleMoveLayer = (direction: -1 | 1) => {
    commitModeChange(activeMode, (current) => {
      const layers = getSkinLayers(current);
      const layerIndex = layers.findIndex((layer) => layer.id === currentLayer.id);
      const nextIndex = layerIndex + direction;

      if (layerIndex < 0 || nextIndex < 0 || nextIndex >= layers.length) {
        return current;
      }

      const nextLayers = [...layers];
      [nextLayers[layerIndex], nextLayers[nextIndex]] = [nextLayers[nextIndex], nextLayers[layerIndex]];

      return {
        ...current,
        layers: nextLayers,
      };
    });
  };

  const handleRenameLayer = (name: string) => {
    replaceModePresent(activeMode, (current) => ({
      ...current,
      layers: getSkinLayers(current).map((layer) =>
        layer.id === currentLayer.id
          ? {
              ...layer,
              name,
            }
          : layer,
      ),
    }));
  };

  const handleToggleActiveLayerVisibility = () => {
    commitModeChange(activeMode, (current) => ({
      ...current,
      layers: getSkinLayers(current).map((layer) =>
        layer.id === currentLayer.id
          ? {
              ...layer,
              visible: !layer.visible,
            }
          : layer,
      ),
    }));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return;
      }

      const key = event.key.toLowerCase();
      const code = event.code;

      if (key === 'escape') {
        if (isCanvasFullscreenOpen) {
          setIsCanvasFullscreenOpen(false);
          return;
        }

        if (currentSelection) {
          event.preventDefault();
          setSelections((current) => ({
            ...current,
            [activeMode]: null,
          }));
          return;
        }

        if (tool === 'select') {
          setTool('paint');
        }

        return;
      }

      if (currentSelection && (key === 'delete' || key === 'backspace')) {
        event.preventDefault();
        commitModeChange(activeMode, (current) =>
          applyToolToSelection(current, currentLayer.id, currentSelection, 'erase', activeColor),
        );
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        if (code === 'KeyS') {
          event.preventDefault();
          setMessage('');
          void saveMutation
            .mutateAsync({
              mode: activeMode,
              data: currentDraft,
            })
            .catch((error) => {
              setMessage(error instanceof Error ? error.message : 'Could not save the skin.');
            });
          return;
        }

        if (code === 'KeyZ' && event.shiftKey) {
          event.preventDefault();
          redoMode(activeMode);
          return;
        }

        if (code === 'KeyZ') {
          event.preventDefault();
          undoMode(activeMode);
          return;
        }

        if (code === 'KeyY') {
          event.preventDefault();
          redoMode(activeMode);
        }

        return;
      }

      if (event.altKey) {
        return;
      }

      if (code === 'KeyB') {
        setTool('paint');
        return;
      }

      if (code === 'KeyE') {
        setTool('erase');
        return;
      }

      if (code === 'KeyF') {
        setTool('fill');
        return;
      }

      if (code === 'KeyV') {
        setTool('select');
        return;
      }

      if (code === 'KeyI') {
        setTool('pick');
        return;
      }

      if (code === 'Equal' || key === '+' || key === '=') {
        event.preventDefault();
        handleAdjustWorkspaceZoom(0.12);
        return;
      }

      if (code === 'Minus' || key === '-' || key === '_') {
        event.preventDefault();
        handleAdjustWorkspaceZoom(-0.12);
        return;
      }

      if (code === 'Digit0' || key === '0') {
        event.preventDefault();
        handleWorkspaceZoomChange(DEFAULT_SKIN_CANVAS_ZOOM);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeColor, activeMode, currentDraft, currentLayer.id, currentSelection, isCanvasFullscreenOpen, saveMutation, tool]);

  if (playerSkinsQuery.isLoading && !initializedRef.current) {
    return <p className="text-white/70">Loading skin studio...</p>;
  }

  return (
    <div className="w-full min-w-0 space-y-4 p-4 lg:p-5">
      <Panel className="game-screen shrink-0 bg-transparent p-0">
        <div className="space-y-6 px-6 py-6 lg:px-8 lg:py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Admin Garage</p>
              <h2 className="font-display text-4xl leading-[0.95] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-5xl">
                Skin Studio
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-white/78 md:text-base">
                Rebuilt around the actual edit loop: pick a form, keep the canvas large, switch tools from one column,
                sample colors from the sprite, and batch-paint selections without hunting across the page.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/admin">
                <Button variant="ghost">Back To Admin</Button>
              </Link>
              <Button variant="secondary" onClick={handleOpenPreview}>
                Run Preview
              </Button>
              <Button onClick={handleSaveMode} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : `Save ${getPlayerModeLabel(activeMode)}`}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Current Mode</p>
              <p className="mt-2 font-display text-2xl text-white">{getPlayerModeLabel(activeMode)}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Dirty Modes</p>
              <p className="mt-2 font-display text-2xl text-white">{dirtyModes.length}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Active Layer</p>
              <p className="mt-2 truncate font-display text-2xl text-white">{currentLayer.name}</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Selected Cells</p>
              <p className="mt-2 font-display text-2xl text-white">{selectedCellCount}</p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid items-start gap-4 xl:grid-cols-[220px_minmax(0,1fr)_300px] 2xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <Panel className="game-screen min-h-0 bg-transparent">
          <div className="space-y-5">
            <div>
              <p className="arcade-eyebrow">Mode Rack</p>
              <h3 className="font-display text-3xl text-white">Forms</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {playerModes.map((mode) => {
                const isDirty = dirtyModes.includes(mode);

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setActiveMode(mode)}
                    className={cn(
                      'rounded-[24px] border-[4px] px-4 py-4 text-left transition',
                      activeMode === mode
                        ? 'border-[#caff45] bg-[#1a3410] text-[#efffd7]'
                        : 'border-[#0f1b31] bg-[#12203c] text-white hover:border-[#335d95] hover:brightness-110',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="font-display text-lg">{getPlayerModeLabel(mode)}</strong>
                      {isDirty ? <Badge tone="accent">Unsaved</Badge> : <Badge tone="success">Saved</Badge>}
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/62">
                      {playerSkinEditorConfigs[mode].gridCols} x {playerSkinEditorConfigs[mode].gridRows}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="arcade-eyebrow">Tools</p>
                  <h4 className="font-display text-2xl text-white">{getSkinToolLabel(tool)}</h4>
                </div>
                <Badge tone="accent">{skinToolOptions.length}</Badge>
              </div>

              <div className="mt-4 grid gap-2">
                {skinToolOptions.map((option) => (
                  <button
                    key={option.tool}
                    type="button"
                    onClick={() => setTool(option.tool)}
                    className={cn(
                      'rounded-[18px] border-[3px] px-4 py-3 text-left transition',
                      tool === option.tool
                        ? option.activeVariant === 'danger'
                          ? 'border-[#ff6b9e] bg-[#361421] text-white'
                          : option.activeVariant === 'primary'
                            ? 'border-[#caff45] bg-[#1a3410] text-white'
                            : 'border-[#79f7ff] bg-[#14253d] text-white'
                        : 'border-[#152545] bg-[#0c1630] text-white/84 hover:border-[#335d95]',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-display text-xl">{option.label}</span>
                      <span className="rounded-[12px] border-[2px] border-white/12 px-2 py-1 text-xs uppercase tracking-[0.18em] text-white/64">
                        {option.hotkey}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/68">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="arcade-eyebrow">Brush Color</p>
                  <h4 className="font-display text-2xl text-white">{activeColor}</h4>
                </div>
                <span
                  className="h-12 w-12 rounded-[16px] border-[3px] border-white/18 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  style={{ backgroundColor: activeColor }}
                  aria-hidden="true"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Input
                  type="color"
                  value={activeColor}
                  onChange={(event) => applyActiveColor(event.target.value)}
                  className="h-14 w-24 cursor-pointer p-1"
                />
                <Input
                  value={colorDraft}
                  onChange={(event) => handleColorDraftChange(event.target.value)}
                  onBlur={handleColorDraftBlur}
                  className="h-14 min-w-[148px] flex-1 text-base"
                />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'h-12 rounded-[14px] border-[3px] transition',
                      activeColor === color ? 'border-white scale-[1.04]' : 'border-[#0f1b31]',
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => applyActiveColor(color)}
                    aria-label={`Use ${color}`}
                    title={color}
                  />
                ))}
              </div>

              <p className="mt-3 text-sm leading-7 text-white/68">
                `Alt + click` or the Picker tool samples a visible pixel and jumps straight back to Brush.
              </p>
            </div>

            <div className="rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="arcade-eyebrow">Selection</p>
                  <h4 className="font-display text-2xl text-white">
                    {hasSelection ? `${selectedCellCount} Cells` : 'No Box Yet'}
                  </h4>
                </div>
                <Badge tone={hasSelection ? 'accent' : 'default'}>{hasSelection ? 'Ready' : 'Idle'}</Badge>
              </div>

              <p className="mt-3 text-sm leading-7 text-white/72">
                Use Select, hold `Shift` while dragging, or right-drag if you prefer the old flow. Clicking inside an
                existing selection applies Brush or Eraser to the whole box.
              </p>

              <div className="mt-4 grid gap-2">
                <Button variant="primary" onClick={() => handleApplySelectionTool('paint')} disabled={!hasSelection}>
                  Paint Selection
                </Button>
                <Button variant="danger" onClick={() => handleApplySelectionTool('erase')} disabled={!hasSelection}>
                  Erase Selection
                </Button>
                <Button variant="ghost" onClick={() => handleSelectionChange(null)} disabled={!hasSelection}>
                  Clear Selection
                </Button>
              </div>
            </div>

            <div className="rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-5 py-5">
              <p className="arcade-eyebrow">Quick Keys</p>
              <div className="mt-3 space-y-2 text-sm leading-7 text-white/76">
                <p>`B / E / F / V / I` switches Brush, Eraser, Fill, Select, and Picker.</p>
                <p>`Ctrl/Cmd + Z`, `Ctrl/Cmd + Y`, and `Ctrl/Cmd + Shift + Z` handle undo and redo.</p>
                <p>`Ctrl/Cmd + wheel`, `+`, `-`, and `0` zoom the workbench canvas without opening fullscreen.</p>
                <p>`Delete` clears the active selection, and `Esc` clears the box or exits Select.</p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="game-screen min-h-0 bg-transparent">
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="arcade-eyebrow">Workbench</p>
                <h3 className="font-display text-4xl text-white">{getPlayerModeLabel(activeMode)} Canvas</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/72">
                  Keep the layer stack on the right, zoom directly in the main workspace, and use the hover readout to
                  see exactly which cell and color you are over before painting.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge tone={isCurrentModeDirty ? 'accent' : 'success'}>
                  {isCurrentModeDirty ? 'Unsaved Changes' : 'Saved'}
                </Badge>
                <Badge tone={currentLayer.visible ? 'success' : 'danger'}>
                  {currentLayer.visible ? 'Layer Visible' : 'Layer Hidden'}
                </Badge>
                <Badge tone="default">
                  {currentConfig.gridCols} x {currentConfig.gridRows}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="game-stat px-4 py-4">
                  <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Tool</p>
                  <p className="mt-2 font-display text-2xl text-white">{getSkinToolLabel(tool)}</p>
                </div>
                <div className="game-stat px-4 py-4">
                  <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Pixels</p>
                  <p className="mt-2 font-display text-2xl text-white">{currentDraft.pixels.length}</p>
                </div>
                <div className="game-stat px-4 py-4">
                  <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Hover Cell</p>
                  <p className="mt-2 font-display text-2xl text-white">
                    {currentHoverCell ? `${currentHoverCell.x + 1}, ${currentHoverCell.y + 1}` : 'Off Canvas'}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/56">
                    {currentHoverCell?.selected ? 'Inside Selection' : 'Free Cell'}
                  </p>
                </div>
                <div className="game-stat px-4 py-4">
                  <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Hover Color</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span
                      className={cn(
                        'h-10 w-10 rounded-[14px] border-[3px] border-white/14',
                        currentHoverCell?.compositeColor ? '' : 'bg-[linear-gradient(135deg,#0d1324,#1b2440)]',
                      )}
                      style={currentHoverCell?.compositeColor ? { backgroundColor: currentHoverCell.compositeColor } : undefined}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-display text-lg text-white">{currentHoverCell?.compositeColor ?? 'Empty'}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-white/56">
                        {currentHoverCell?.activeLayerColor ? 'Active Layer Hit' : 'Visible Stack'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border-[4px] border-[#163057] bg-[#0f1b31] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="arcade-eyebrow">Zoom</p>
                    <p className="font-display text-3xl text-white">{canvasZoom.toFixed(2)}x</p>
                  </div>
                  <Button variant="secondary" onClick={handleOpenCanvasFullscreen}>
                    Fullscreen
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button variant="ghost" onClick={() => handleAdjustWorkspaceZoom(-0.2)}>
                    -
                  </Button>
                  <input
                    type="range"
                    min={MIN_SKIN_CANVAS_ZOOM}
                    max={MAX_SKIN_CANVAS_ZOOM}
                    step="0.05"
                    value={canvasZoom}
                    onChange={(event) => handleWorkspaceZoomChange(Number(event.target.value))}
                    className="h-4 min-w-[180px] flex-1 accent-[#caff45]"
                  />
                  <Button variant="primary" onClick={() => handleAdjustWorkspaceZoom(0.2)}>
                    +
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => handleWorkspaceZoomChange(DEFAULT_SKIN_CANVAS_ZOOM)}>
                    Reset Zoom
                  </Button>
                  <Button variant="ghost" onClick={handleOpenPreview}>
                    Test Level
                  </Button>
                </div>

                <p className="mt-3 text-sm leading-7 text-white/68">
                  `Ctrl/Cmd + wheel` zooms here too, so fullscreen is optional instead of required.
                </p>
              </div>
            </div>

            <PlayerSkinPaintCanvas
              mode={activeMode}
              skinData={currentDraft}
              activeLayerId={currentLayer.id}
              tool={tool}
              selection={currentSelection}
              cellSize={canvasCellSize}
              containerClassName="min-h-[56vh]"
              onCanvasWheel={handleWorkspaceCanvasWheel}
              onUseTool={handleUseTool}
              onPickColor={handlePickColor}
              onSelectionChange={handleSelectionChange}
              onHoverCellChange={handleHoverCellChange}
              onGestureStart={handleCanvasGestureStart}
              onGestureEnd={handleCanvasGestureEnd}
            />

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => undoMode(activeMode)} disabled={!canUndo}>
                Undo
              </Button>
              <Button variant="secondary" onClick={() => redoMode(activeMode)} disabled={!canRedo}>
                Redo
              </Button>
              <Button onClick={handleSaveMode} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Mode'}
              </Button>
              <Button variant="secondary" onClick={handleResetMode} disabled={!isCurrentModeDirty}>
                Reset Mode
              </Button>
              <Button variant="ghost" onClick={handleClearMode}>
                Use Built-In
              </Button>
            </div>

            {message ? (
              <div className="rounded-[22px] border-[3px] border-[#163057] bg-[#0f1b31] px-4 py-4 text-sm leading-7 text-white/82">
                {message}
              </div>
            ) : null}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="game-screen min-h-0 bg-transparent">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="arcade-eyebrow">Layers</p>
                  <h3 className="font-display text-3xl text-white">Stack</h3>
                </div>
                <Badge tone="accent">
                  {currentLayers.length} / {MAX_SKIN_LAYERS}
                </Badge>
              </div>

              <div className="rounded-[22px] border-[3px] border-[#163057] bg-[#0f1b31] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/56">Active Layer</p>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl text-white">{currentLayer.name}</p>
                    <p className="mt-1 text-sm leading-7 text-white/68">
                      {currentLayer.pixels.length} px | {currentLayer.visible ? 'Visible in stack' : 'Hidden but still editable'}
                    </p>
                  </div>
                  <Badge tone={currentLayer.visible ? 'success' : 'danger'}>
                    {currentLayer.visible ? 'Visible' : 'Hidden'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 pr-1">
                {orderedLayers.map((layer, index) => {
                  const isActive = layer.id === currentLayer.id;
                  const stackPosition = currentLayers.length - index;

                  return (
                    <div
                      key={layer.id}
                      className={cn(
                        'flex items-center gap-2 rounded-[18px] border-[3px] px-3 py-3',
                        isActive
                          ? 'border-[#caff45] bg-[#192f12]'
                          : 'border-[#152545] bg-[#0c1630] text-white/84',
                      )}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                        onClick={() =>
                          setActiveLayerIds((current) => ({
                            ...current,
                            [activeMode]: layer.id,
                          }))
                        }
                      >
                        <div className="min-w-0">
                          <p className="truncate font-display text-xl text-white">{layer.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/56">
                            Layer {stackPosition} | {layer.pixels.length} px
                          </p>
                        </div>
                        <span className="rounded-[12px] border-[2px] border-white/10 px-2 py-1 text-xs uppercase tracking-[0.16em] text-white/62">
                          {isActive ? 'Editing' : 'Select'}
                        </span>
                      </button>

                      <button
                        type="button"
                        className={cn(
                          'rounded-[12px] border-[2px] px-3 py-2 text-sm uppercase tracking-[0.16em]',
                          layer.visible ? 'border-[#63ffbd] text-[#63ffbd]' : 'border-white/18 text-white/45',
                        )}
                        onClick={() => {
                          commitModeChange(activeMode, (current) => ({
                            ...current,
                            layers: getSkinLayers(current).map((entry) =>
                              entry.id === layer.id
                                ? {
                                    ...entry,
                                    visible: !entry.visible,
                                  }
                                : entry,
                            ),
                          }));
                        }}
                      >
                        {layer.visible ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <div>
                  <FieldLabel>Selected Layer Name</FieldLabel>
                  <Input className="h-14 text-base" value={currentLayer.name} onChange={(event) => handleRenameLayer(event.target.value)} />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="primary" onClick={handleAddLayer} disabled={!canAddLayer}>
                    Add Layer
                  </Button>
                  <Button variant="secondary" onClick={() => handleMoveLayer(1)} disabled={activeLayerIsTop}>
                    Move Up
                  </Button>
                  <Button variant="secondary" onClick={() => handleMoveLayer(-1)} disabled={activeLayerIsBottom}>
                    Move Down
                  </Button>
                  <Button variant="ghost" onClick={handleToggleActiveLayerVisibility}>
                    {currentLayer.visible ? 'Hide Layer' : 'Show Layer'}
                  </Button>
                  <Button variant="danger" onClick={handleDeleteLayer} disabled={currentLayers.length <= 1} className="sm:col-span-2">
                    Delete Layer
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="game-screen bg-transparent">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="arcade-eyebrow">Preview Lab</p>
                  <h3 className="font-display text-3xl text-white">Live Checks</h3>
                </div>
                <Badge tone="accent">{currentDraft.pixels.length} px</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-4 py-4 text-center">
                  <p className="text-sm uppercase tracking-[0.18em] text-white/56">Sprite</p>
                  <div className="mt-4 flex justify-center">
                    <PlayerModelCanvas
                      mode={activeMode}
                      width={220}
                      height={220}
                      skinOverride={currentDraft}
                      className="rounded-[20px] bg-[#09101e]"
                    />
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/68">Unsaved edits render here immediately.</p>
                </div>

                <div className="rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-4 py-4 text-center">
                  <p className="text-sm uppercase tracking-[0.18em] text-white/56">Hitbox</p>
                  <div className="mt-4 flex justify-center">
                    <PlayerModelCanvas
                      mode={activeMode}
                      width={220}
                      height={220}
                      skinOverride={currentDraft}
                      showHitboxOverlay
                      className="rounded-[20px] bg-[#09101e]"
                    />
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/68">Yellow is contact. Cyan dashed is the solid core.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleOpenPreview}>Run Test Level</Button>
                <Button variant="secondary" onClick={handleOpenCanvasFullscreen}>
                  Fullscreen Canvas
                </Button>
              </div>

              <div className="rounded-[22px] border-[3px] border-[#163057] bg-[#0f1b31] px-4 py-4">
                <p className="arcade-eyebrow">Notes</p>
                <div className="mt-3 space-y-2 text-sm leading-7 text-white/76">
                  <p>Fill and erase operate on the active layer only, so the stack stays predictable.</p>
                  <p>Hidden active layers stay ghosted in the editor, which makes alignment easier while still showing intent.</p>
                  <p>The runtime preview always uses the current draft, so you can test before pressing Save.</p>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {isCanvasFullscreenOpen ? (
        <div
          className="fixed inset-0 z-[75] bg-[rgba(4,8,20,0.88)] p-4 backdrop-blur-[8px] md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen skin canvas"
          onClick={() => setIsCanvasFullscreenOpen(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-[1800px] flex-col rounded-[32px] border-[4px] border-[#163057] bg-[linear-gradient(180deg,rgba(43,20,80,0.98),rgba(10,17,34,0.98))] shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-white/10 px-5 py-4 md:px-7 md:py-5">
              <div>
                <p className="arcade-eyebrow">Canvas Focus</p>
                <h3 className="font-display text-3xl text-white md:text-4xl">
                  {getPlayerModeLabel(activeMode)} Fullscreen Canvas
                </h3>
                <p className="mt-2 text-sm leading-7 text-white/72 md:text-base">
                  Draw on the full workspace, use Select or `Shift + drag` to box-select, `Alt + click` to sample
                  colors, and `Ctrl/Cmd + wheel` to zoom.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-[20px] border-[3px] border-[#163057] bg-[#0e1d36] px-4 py-3 text-sm uppercase tracking-[0.16em] text-white/86">
                  Zoom {fullscreenCanvasZoom.toFixed(2)}x
                </div>
                <Button className="min-h-[50px] px-5 text-sm" variant="ghost" onClick={() => handleAdjustFullscreenCanvasZoom(-0.2)}>
                  -
                </Button>
                <input
                  type="range"
                  min={MIN_SKIN_CANVAS_ZOOM}
                  max={MAX_SKIN_CANVAS_ZOOM}
                  step="0.05"
                  value={fullscreenCanvasZoom}
                  onChange={(event) => handleFullscreenCanvasZoomChange(Number(event.target.value))}
                  className="h-4 w-[220px] accent-[#caff45]"
                />
                <Button className="min-h-[50px] px-5 text-sm" variant="secondary" onClick={() => handleFullscreenCanvasZoomChange(DEFAULT_FULLSCREEN_SKIN_CANVAS_ZOOM)}>
                  Reset Zoom
                </Button>
                <Button className="min-h-[50px] px-5 text-sm" variant="primary" onClick={() => handleAdjustFullscreenCanvasZoom(0.2)}>
                  +
                </Button>
                <Button className="min-h-[50px] px-5 text-sm" variant="danger" onClick={() => setIsCanvasFullscreenOpen(false)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 px-4 pb-4 pt-4 md:px-6 md:pb-6">
              <PlayerSkinPaintCanvas
                mode={activeMode}
                skinData={currentDraft}
                activeLayerId={currentLayer.id}
                tool={tool}
                selection={currentSelection}
                cellSize={fullscreenCanvasCellSize}
                containerClassName="h-full min-h-0 p-4 md:p-5"
                canvasClassName="rounded-[22px]"
                onCanvasWheel={handleFullscreenCanvasWheel}
                onUseTool={handleUseTool}
                onPickColor={handlePickColor}
                onSelectionChange={handleSelectionChange}
                onHoverCellChange={handleHoverCellChange}
                onGestureStart={handleCanvasGestureStart}
                onGestureEnd={handleCanvasGestureEnd}
              />
            </div>
          </div>
        </div>
      ) : null}

      {isPreviewOpen ? (
        <div className="gd-draft-view-preview-shell" role="dialog" aria-modal="true" aria-label="Skin preview run">
          <div className="gd-draft-view-preview-actions" aria-label="Preview controls">
            <button
              type="button"
              className="gd-draft-view-preview-action"
              onClick={handleOpenPreview}
              aria-label="Restart preview"
              title="Restart preview"
            >
              Restart
            </button>
            <button
              type="button"
              className="gd-draft-view-preview-action gd-draft-view-preview-action--close"
              onClick={() => setIsPreviewOpen(false)}
              aria-label="Close preview"
              title="Close preview"
            >
              Close
            </button>
          </div>
          <GameCanvas
            key={`skin-preview-${activeMode}-${previewRunSeed}`}
            levelData={previewLevelData}
            attemptNumber={1}
            runId={`skin-preview-${activeMode}-${previewRunSeed}`}
            autoRestartOnFail
            fullscreen
            className="gd-draft-view-preview-fullscreen"
            playerSkinOverrides={previewSkinOverrides}
            onExitToMenu={() => setIsPreviewOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
