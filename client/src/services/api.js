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
export async function apiRequest(path, init = {}) {
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
    const payload = rawText ? JSON.parse(rawText) : {};
    if (!response.ok) {
        throw new ApiClientError(response.status, typeof payload.message === 'string' ? payload.message : 'Request failed', payload.details);
    }
    return payload;
}
