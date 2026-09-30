/**
 * FILE: backend/src/modules/slack/slack.controller.ts
 * PHASE: 5 - Slack Integration
 * PURPOSE: HTTP layer for Slack connect/callback/status/disconnect.
 */

import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { BadRequestError } from '../../lib/errors.js';
import { disconnectSlack, completeSlackOAuth, getSlackAuthorizationUrl, getSlackConnection } from './slack.service.js';

export async function startSlackConnect(req: Request, res: Response): Promise<void> {
	res.redirect(await getSlackAuthorizationUrl(req.user!.id));
}

export async function handleSlackCallback(req: Request, res: Response): Promise<void> {
	if (typeof req.query.error === 'string') {
		throw new BadRequestError(`Slack authorization was denied: ${req.query.error}`);
	}

	const code = typeof req.query.code === 'string' ? req.query.code : '';
	const state = typeof req.query.state === 'string' ? req.query.state : '';
	await completeSlackOAuth(code, state);

	const frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');
	res.redirect(`${frontendUrl}/?slack=connected`);
}

export async function getSlackStatus(req: Request, res: Response): Promise<void> {
	const connection = await getSlackConnection(req.user!.id);
	res.json({
		connected: Boolean(connection?.accessToken || connection?.webhookUrl),
		teamId: connection?.teamId ?? null,
		channelId: connection?.channelId ?? null,
	});
}

export async function disconnectSlackAccount(req: Request, res: Response): Promise<void> {
	await disconnectSlack(req.user!.id);
	res.json({ ok: true });
}
