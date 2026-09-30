/**
 * FILE: frontend/src/types/email.types.ts
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: EmailStatus union, ScheduledEmail, SentEmail, ScheduleEmailsPayload.
 */

export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface ScheduledEmail {
	id: string;
	toEmail: string;
	subject: string;
	body: string;
	status: EmailStatus;
	scheduledAt: string;
	sentAt: string | null;
	senderId: string;
	lastError?: string | null;
}

export interface Paginated<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
}

export interface ScheduleEmailsPayload {
	subject: string;
	body: string;
	leads: string[];
	startTime: string;
	delayBetweenMs: number;
	hourlyLimit: number;
}
