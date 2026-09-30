/**
 * FILE: frontend/src/api/auth.api.ts
 * PHASE: 8 - Frontend Features
 * PURPOSE: getMe(), logout(), loginUrl() — typed.
 */

import { apiRequest } from './client.js';
import type { User } from '../types/user.types.js';

export async function getMe(): Promise<User | null> {
	const result = await apiRequest<{ user: User | null }>('/api/auth/me');
	return result.user;
}

export function loginUrl(): string {
	return `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/auth/google`;
}

export async function logout(): Promise<void> {
	await apiRequest('/api/auth/logout', { method: 'POST' });
}
