import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/async-handler';
import { getSingleParam } from '../../utils/request-param';
import { failSessionSchema, finishSessionSchema, startSessionSchema } from './game.schemas';
import { gameService } from './game.service';

export const gameRouter = Router();

gameRouter.post(
  '/sessions/start',
  requireAuth,
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
