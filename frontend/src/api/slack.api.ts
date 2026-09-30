/**
 * FILE: frontend/src/api/slack.api.ts
 * PHASE: 8 - Frontend Features
 * PURPOSE: getSlackStatus(), connectUrl(), disconnectSlack() — typed.
 */

import { apiRequest } from './client.js';

export interface SlackStatus {
	connected: boolean;
	teamId: string | null;
	channelId: string | null;
}

export function getSlackStatus(): Promise<SlackStatus> {
	return apiRequest('/api/slack/status');
}

export function disconnectSlack(): Promise<void> {
	return apiRequest('/api/slack/disconnect', { method: 'DELETE' });
}

export function slackConnectUrl(): string {
	return `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/slack/connect`;
}
