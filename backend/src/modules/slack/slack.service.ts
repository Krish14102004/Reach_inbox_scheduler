/**
 * FILE: backend/src/modules/slack/slack.service.ts
 * PHASE: 5 - Slack Integration
 * PURPOSE: Slack OAuth v2 code exchange, store token/webhook per user, revoke on disconnect.
 */

import { randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { BadRequestError, UnauthorizedError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { redisClient } from '../../lib/redis.js';
import { slackRepository } from './slack.repository.js';

const stateKey = (state: string) => `slack:oauth:state:${state}`;
const consumeStateScript = `
local userId = redis.call('GET', KEYS[1])
if userId then redis.call('DEL', KEYS[1]) end
return userId
`;

interface SlackOAuthResponse {
	ok?: boolean;
	error?: string;
	access_token?: string;
	team?: { id?: string };
	incoming_webhook?: { url?: string; channel_id?: string };
}

function requireSlackConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
	const { SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_REDIRECT_URI } = env;
	if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !SLACK_REDIRECT_URI) {
		throw new BadRequestError('Slack OAuth is not configured.');
	}

	return {
		clientId: SLACK_CLIENT_ID,
		clientSecret: SLACK_CLIENT_SECRET,
		redirectUri: SLACK_REDIRECT_URI,
	};
}

export async function getSlackAuthorizationUrl(userId: string): Promise<string> {
	const { clientId, redirectUri } = requireSlackConfig();
	const state = randomBytes(32).toString('hex');
	await redisClient.set(stateKey(state), userId, 'EX', 600, 'NX');

	const url = new URL('https://slack.com/oauth/v2/authorize');
	url.searchParams.set('client_id', clientId);
	url.searchParams.set('scope', 'chat:write,incoming-webhook');
	url.searchParams.set('redirect_uri', redirectUri);
	url.searchParams.set('state', state);
	return url.toString();
}

export async function completeSlackOAuth(code: string, state: string): Promise<void> {
	if (!code.trim() || !state.trim()) {
		throw new BadRequestError('Slack OAuth code and state are required.');
	}

	const userId = await redisClient.eval(consumeStateScript, 1, stateKey(state));
	if (typeof userId !== 'string') {
		throw new UnauthorizedError('Slack OAuth state is invalid or expired.');
	}

	const { clientId, clientSecret, redirectUri } = requireSlackConfig();
	const response = await fetch('https://slack.com/api/oauth.v2.access', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			code,
			redirect_uri: redirectUri,
		}),
	});
	const result = await response.json() as SlackOAuthResponse;

	if (!response.ok || !result.ok || !result.access_token) {
		throw new BadRequestError(`Slack authorization failed${result.error ? `: ${result.error}` : '.'}`);
	}
	if (!result.incoming_webhook?.url) {
		throw new BadRequestError('Slack did not provide an incoming webhook for the selected channel.');
	}

	await slackRepository.upsert({
		userId,
		teamId: result.team?.id ?? null,
		accessToken: result.access_token,
		webhookUrl: result.incoming_webhook.url,
		channelId: result.incoming_webhook.channel_id ?? null,
	});
}

export function getSlackConnection(userId: string) {
	return slackRepository.findByUser(userId);
}

export async function disconnectSlack(userId: string): Promise<void> {
	const connection = await slackRepository.findByUser(userId);
	if (!connection) return;

	if (connection.accessToken) {
		try {
			const response = await fetch('https://slack.com/api/auth.revoke', {
				method: 'POST',
				headers: { Authorization: `Bearer ${connection.accessToken}` },
			});
			if (!response.ok) {
				logger.warn({ userId, status: response.status }, 'Slack token revocation failed');
			}
		} catch (error) {
			logger.warn({ userId, err: error }, 'Slack token revocation could not reach Slack');
		}
	}

	await slackRepository.deleteByUser(userId);
}
