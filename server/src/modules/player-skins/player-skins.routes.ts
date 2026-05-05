import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { createRateLimit } from '../../middleware/rate-limit';
import { asyncHandler } from '../../utils/async-handler';
import { getSingleParam } from '../../utils/request-param';
import { playerSkinsService } from './player-skins.service';
import { playerSkinModeSchema, upsertPlayerSkinSchema } from './player-skins.schemas';

export const playerSkinsRouter = Router();

const playerSkinWriteRateLimit = createRateLimit({
  keyPrefix: 'player-skins:write',
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many skin changes. Slow down and try again.',
});

playerSkinsRouter.get(
  '/',
  asyncHandler(async (_request, response) => {
    const skins = await playerSkinsService.list();
    response.json({ skins });
  }),
);

playerSkinsRouter.put(
  '/:mode',
  requireAuth,
  requireRole('ADMIN'),
  playerSkinWriteRateLimit,
  asyncHandler(async (request, response) => {
    const mode = playerSkinModeSchema.parse(getSingleParam(request.params.mode, 'mode'));
    const payload = upsertPlayerSkinSchema.parse(request.body);
    const skin = await playerSkinsService.upsert(mode, payload.data);

    response.json({ skin });
  }),
);
