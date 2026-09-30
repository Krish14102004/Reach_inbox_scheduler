/**
 * FILE: backend/src/modules/search/search.controller.ts
 * PHASE: 6 - Search (Elasticsearch) & Queue Dashboard
 * PURPOSE: Validates query, calls ES search scoped to the current user, returns paginated hits.
 */

import type { Request, Response } from 'express';
import { elasticsearchRequest } from '../../lib/elasticsearch.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { emailIndexName } from '../../search/mapping.js';

interface EsSearchHit {
  _source: Record<string, unknown>;
}

interface EsSearchResponse {
  hits?: {
    total?: {
      value?: number;
    } | number;
    hits?: EsSearchHit[];
  };
}

export async function searchEmailsController(req: Request, res: Response): Promise<void> {
  const query = String(req.query.q ?? '').trim();
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));

  if (!query) {
    res.json({ items: [], total: 0, page, pageSize });
    return;
  }

  const from = (page - 1) * pageSize;
  const userId = req.user!.id;

  try {
    const payload = (await elasticsearchRequest(`/${emailIndexName}/_search`, {
      method: 'POST',
      body: JSON.stringify({
        from,
        size: pageSize,
        query: {
          bool: {
            must: [{ term: { userId } }],
            should: [
              { match_phrase_prefix: { subject: query } },
              { match_phrase_prefix: { body: query } },
              { wildcard: { toEmail: `*${query.toLowerCase()}*` } },
            ],
            minimum_should_match: 1,
          },
        },
      }),
    })) as EsSearchResponse | null;

    const hits: EsSearchHit[] = payload?.hits?.hits ?? [];
    const rawTotal = payload?.hits?.total;
    const total = typeof rawTotal === 'object' && rawTotal !== null ? Number(rawTotal.value ?? hits.length) : Number(rawTotal ?? hits.length);

    res.json({
      items: hits.map((hit) => hit._source),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    logger.warn({ err: error, query }, 'Elasticsearch search query failed, falling back to database query');
    const [items, total] = await Promise.all([
      prisma.scheduledEmail.findMany({
        where: {
          userId,
          OR: [
            { subject: { contains: query } },
            { body: { contains: query } },
            { toEmail: { contains: query } },
          ],
        },
        orderBy: { scheduledAt: 'desc' },
        skip: from,
        take: pageSize,
      }),
      prisma.scheduledEmail.count({
        where: {
          userId,
          OR: [
            { subject: { contains: query } },
            { body: { contains: query } },
            { toEmail: { contains: query } },
          ],
        },
      }),
    ]);

    res.json({
      items,
      total,
      page,
      pageSize,
    });
  }
}
