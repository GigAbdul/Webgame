import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/api-error';
import { verifyAuthToken } from '../utils/auth-token';

function buildVerificationRequiredPayload(email: string, expiresAt?: Date | null) {
  return {
    requiresEmailVerification: true as const,
    email,
    expiresAt: expiresAt?.toISOString() ?? null,
  };
}

function getAuthError(request: Request) {
  if (request.authEmailVerification) {
    return new ApiError(403, 'Email verification required', request.authEmailVerification);
  }

  return new ApiError(401, 'Authentication required');
}

export async function attachAuthUser(request: Request, _response: Response, next: NextFunction) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return next();
  }

  const token = authorization.replace('Bearer ', '').trim();
  let payload: ReturnType<typeof verifyAuthToken>;

  try {
    payload = verifyAuthToken(token);
  } catch {
    request.authUser = undefined;
    request.authEmailVerification = undefined;
    return next();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        email: true,
        username: true,
        emailVerifiedAt: true,
        emailVerificationExpiresAt: true,
      },
    });

    if (!user) {
      request.authUser = undefined;
      request.authEmailVerification = undefined;
      return next();
    }

    if (!user.emailVerifiedAt) {
      request.authUser = undefined;
      request.authEmailVerification = buildVerificationRequiredPayload(
        user.email,
        user.emailVerificationExpiresAt,
      );
      return next();
    }

    request.authUser = {
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
    };
    request.authEmailVerification = undefined;
  } catch (error) {
    return next(error);
  }

  return next();
}

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  if (!request.authUser) {
    return next(getAuthError(request));
  }

  return next();
}

export function requireRole(role: Role) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.authUser) {
      return next(getAuthError(request));
    }

    if (request.authUser.role !== role) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }

    return next();
  };
}

