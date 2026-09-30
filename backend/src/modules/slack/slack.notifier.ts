/**
 * FILE: backend/src/modules/slack/slack.notifier.ts
 * PHASE: 5 - Slack Integration
 * PURPOSE: notifyRateLimitHit(userId, sender, window, nextWindow): posts a REAL Slack message; no-op (no crash) if not connected; deduped once per sender per window via Redis flag.
 */

import { logger } from '../../lib/logger.js';
import { redisClient } from '../../lib/redis.js';
import { slackRepository } from './slack.repository.js';

export interface RateLimitAlert {
	userId: string;
	senderId: string;
	windowStart: Date;
	nextWindowStart: Date;
}

export async function notifyRateLimitHit(alert: RateLimitAlert): Promise<void> {
	const connection = await slackRepository.findByUser(alert.userId).catch((error: unknown) => {
		logger.warn({ userId: alert.userId, err: error }, 'Could not load Slack connection');
		return null;
	});
	if (!connection || (!connection.webhookUrl && (!connection.accessToken || !connection.channelId))) {
		return;
	}

	const windowKey = alert.windowStart.toISOString();
	const dedupeKey = `slack:rate-alert:${alert.userId}:${alert.senderId}:${windowKey}`;

	try {
		const reserved = await redisClient.set(dedupeKey, '1', 'EX', 60 * 60 * 24, 'NX');
		if (!reserved) return;

		const text = `Hourly send limit reached for sender ${alert.senderId}. Sending resumes at ${alert.nextWindowStart.toISOString()}.`;
		const response = connection.webhookUrl
			? await fetch(connection.webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text }),
				})
			: await fetch('https://slack.com/api/chat.postMessage', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${connection.accessToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ channel: connection.channelId, text }),
				});

		if (!response.ok) {
			throw new Error(`Slack returned HTTP ${response.status}`);
		}

		if (!connection.webhookUrl) {
			const result = await response.json() as { ok?: boolean; error?: string };
			if (!result.ok) throw new Error(`Slack message failed${result.error ? `: ${result.error}` : '.'}`);
		}
	} catch (error) {
		await redisClient.del(dedupeKey).catch(() => undefined);
		logger.warn({ userId: alert.userId, senderId: alert.senderId, err: error }, 'Slack rate-limit notification failed');
	}
}
