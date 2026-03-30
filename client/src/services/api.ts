import { useAuthStore } from '../store/auth-store';

const apiBase = import.meta.env.VITE_API_URL ?? '';

export class ApiClientError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
  });

  const rawText = await response.text();
  const payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      typeof payload.message === 'string' ? payload.message : 'Request failed',
      payload.details,
    );
  }

  return payload as T;
}

