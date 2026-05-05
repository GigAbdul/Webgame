import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { createRateLimit } from '../../middleware/rate-limit';
import { asyncHandler } from '../../utils/async-handler';
import { getSingleParam } from '../../utils/request-param';
import { failSessionSchema, finishSessionSchema, startSessionSchema } from './game.schemas';
import { gameService } from './game.service';

export const gameRouter = Router();

const gameSessionRateLimit = createRateLimit({
  keyPrefix: 'game:sessions',
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many game session updates. Slow down and try again.',
});

gameRouter.post(
  '/sessions/start',
  requireAuth,
  gameSessionRateLimit,
  asyncHandler(async (request, response) => {
    const payload = startSessionSchema.parse(request.body);
    const session = await gameService.startSession(
      request.authUser!.id,
      payload.levelId,
      payload.clientVersion,
    );

    response.status(201).json({ session });
  }),
);

gameRouter.post(
  '/sessions/:sessionId/fail',
  requireAuth,
  gameSessionRateLimit,
  asyncHandler(async (request, response) => {
    const payload = failSessionSchema.parse(request.body);
    const session = await gameService.failSession(
      request.authUser!.id,
      getSingleParam(request.params.sessionId, 'sessionId'),
      payload.progressPercent,
    );
    response.json({ session });
  }),
);

gameRouter.post(
  '/sessions/:sessionId/complete',
  requireAuth,
  gameSessionRateLimit,
  asyncHandler(async (request, response) => {
    const payload = finishSessionSchema.parse(request.body);
    const result = await gameService.completeSession(
      request.authUser!.id,
      getSingleParam(request.params.sessionId, 'sessionId'),
      payload.progressPercent,
      payload.completionTimeMs,
    );
    response.json(result);
  }),
);
