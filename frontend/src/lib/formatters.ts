/**
 * FILE: frontend/src/lib/formatters.ts
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Date/time + status formatting helpers used by tables.
 */

import type { EmailStatus } from '../types/email.types.js';

export function formatDateTime(value: string | Date): string {
	const date = typeof value === 'string' ? new Date(value) : value;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date);
}

export function formatEmailStatus(status: EmailStatus): string {
	if (status === 'processing') return 'Sending';
	return status.charAt(0).toUpperCase() + status.slice(1);
}
