/**
 * FILE: backend/src/modules/search/search.controller.ts
 * PHASE: 6 - Search (Elasticsearch) & Queue Dashboard
 * PURPOSE: Validates query, calls ES search scoped to the current user, returns paginated hits.
 */

import type { Request, Response } from 'express';
import { elasticsearchRequest } from '../../lib/elasticsearch.js';
import { emailIndexName } from '../../search/mapping.js';

export async function searchEmailsController(req: Request, res: Response): Promise<void> {
  const query = String(req.query.q ?? '').trim();
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));

  if (!query) {
    res.json({ items: [], total: 0, page, pageSize });
    return;
  }

  const from = (page - 1) * pageSize;
  const payload = await elasticsearchRequest(`/${emailIndexName}/_search`, {
    method: 'POST',
    body: JSON.stringify({
      from,
      size: pageSize,
      query: {
        bool: {
          must: [{ match: { userId: req.user!.id } }],
          should: [
            { match_phrase_prefix: { subject: query } },
            { match_phrase_prefix: { body: query } },
            { match_phrase_prefix: { toEmail: query } },
          ],
          minimum_should_match: 1,
        },
      },
    }),
  });

  const hits = ((payload as any)?.hits?.hits ?? []) as Array<{ _source: Record<string, unknown> }>;
  res.json({
    items: hits.map((hit) => hit._source),
    total: Number((payload as any)?.hits?.total?.value ?? hits.length),
    page,
    pageSize,
  });
}
