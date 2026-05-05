import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/api';
import type { PlayerMode, PlayerSkinData, PlayerSkinLayer, PlayerSkinRecord } from '../../types/models';
import { getPlayerModeLabel } from './player-mode-config';
import { PLAYER_HITBOX_SIZE, getPlayerHitboxLayout } from './player-physics';

export type PlayerSkinEditorConfig = {
  gridCols: number;
  gridRows: number;
};

export const playerSkinEditorConfigs: Record<PlayerMode, PlayerSkinEditorConfig> = {
  cube: { gridCols: 24, gridRows: 24 },
  ball: { gridCols: 24, gridRows: 24 },
  ship: { gridCols: 32, gridRows: 24 },
  arrow: { gridCols: 32, gridRows: 24 },
};

export function createDefaultPlayerSkinName(mode: PlayerMode) {
  return `${getPlayerModeLabel(mode)} Skin`;
}

function normalizePlayerSkinName(name: string | undefined, mode?: PlayerMode) {
  const trimmedName = name?.trim();

  if (trimmedName) {
    return trimmedName.slice(0, 64);
  }

  return mode ? createDefaultPlayerSkinName(mode) : 'Player Skin';
}

function normalizePixels(
  pixels: PlayerSkinData['pixels'],
  gridCols: number,
  gridRows: number,
) {
  const dedupedPixels = new Map<string, PlayerSkinData['pixels'][number]>();

  for (const pixel of pixels) {
    if (pixel.x < 0 || pixel.y < 0 || pixel.x >= gridCols || pixel.y >= gridRows) {
      continue;
    }

    dedupedPixels.set(`${pixel.x}:${pixel.y}`, {
      x: pixel.x,
      y: pixel.y,
      color: pixel.color.toUpperCase(),
    });
  }

  return Array.from(dedupedPixels.values()).sort((left, right) =>
    left.y === right.y ? left.x - right.x : left.y - right.y,
  );
}

function normalizeLayers(
  layers: PlayerSkinData['layers'],
  gridCols: number,
  gridRows: number,
) {
  if (!layers?.length) {
    return [];
  }

  const seenIds = new Set<string>();
  const normalizedLayers: PlayerSkinLayer[] = [];

  for (const layer of layers) {
    const trimmedId = layer.id.trim();
    const baseId = trimmedId || `layer-${normalizedLayers.length + 1}`;
    let nextId = baseId;
    let suffix = 1;

    while (seenIds.has(nextId)) {
      suffix += 1;
      nextId = `${baseId}-${suffix}`;
    }

    seenIds.add(nextId);
    normalizedLayers.push({
      id: nextId,
      name: layer.name.trim() || `Layer ${normalizedLayers.length + 1}`,
      visible: layer.visible,
      pixels: normalizePixels(layer.pixels, gridCols, gridRows),
    });
  }

  return normalizedLayers;
}

function flattenVisibleLayerPixels(
  layers: PlayerSkinLayer[],
  gridCols: number,
  gridRows: number,
) {
  const flattenedPixels = new Map<string, PlayerSkinData['pixels'][number]>();

  for (const layer of layers) {
    if (!layer.visible) {
      continue;
    }

    for (const pixel of layer.pixels) {
      if (pixel.x < 0 || pixel.y < 0 || pixel.x >= gridCols || pixel.y >= gridRows) {
        continue;
      }

      flattenedPixels.set(`${pixel.x}:${pixel.y}`, {
        x: pixel.x,
        y: pixel.y,
        color: pixel.color.toUpperCase(),
      });
    }
  }

  return Array.from(flattenedPixels.values()).sort((left, right) =>
    left.y === right.y ? left.x - right.x : left.y - right.y,
  );
}

export function createPlayerSkinLayer(id = 'base', name = 'Base'): PlayerSkinLayer {
  return {
    id,
    name,
    visible: true,
    pixels: [],
  };
}

export function createEmptyPlayerSkinData(mode: PlayerMode): PlayerSkinData {
  const config = playerSkinEditorConfigs[mode];

  return {
    name: createDefaultPlayerSkinName(mode),
    gridCols: config.gridCols,
    gridRows: config.gridRows,
    pixels: [],
    layers: [createPlayerSkinLayer()],
  };
}

export function createEmptyPlayerSkinRecord<T>(fallback: T) {
  return {
    cube: fallback,
    ball: fallback,
    ship: fallback,
    arrow: fallback,
  } satisfies Record<PlayerMode, T>;
}

export function normalizePlayerSkinData(input: PlayerSkinData, mode?: PlayerMode): PlayerSkinData {
  const normalizedLayers = normalizeLayers(input.layers, input.gridCols, input.gridRows);
  const fallbackPixels = normalizePixels(input.pixels, input.gridCols, input.gridRows);
  const layers =
    normalizedLayers.length > 0
      ? normalizedLayers
      : [
          {
            ...createPlayerSkinLayer(),
            pixels: fallbackPixels,
          },
        ];
  const pixels = flattenVisibleLayerPixels(layers, input.gridCols, input.gridRows);

  return {
    name: normalizePlayerSkinName(input.name, mode),
    gridCols: input.gridCols,
    gridRows: input.gridRows,
    pixels,
    layers,
  };
}

export function usePlayerSkinsQuery() {
  return useQuery({
    queryKey: ['player-skins'],
    queryFn: () => apiRequest<{ skins: PlayerSkinRecord }>('/api/player-skins'),
    staleTime: 1000 * 30,
  });
}

export function drawPlayerModelSprite(
  context: CanvasRenderingContext2D,
  mode: PlayerMode,
  width: number,
  height: number,
  options: {
    skinData?: PlayerSkinData | null;
    showHitboxOverlay?: boolean;
  } = {},
) {
  if (options.skinData && options.skinData.pixels.length > 0) {
    drawPlayerSkinPixels(context, options.skinData, width, height);
  } else {
    drawBuiltInPlayerModel(context, mode, width, height);
  }

  if (options.showHitboxOverlay) {
    drawPlayerHitboxOverlay(context, mode, width, height);
  }
}

function drawPlayerSkinPixels(
  context: CanvasRenderingContext2D,
  skinData: PlayerSkinData,
  width: number,
  height: number,
) {
  const cellWidth = width / skinData.gridCols;
  const cellHeight = height / skinData.gridRows;
  const startX = -width / 2;
  const startY = -height / 2;

  context.save();
  context.imageSmoothingEnabled = false;

  for (const pixel of skinData.pixels) {
    context.fillStyle = pixel.color;
    context.fillRect(
      startX + pixel.x * cellWidth,
      startY + pixel.y * cellHeight,
      Math.ceil(cellWidth + 0.5),
      Math.ceil(cellHeight + 0.5),
    );
  }

  context.restore();
}

function drawPlayerHitboxOverlay(
  context: CanvasRenderingContext2D,
  mode: PlayerMode,
  width: number,
  height: number,
) {
  const contactLayout = getPlayerHitboxLayout(mode, 'contact');
  const solidLayout = getPlayerHitboxLayout(mode, 'solid');
  const scaleX = width / PLAYER_HITBOX_SIZE;
  const scaleY = height / PLAYER_HITBOX_SIZE;

  context.save();
  context.strokeStyle = 'rgba(255, 212, 74, 0.95)';
  context.lineWidth = Math.max(1.25, Math.min(width, height) * 0.03);
  context.strokeRect(
    -width / 2 + contactLayout.offsetX * scaleX,
    -height / 2 + contactLayout.offsetY * scaleY,
    contactLayout.width * scaleX,
    contactLayout.height * scaleY,
  );

  context.strokeStyle = 'rgba(71, 232, 255, 0.92)';
  context.lineWidth = Math.max(1, Math.min(width, height) * 0.02);
  context.setLineDash([6, 4]);
  context.strokeRect(
    -width / 2 + solidLayout.offsetX * scaleX,
    -height / 2 + solidLayout.offsetY * scaleY,
    solidLayout.width * scaleX,
    solidLayout.height * scaleY,
  );
  context.restore();
}

function drawBuiltInPlayerModel(
  context: CanvasRenderingContext2D,
  mode: PlayerMode,
  width: number,
  height: number,
) {
  if (mode === 'ship') {
    const bodyLength = width * 0.84;
    const bodyHeight = height * 0.54;
    const halfLength = bodyLength / 2;
    const halfHeight = bodyHeight / 2;
    const cubeSize = Math.min(width, height) * 0.3;

    context.fillStyle = '#101a2a';
    context.beginPath();
    context.moveTo(halfLength, 0);
    context.lineTo(halfLength * 0.18, -halfHeight);
    context.lineTo(-halfLength * 0.9, -halfHeight * 0.9);
    context.lineTo(-halfLength, 0);
    context.lineTo(-halfLength * 0.9, halfHeight * 0.9);
    context.lineTo(halfLength * 0.18, halfHeight);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.beginPath();
    context.moveTo(halfLength * 0.94, 0);
    context.lineTo(halfLength * 0.14, -halfHeight * 0.94);
    context.lineTo(-halfLength * 0.74, -halfHeight * 0.76);
    context.lineTo(-halfLength * 0.88, 0);
    context.lineTo(-halfLength * 0.74, halfHeight * 0.76);
    context.lineTo(halfLength * 0.14, halfHeight * 0.94);
    context.closePath();
    context.fill();
    context.strokeStyle = '#182133';
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = '#67ff9f';
    context.beginPath();
    context.moveTo(-halfLength * 0.2, 0);
    context.lineTo(halfLength * 0.46, -halfHeight * 0.6);
    context.lineTo(halfLength * 0.16, 0);
    context.lineTo(halfLength * 0.46, halfHeight * 0.6);
    context.closePath();
    context.fill();

    context.fillStyle = '#dffcff';
    context.beginPath();
    context.moveTo(halfLength * 0.2, 0);
    context.lineTo(-halfLength * 0.12, -halfHeight * 0.42);
    context.lineTo(-halfLength * 0.34, 0);
    context.lineTo(-halfLength * 0.12, halfHeight * 0.42);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.fillRect(-halfLength * 0.64, -cubeSize / 2, cubeSize, cubeSize);
    context.strokeStyle = '#182133';
    context.lineWidth = 2.5;
    context.strokeRect(-halfLength * 0.64, -cubeSize / 2, cubeSize, cubeSize);

    context.fillStyle = '#182133';
    context.fillRect(-halfLength * 0.56, -cubeSize * 0.2, cubeSize * 0.12, cubeSize * 0.12);
    context.fillRect(-halfLength * 0.42, -cubeSize * 0.2, cubeSize * 0.12, cubeSize * 0.12);
    context.fillRect(-halfLength * 0.56, cubeSize * 0.12, cubeSize * 0.26, cubeSize * 0.08);

    context.fillStyle = '#79f7ff';
    context.fillRect(-halfLength * 0.06, -cubeSize * 0.24, cubeSize * 0.2, cubeSize * 0.48);
    return;
  }

  if (mode === 'arrow') {
    const bodyLength = width * 0.94;
    const bodyHeight = height * 0.58;
    const halfLength = bodyLength / 2;
    const halfHeight = bodyHeight / 2;
    const cockpitSize = Math.min(width, height) * 0.24;

    context.fillStyle = '#132339';
    context.beginPath();
    context.moveTo(-halfLength * 0.9, 0);
    context.lineTo(-halfLength * 0.18, -halfHeight);
    context.lineTo(halfLength, 0);
    context.lineTo(-halfLength * 0.18, halfHeight);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.beginPath();
    context.moveTo(-halfLength * 0.76, 0);
    context.lineTo(-halfLength * 0.08, -halfHeight * 0.88);
    context.lineTo(halfLength * 0.92, 0);
    context.lineTo(-halfLength * 0.08, halfHeight * 0.88);
    context.closePath();
    context.fill();
    context.strokeStyle = '#182133';
    context.lineWidth = 2.6;
    context.stroke();

    context.fillStyle = '#63ffbd';
    context.beginPath();
    context.moveTo(-halfLength * 0.06, -halfHeight * 0.54);
    context.lineTo(halfLength * 0.3, 0);
    context.lineTo(-halfLength * 0.06, halfHeight * 0.54);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.fillRect(-halfLength * 0.54, -cockpitSize / 2, cockpitSize, cockpitSize);
    context.strokeStyle = '#182133';
    context.lineWidth = 2;
    context.strokeRect(-halfLength * 0.54, -cockpitSize / 2, cockpitSize, cockpitSize);
    context.fillStyle = '#182133';
    context.fillRect(-halfLength * 0.48, -cockpitSize * 0.2, cockpitSize * 0.1, cockpitSize * 0.1);
    context.fillRect(-halfLength * 0.36, -cockpitSize * 0.2, cockpitSize * 0.1, cockpitSize * 0.1);
    context.fillRect(-halfLength * 0.48, cockpitSize * 0.12, cockpitSize * 0.22, cockpitSize * 0.07);
    return;
  }

  if (mode === 'ball') {
    const radius = Math.min(width, height) * 0.48;

    context.fillStyle = '#132339';
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.beginPath();
    context.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = '#182133';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = '#ffd95e';
    context.beginPath();
    context.arc(0, 0, radius * 0.54, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = '#182133';
    context.lineWidth = 2.4;
    context.beginPath();
    context.arc(0, 0, radius * 0.54, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = '#63ffbd';
    context.beginPath();
    context.moveTo(-radius * 0.02, -radius * 0.68);
    context.lineTo(radius * 0.46, -radius * 0.12);
    context.lineTo(radius * 0.02, radius * 0.02);
    context.lineTo(radius * 0.58, radius * 0.54);
    context.lineTo(radius * 0.08, radius * 0.18);
    context.lineTo(-radius * 0.46, radius * 0.68);
    context.lineTo(-radius * 0.02, radius * 0.12);
    context.lineTo(-radius * 0.58, -radius * 0.42);
    context.closePath();
    context.fill();

    context.strokeStyle = 'rgba(24,33,51,0.72)';
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(-radius * 0.78, 0);
    context.lineTo(radius * 0.78, 0);
    context.moveTo(0, -radius * 0.78);
    context.lineTo(0, radius * 0.78);
    context.stroke();

    context.fillStyle = '#182133';
    context.fillRect(-radius * 0.34, -radius * 0.18, radius * 0.14, radius * 0.14);
    context.fillRect(radius * 0.08, -radius * 0.18, radius * 0.14, radius * 0.14);
    context.fillRect(-radius * 0.24, radius * 0.18, radius * 0.44, radius * 0.08);
    return;
  }

  context.fillStyle = '#f4f7ff';
  context.fillRect(-width / 2, -height / 2, width, height);
  context.strokeStyle = '#182133';
  context.lineWidth = 3;
  context.strokeRect(-width / 2, -height / 2, width, height);

  context.fillStyle = '#182133';
  context.fillRect(-width * 0.18, -height * 0.18, width * 0.12, height * 0.12);
  context.fillRect(width * 0.06, -height * 0.18, width * 0.12, height * 0.12);
  context.fillRect(-width * 0.18, height * 0.12, width * 0.36, height * 0.08);
}
