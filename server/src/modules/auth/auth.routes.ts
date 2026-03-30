import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/async-handler';
import { loginSchema, registerSchema } from './auth.schemas';
import { authService } from './auth.service';

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (request, response) => {
    const payload = registerSchema.parse(request.body);
    const result = await authService.register(payload);
    response.status(201).json(result);
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (request, response) => {
    const payload = loginSchema.parse(request.body);
    const result = await authService.login(payload);
    response.json(result);
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await authService.me(request.authUser!.id);
    response.json(result);
  }),
);

