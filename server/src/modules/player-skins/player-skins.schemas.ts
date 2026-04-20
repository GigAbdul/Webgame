import { z } from 'zod';

export const playerSkinModeValues = ['cube', 'ball', 'ship', 'arrow'] as const;
export const playerSkinModeSchema = z.enum(playerSkinModeValues);

export type PublicPlayerSkinMode = z.infer<typeof playerSkinModeSchema>;
export type PlayerSkinModeDb = 'CUBE' | 'BALL' | 'SHIP' | 'ARROW';

const playerSkinColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex value');

export const playerSkinPixelSchema = z.object({
  x: z.number().int().min(0).max(63),
  y: z.number().int().min(0).max(63),
  color: playerSkinColorSchema,
});

export const playerSkinLayerSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  visible: z.boolean().default(true),
  pixels: z.array(playerSkinPixelSchema).max(4096).default([]),
});

export const playerSkinDataSchema = z.object({
  name: z.string().trim().min(1).max(64).optional(),
  gridCols: z.number().int().min(8).max(64),
  gridRows: z.number().int().min(8).max(64),
  pixels: z.array(playerSkinPixelSchema).max(4096).default([]),
  layers: z.array(playerSkinLayerSchema).max(32).optional(),
});

export type PlayerSkinDataInput = z.infer<typeof playerSkinDataSchema>;

export const upsertPlayerSkinSchema = z.object({
  data: playerSkinDataSchema,
});

export function toPlayerSkinModeDb(mode: PublicPlayerSkinMode): PlayerSkinModeDb {
  return mode.toUpperCase() as PlayerSkinModeDb;
}

export function fromPlayerSkinModeDb(mode: PlayerSkinModeDb): PublicPlayerSkinMode {
  return mode.toLowerCase() as PublicPlayerSkinMode;
}

export function createEmptyPlayerSkinRecord<T>(fallback: T) {
  return {
    cube: fallback,
    ball: fallback,
    ship: fallback,
    arrow: fallback,
  } satisfies Record<PublicPlayerSkinMode, T>;
}
