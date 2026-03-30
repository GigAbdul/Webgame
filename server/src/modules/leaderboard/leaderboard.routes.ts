import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/async-handler';
import { leaderboardService } from './leaderboard.service';

export const leaderboardRouter = Router();

leaderboardRouter.get(
  '/',
  asyncHandler(async (_request, response) => {
    const leaderboard = await leaderboardService.getLeaderboard();
    response.json({ leaderboard });
  }),
);

leaderboardRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (request, response) => {
    const entry = await leaderboardService.getMyRank(request.authUser!.id);
    response.json({ entry });
  }),
);

