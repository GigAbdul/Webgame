import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error';

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  void _next;

  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    (error as { type?: string }).type === 'entity.too.large'
  ) {
    return response.status(413).json({
      message: 'Request payload is too large. Use a smaller embedded file or attach music by URL.',
    });
  }

  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({
      message: error.message,
      details: error.details ?? null,
    });
  }

  if (error instanceof ZodError) {
    return response.status(400).json({
      message: 'Validation failed',
      details: error.flatten(),
    });
  }

  const message = error instanceof Error ? error.message : 'Unexpected error';

  return response.status(500).json({
    message,
  });
}
