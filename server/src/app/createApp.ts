import path from 'node:path';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env } from '../config/env';
import { attachAuthUser } from '../middleware/auth';
import { errorHandler } from '../middleware/error-handler';
import { notFoundHandler } from '../middleware/not-found';
import { adminRouter } from '../modules/admin/admin.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { gameRouter } from '../modules/game/game.routes';
import { leaderboardRouter } from '../modules/leaderboard/leaderboard.routes';
import { levelsRouter } from '../modules/levels/levels.routes';
import { playerSkinsRouter } from '../modules/player-skins/player-skins.routes';
import { profileRouter } from '../modules/users/profile.routes';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.NODE_ENV === 'production' ? true : env.CLIENT_ORIGIN,
    }),
  );
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.REQUEST_BODY_LIMIT }));
  app.use(morgan('dev'));
  app.use(attachAuthUser);

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/levels', levelsRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/game', gameRouter);
  app.use('/api/player-skins', playerSkinsRouter);
  app.use('/api/admin', adminRouter);

  const clientDistPath = path.resolve(__dirname, '../../../client/dist');
  app.use(express.static(clientDistPath));

  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api')) {
      return next();
    }

    return response.sendFile(path.join(clientDistPath, 'index.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

