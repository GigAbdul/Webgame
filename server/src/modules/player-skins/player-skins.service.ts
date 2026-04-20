import { prisma } from '../../lib/prisma';
import {
  createEmptyPlayerSkinRecord,
  fromPlayerSkinModeDb,
  type PlayerSkinDataInput,
  type PlayerSkinModeDb,
  type PublicPlayerSkinMode,
  toPlayerSkinModeDb,
} from './player-skins.schemas';

const playerSkinClient = prisma as unknown as {
  playerSkin: {
    findMany(args: { orderBy: { mode: 'asc' | 'desc' } }): Promise<
      Array<{
        mode: PlayerSkinModeDb;
        dataJson: unknown;
      }>
    >;
    upsert(args: {
      where: { mode: PlayerSkinModeDb };
      update: { dataJson: PlayerSkinDataInput };
      create: { mode: PlayerSkinModeDb; dataJson: PlayerSkinDataInput };
    }): Promise<{
      mode: PlayerSkinModeDb;
      dataJson: unknown;
    }>;
  };
};

function normalizePlayerSkinData(input: PlayerSkinDataInput): PlayerSkinDataInput {
  const gridCols = input.gridCols;
  const gridRows = input.gridRows;
  const normalizedLayers = normalizeLayers(input.layers, gridCols, gridRows);
  const fallbackPixels = normalizePixels(input.pixels, gridCols, gridRows);
  const pixels =
    normalizedLayers.length > 0 ? flattenVisibleLayerPixels(normalizedLayers, gridCols, gridRows) : fallbackPixels;

  return {
    gridCols,
    gridRows,
    pixels,
    layers: normalizedLayers.length > 0 ? normalizedLayers : undefined,
  };
}

type PlayerSkinLayerInput = NonNullable<PlayerSkinDataInput['layers']>[number];

function normalizePixels(
  pixels: PlayerSkinDataInput['pixels'],
  gridCols: number,
  gridRows: number,
) {
  const dedupedPixels = new Map<string, PlayerSkinDataInput['pixels'][number]>();

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
  layers: PlayerSkinDataInput['layers'],
  gridCols: number,
  gridRows: number,
): PlayerSkinLayerInput[] {
  if (!layers?.length) {
    return [];
  }

  const seenIds = new Set<string>();
  const normalizedLayers: PlayerSkinLayerInput[] = [];

  for (const layer of layers) {
    const baseId = layer.id.trim() || `layer-${normalizedLayers.length + 1}`;
    let layerId = baseId;
    let suffix = 1;

    while (seenIds.has(layerId)) {
      suffix += 1;
      layerId = `${baseId}-${suffix}`;
    }

    seenIds.add(layerId);
    normalizedLayers.push({
      id: layerId,
      name: layer.name.trim() || `Layer ${normalizedLayers.length + 1}`,
      visible: layer.visible,
      pixels: normalizePixels(layer.pixels, gridCols, gridRows),
    });
  }

  return normalizedLayers;
}

function flattenVisibleLayerPixels(
  layers: PlayerSkinLayerInput[],
  gridCols: number,
  gridRows: number,
) {
  const flattenedPixels = new Map<string, PlayerSkinDataInput['pixels'][number]>();

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

export const playerSkinsService = {
  async list() {
    const skins = await playerSkinClient.playerSkin.findMany({
      orderBy: { mode: 'asc' },
    });

    const mapped = createEmptyPlayerSkinRecord<PlayerSkinDataInput | null>(null);

    for (const skin of skins) {
      mapped[fromPlayerSkinModeDb(skin.mode)] = normalizePlayerSkinData(skin.dataJson as PlayerSkinDataInput);
    }

    return mapped;
  },

  async upsert(mode: PublicPlayerSkinMode, data: PlayerSkinDataInput) {
    const normalizedData = normalizePlayerSkinData(data);

    const skin = await playerSkinClient.playerSkin.upsert({
      where: {
        mode: toPlayerSkinModeDb(mode),
      },
      update: {
        dataJson: normalizedData,
      },
      create: {
        mode: toPlayerSkinModeDb(mode),
        dataJson: normalizedData,
      },
    });

    return {
      mode: fromPlayerSkinModeDb(skin.mode),
      data: skin.dataJson as PlayerSkinDataInput,
    };
  },
};
