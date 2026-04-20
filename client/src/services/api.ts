import { useAuthStore } from '../store/auth-store';

const apiBase = import.meta.env.VITE_API_URL ?? '';

export type ApiUploadProgress = {
  loaded: number;
  total: number | null;
  percent: number | null;
};

export type ApiRequestInit = RequestInit & {
  onUploadProgress?: (progress: ApiUploadProgress) => void;
};

export class ApiClientError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function parseApiPayload(rawText: string) {
  if (!rawText) {
    return {} as Record<string, unknown>;
  }

  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function getRequestBodySize(body: RequestInit['body']) {
  if (!body) {
    return 0;
  }

  if (typeof body === 'string') {
    return new TextEncoder().encode(body).byteLength;
  }

  if (body instanceof Blob) {
    return body.size;
  }

  if (body instanceof URLSearchParams) {
    return new TextEncoder().encode(body.toString()).byteLength;
  }

  if (body instanceof ArrayBuffer) {
    return body.byteLength;
  }

  if (ArrayBuffer.isView(body)) {
    return body.byteLength;
  }

  return null;
}

function createApiClientError(statusCode: number, rawText: string) {
  const payload = parseApiPayload(rawText);

  return new ApiClientError(
    statusCode,
    typeof payload.message === 'string' ? payload.message : 'Request failed',
    payload.details,
  );
}

function requestViaXhrWithProgress<T>(path: string, init: ApiRequestInit, headers: Headers) {
  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const method = init.method ?? 'GET';
    const totalBytes = getRequestBodySize(init.body);
    let removeAbortListener = () => {};

    const emitProgress = (loaded: number, total: number | null) => {
      const percent = total === 0 ? 100 : total ? Math.min(100, Math.round((loaded / total) * 100)) : null;
      init.onUploadProgress?.({
        loaded,
        total,
        percent,
      });
    };

    request.open(method, `${apiBase}${path}`);
    headers.forEach((value, key) => {
      request.setRequestHeader(key, value);
    });

    if (init.signal) {
      if (init.signal.aborted) {
        reject(new DOMException('Request aborted', 'AbortError'));
        return;
      }

      const abortHandler = () => request.abort();
      init.signal.addEventListener('abort', abortHandler, { once: true });
      removeAbortListener = () => init.signal?.removeEventListener('abort', abortHandler);
    }

    emitProgress(0, totalBytes);

    request.upload.onprogress = (event) => {
      emitProgress(event.loaded, event.lengthComputable ? event.total : totalBytes);
    };

    request.onerror = () => {
      removeAbortListener();
      reject(new ApiClientError(0, 'Network request failed'));
    };

    request.onabort = () => {
      removeAbortListener();
      reject(new DOMException('Request aborted', 'AbortError'));
    };

    request.onload = () => {
      removeAbortListener();

      if (request.status >= 200 && request.status < 300) {
        emitProgress(totalBytes ?? 0, totalBytes);
        resolve(parseApiPayload(request.responseText ?? '') as T);
        return;
      }

      reject(createApiClientError(request.status, request.responseText ?? ''));
    };

    request.send((init.body as XMLHttpRequestBodyInit | null | undefined) ?? null);
  });
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (init.onUploadProgress && init.body && typeof XMLHttpRequest !== 'undefined') {
    return requestViaXhrWithProgress<T>(path, init, headers);
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
  });

  const rawText = await response.text();
  const payload = parseApiPayload(rawText);

  if (!response.ok) {
    throw createApiClientError(response.status, rawText);
  }

  return payload as T;
}

