/**
 * FILE: backend/src/modules/slack/slack.repository.ts
 * PHASE: 5 - Slack Integration
 * PURPOSE: Prisma queries for SlackConnection (upsert, findByUser, delete).
 */

import { prisma } from '../../lib/prisma.js';

export const slackRepository = {
	findByUser(userId: string) {
		return prisma.slackConnection.findUnique({ where: { userId } });
	},

	upsert(data: {
		userId: string;
		teamId: string | null;
		accessToken: string;
		webhookUrl: string | null;
		channelId: string | null;
	}) {
		return prisma.slackConnection.upsert({
			where: { userId: data.userId },
			create: data,
			update: {
				teamId: data.teamId,
				accessToken: data.accessToken,
				webhookUrl: data.webhookUrl,
				channelId: data.channelId,
			},
		});
	},

	deleteByUser(userId: string) {
		return prisma.slackConnection.deleteMany({ where: { userId } });
	},
};
