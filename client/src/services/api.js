import { useAuthStore } from '../store/auth-store';
const apiBase = import.meta.env.VITE_API_URL ?? '';
export class ApiClientError extends Error {
    statusCode;
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}
function parseApiPayload(rawText) {
    if (!rawText) {
        return {};
    }
    try {
        return JSON.parse(rawText);
    }
    catch {
        return {};
    }
}
function getRequestBodySize(body) {
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
function createApiClientError(statusCode, rawText) {
    const payload = parseApiPayload(rawText);
    return new ApiClientError(statusCode, typeof payload.message === 'string' ? payload.message : 'Request failed', payload.details);
}
function shouldClearStoredAuthOnUnauthorized(path, statusCode, hasAuthToken) {
    if (statusCode !== 401 || !hasAuthToken) {
        return false;
    }
    return path !== '/api/auth/login' && path !== '/api/auth/register';
}
function requestViaXhrWithProgress(path, init, headers) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        const method = init.method ?? 'GET';
        const totalBytes = getRequestBodySize(init.body);
        const hasAuthToken = Boolean(useAuthStore.getState().token);
        let removeAbortListener = () => { };
        const emitProgress = (loaded, total) => {
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
                resolve(parseApiPayload(request.responseText ?? ''));
                return;
            }
            if (shouldClearStoredAuthOnUnauthorized(path, request.status, hasAuthToken)) {
                useAuthStore.getState().clearAuth();
            }
            reject(createApiClientError(request.status, request.responseText ?? ''));
        };
        request.send(init.body ?? null);
    });
}
export async function apiRequest(path, init = {}) {
    const token = useAuthStore.getState().token;
    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (init.onUploadProgress && init.body && typeof XMLHttpRequest !== 'undefined') {
        return requestViaXhrWithProgress(path, init, headers);
    }
    const response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers,
    });
    const rawText = await response.text();
    const payload = parseApiPayload(rawText);
    if (!response.ok) {
        if (shouldClearStoredAuthOnUnauthorized(path, response.status, Boolean(token))) {
            useAuthStore.getState().clearAuth();
        }
        throw createApiClientError(response.status, rawText);
    }
    return payload;
}
