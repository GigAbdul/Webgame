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

function getCorsOrigin() {
  const allowedOrigins = env.CLIENT_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (env.NODE_ENV === 'production') {
    return allowedOrigins;
  }

  return allowedOrigins.length > 1 ? allowedOrigins : allowedOrigins[0] ?? 'http://localhost:5173';
}

function getContentSecurityPolicy() {
  const connectSources = env.CLIENT_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .join(' ');

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${connectSources}`,
    "media-src 'self' https: data: blob:",
    "worker-src 'self' blob:",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);

  app.use(
    cors({
      origin: getCorsOrigin(),
    }),
  );
  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-DNS-Prefetch-Control', 'off');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (env.NODE_ENV === 'production') {
      response.setHeader('Content-Security-Policy', getContentSecurityPolicy());
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  });
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.REQUEST_BODY_LIMIT }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
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

