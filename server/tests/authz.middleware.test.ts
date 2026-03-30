import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { requireRole } from '../src/middleware/auth';
import { errorHandler } from '../src/middleware/error-handler';

describe('role protection', () => {
  it('blocks non-admin users from admin routes', async () => {
    const app = express();

    app.use((req, _res, next) => {
      req.authUser = {
        id: 'user-1',
        email: 'user@example.com',
        username: 'user',
        role: 'USER',
      };
      next();
    });

    app.get('/admin-only', requireRole('ADMIN'), (_req, res) => {
      res.json({ ok: true });
    });

    app.use(errorHandler);

    const response = await request(app).get('/admin-only');
    expect(response.status).toBe(403);
  });

  it('allows admin users through', async () => {
    const app = express();

    app.use((req, _res, next) => {
      req.authUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        username: 'admin',
        role: 'ADMIN',
      };
      next();
    });

    app.get('/admin-only', requireRole('ADMIN'), (_req, res) => {
      res.json({ ok: true });
    });

    app.use(errorHandler);

    const response = await request(app).get('/admin-only');
    expect(response.status).toBe(200);
  });
});
