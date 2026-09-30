/**
 * FILE: backend/scripts/reindex-elasticsearch.ts
 * PHASE: 6 - Search (Elasticsearch) & Queue Dashboard
 * PURPOSE: CLI: rebuilds the ES index from MySQL (recovery + initial backfill).
 */

import { disconnectPrisma, prisma } from '../src/lib/prisma.js';
import { elasticsearchRequest } from '../src/lib/elasticsearch.js';
import { bulkIndex, ensureIndex } from '../src/search/indexer.js';
import { emailIndexName } from '../src/search/mapping.js';

const pageSize = 500;

async function reindex(): Promise<number> {
	await prisma.$connect();
	await ensureIndex();
	await elasticsearchRequest(`/${emailIndexName}`, { method: 'HEAD' });

	let skip = 0;
	let total = 0;

	while (true) {
		const emails = await prisma.scheduledEmail.findMany({
			orderBy: { id: 'asc' },
			skip,
			take: pageSize,
			select: {
				id: true,
				userId: true,
				senderId: true,
				toEmail: true,
				subject: true,
				body: true,
				status: true,
				scheduledAt: true,
				sentAt: true,
			},
		});

		if (emails.length === 0) break;

		const indexed = await bulkIndex(emails.map((email) => ({
			...email,
			scheduledAt: email.scheduledAt.toISOString(),
			sentAt: email.sentAt?.toISOString() ?? null,
		})));
		if (!indexed) {
			throw new Error(`Elasticsearch rejected a batch beginning at row ${skip}.`);
		}

		total += emails.length;
		skip += emails.length;
		if (emails.length < pageSize) break;
	}

	return total;
}

async function main(): Promise<void> {
	try {
		const total = await reindex();
		console.log(`Reindexed ${total} emails into ${emailIndexName}.`);
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	} finally {
		await disconnectPrisma().catch(() => undefined);
	}
}

void main();
