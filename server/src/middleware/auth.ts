import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { ApiError } from '../utils/api-error';
import { verifyAuthToken } from '../utils/auth-token';

export function attachAuthUser(request: Request, _response: Response, next: NextFunction) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return next();
  }

  const token = authorization.replace('Bearer ', '').trim();

  try {
    const payload = verifyAuthToken(token);
    request.authUser = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      username: payload.username,
    };
  } catch {
    request.authUser = undefined;
  }

  return next();
}

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  if (!request.authUser) {
    return next(new ApiError(401, 'Authentication required'));
  }

  return next();
}

export function requireRole(role: Role) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.authUser) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (request.authUser.role !== role) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }

    return next();
  };
}

