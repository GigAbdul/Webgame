import { Router } from 'express';
import { createRateLimit } from '../../middleware/rate-limit';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/async-handler';
import {
  loginSchema,
  registerSchema,
  resendEmailVerificationSchema,
  verifyEmailSchema,
} from './auth.schemas';
import { authService } from './auth.service';

export const authRouter = Router();

const loginRateLimit = createRateLimit({
  keyPrefix: 'auth:login',
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts. Try again later.',
});

const registerRateLimit = createRateLimit({
  keyPrefix: 'auth:register',
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many registration attempts. Try again later.',
});

const emailVerificationRateLimit = createRateLimit({
  keyPrefix: 'auth:email-verification',
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many verification attempts. Try again later.',
});

const resendVerificationRateLimit = createRateLimit({
  keyPrefix: 'auth:resend-verification',
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: 'Too many verification emails requested. Try again later.',
});

authRouter.post(
  '/register',
  registerRateLimit,
  asyncHandler(async (request, response) => {
    const payload = registerSchema.parse(request.body);
    const result = await authService.register(payload);
    response.status(201).json(result);
  }),
);

authRouter.post(
  '/login',
  loginRateLimit,
  asyncHandler(async (request, response) => {
    const payload = loginSchema.parse(request.body);
    const result = await authService.login(payload);
    response.json(result);
  }),
);

authRouter.post(
  '/verify-email',
  emailVerificationRateLimit,
  asyncHandler(async (request, response) => {
    const payload = verifyEmailSchema.parse(request.body);
    const result = await authService.verifyEmail(payload);
    response.json(result);
  }),
);

authRouter.post(
  '/resend-verification',
  resendVerificationRateLimit,
  asyncHandler(async (request, response) => {
    const payload = resendEmailVerificationSchema.parse(request.body);
    const result = await authService.resendEmailVerification(payload);
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

