/**
 * FILE: frontend/src/api/client.ts
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Single fetch wrapper: base URL, credentials:'include', JSON handling, normalises backend error envelope into ApiError.
 */

interface ErrorEnvelope {
	error?: { code?: string; message?: string };
}

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code?: string,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers);
	if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

	const response = await fetch(`${apiBaseUrl}${path}`, {
		...init,
		headers,
		credentials: 'include',
	});

	if (response.status === 204) return undefined as T;

	const contentType = response.headers.get('content-type') ?? '';
	const payload = contentType.includes('application/json') ? await response.json() : await response.text();
	if (!response.ok) {
		const envelope = payload as ErrorEnvelope;
		throw new ApiError(
			envelope?.error?.message ?? `Request failed with status ${response.status}`,
			response.status,
			envelope?.error?.code,
		);
	}

	return payload as T;
}
