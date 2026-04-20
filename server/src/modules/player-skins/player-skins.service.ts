import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import {
  createEmptyPlayerSkinRecord,
  fromPlayerSkinModeDb,
  playerSkinDataSchema,
  type PlayerSkinDataInput,
  type PlayerSkinModeDb,
  type PublicPlayerSkinMode,
  toPlayerSkinModeDb,
} from './player-skins.schemas';

type PlayerSkinRow = {
  mode: PlayerSkinModeDb;
  dataJson: unknown;
};

function getDefaultPlayerSkinName(mode: PublicPlayerSkinMode) {
  if (mode === 'ship') {
    return 'Ship Skin';
  }

  if (mode === 'arrow') {
    return 'Arrow Skin';
  }

  return mode === 'ball' ? 'Ball Skin' : 'Cube Skin';
}

function normalizePlayerSkinName(name: string | undefined, mode: PublicPlayerSkinMode) {
  const trimmedName = name?.trim();

  if (trimmedName) {
    return trimmedName.slice(0, 64);
  }

  return getDefaultPlayerSkinName(mode);
}

async function hasPlayerSkinStorage() {
  const [result] = await prisma.$queryRaw<Array<{ name: string | null }>>`
    SELECT CAST(to_regclass('public."PlayerSkin"') AS text) AS name
  `;

  return Boolean(result?.name);
}

function isMissingPlayerSkinStorage(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2010' ||
      error.code === 'P2021' ||
      error.meta?.code === '42P01' ||
      error.meta?.code === '42704')
  );
}

function parseStoredPlayerSkinData(dataJson: unknown, mode: PublicPlayerSkinMode) {
  return normalizePlayerSkinData(playerSkinDataSchema.parse(dataJson), mode);
}

function normalizePlayerSkinData(input: PlayerSkinDataInput, mode: PublicPlayerSkinMode): PlayerSkinDataInput {
  const gridCols = input.gridCols;
  const gridRows = input.gridRows;
  const normalizedLayers = normalizeLayers(input.layers, gridCols, gridRows);
  const fallbackPixels = normalizePixels(input.pixels, gridCols, gridRows);
  const pixels =
    normalizedLayers.length > 0 ? flattenVisibleLayerPixels(normalizedLayers, gridCols, gridRows) : fallbackPixels;

  return {
    name: normalizePlayerSkinName(input.name, mode),
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
    const mapped = createEmptyPlayerSkinRecord<PlayerSkinDataInput | null>(null);

    if (!(await hasPlayerSkinStorage())) {
      return mapped;
    }

    let skins: PlayerSkinRow[] = [];

    try {
      skins = await prisma.$queryRaw<PlayerSkinRow[]>`
        SELECT "mode", "dataJson"
        FROM "PlayerSkin"
        ORDER BY "mode" ASC
      `;
    } catch (error) {
      if (isMissingPlayerSkinStorage(error)) {
        return mapped;
      }

      throw error;
    }

    for (const skin of skins) {
      mapped[fromPlayerSkinModeDb(skin.mode)] = parseStoredPlayerSkinData(skin.dataJson, fromPlayerSkinModeDb(skin.mode));
    }

    return mapped;
  },

  async upsert(mode: PublicPlayerSkinMode, data: PlayerSkinDataInput) {
    if (!(await hasPlayerSkinStorage())) {
      throw new ApiError(503, 'Player skin storage is not ready yet. Apply the latest Prisma migration.');
    }

    const normalizedData = normalizePlayerSkinData(data, mode);
    const id = crypto.randomUUID();
    const now = new Date();
    const dbMode = toPlayerSkinModeDb(mode);
    const serializedData = JSON.stringify(normalizedData);
    let skin: PlayerSkinRow | undefined;

    try {
      [skin] = await prisma.$queryRaw<PlayerSkinRow[]>`
        INSERT INTO "PlayerSkin" ("id", "mode", "dataJson", "createdAt", "updatedAt")
        VALUES (
          ${id},
          CAST(${dbMode} AS "PlayerSkinMode"),
          CAST(${serializedData} AS jsonb),
          ${now},
          ${now}
        )
        ON CONFLICT ("mode")
        DO UPDATE SET
          "dataJson" = EXCLUDED."dataJson",
          "updatedAt" = EXCLUDED."updatedAt"
        RETURNING "mode", "dataJson"
      `;
    } catch (error) {
      if (isMissingPlayerSkinStorage(error)) {
        throw new ApiError(503, 'Player skin storage is not ready yet. Apply the latest Prisma migration.');
      }

      throw error;
    }

    if (!skin) {
      throw new ApiError(500, 'Player skin upsert did not return a stored record');
    }

    return {
      mode: fromPlayerSkinModeDb(skin.mode),
      data: parseStoredPlayerSkinData(skin.dataJson, fromPlayerSkinModeDb(skin.mode)),
    };
  },
};
