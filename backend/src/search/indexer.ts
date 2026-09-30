/**
 * FILE: backend/src/search/indexer.ts
 * PHASE: 6 - Search (Elasticsearch) & Queue Dashboard
 * PURPOSE: ensureIndex(), indexEmail(), updateEmailStatus(), bulkIndex(). Called from service + processor; failures logged, never block sending.
 */

import { logger } from '../lib/logger.js';
import { elasticsearchRequest } from '../lib/elasticsearch.js';
import { emailIndexName, emailMapping } from './mapping.js';

export async function ensureIndex(): Promise<void> {
  try {
    await elasticsearchRequest(`/${emailIndexName}`, {
      method: 'HEAD',
    }).catch(async () => {
      await elasticsearchRequest(`/${emailIndexName}`, {
        method: 'PUT',
        body: JSON.stringify(emailMapping),
      });
    });
  } catch (error) {
    logger.warn({ err: error }, 'Elasticsearch index ensure failed');
  }
}

export async function indexEmail(doc: Record<string, unknown>): Promise<void> {
  try {
    await elasticsearchRequest(`/${emailIndexName}/_doc/${String(doc.id ?? crypto.randomUUID())}`, {
      method: 'PUT',
      body: JSON.stringify(doc),
    });
  } catch (error) {
    logger.warn({ err: error }, 'Elasticsearch email index failed');
  }
}

export async function updateEmailStatus(emailId: string, status: string): Promise<void> {
  try {
    await elasticsearchRequest(`/${emailIndexName}/_update/${emailId}`, {
      method: 'POST',
      body: JSON.stringify({
        doc: { status, updatedAt: new Date().toISOString() },
      }),
    });
  } catch (error) {
    logger.warn({ err: error }, 'Elasticsearch email status update failed');
  }
}

export async function bulkIndex(docs: Record<string, unknown>[]): Promise<void> {
  if (docs.length === 0) return;

  try {
    const body = docs.flatMap((doc) => [{ index: { _index: emailIndexName, _id: String(doc.id ?? crypto.randomUUID()) } }, doc]);
    await elasticsearchRequest(`/${emailIndexName}/_bulk`, {
      method: 'POST',
      body: `${body.map((item) => JSON.stringify(item)).join('\n')}\n`,
    });
  } catch (error) {
    logger.warn({ err: error }, 'Elasticsearch bulk index failed');
  }
}
