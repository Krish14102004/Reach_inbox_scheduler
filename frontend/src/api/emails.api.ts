/**
 * FILE: frontend/src/api/emails.api.ts
 * PHASE: 8 - Frontend Features
 * PURPOSE: scheduleEmails(), listScheduled(), listSent(), searchEmails() — typed request/response.
 */

import { apiRequest } from './client.js';
import type { Paginated, ScheduleEmailsPayload, ScheduledEmail } from '../types/email.types.js';

export function listEmails(status: 'scheduled' | 'sent', page = 1): Promise<Paginated<ScheduledEmail>> {
	return apiRequest(`/api/emails/${status}?page=${page}&pageSize=100`);
}

export function scheduleEmails(payload: ScheduleEmailsPayload): Promise<{ batchId: string; total: number }> {
	return apiRequest('/api/emails/schedule', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function searchEmails(query: string, page = 1): Promise<Paginated<ScheduledEmail>> {
	return apiRequest(`/api/search/emails?q=${encodeURIComponent(query)}&page=${page}&pageSize=100`);
}

export async function listSenders(): Promise<Array<{ id: string; email: string; label: string | null }>> {
	const result = await apiRequest<{ items: Array<{ id: string; email: string; label: string | null }> }>('/api/senders');
	return result.items;
}
