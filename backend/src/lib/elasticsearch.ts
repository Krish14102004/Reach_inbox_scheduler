/**
 * FILE: backend/src/lib/elasticsearch.ts
 * PHASE: 6 - Search (Elasticsearch) & Queue Dashboard
 * PURPOSE: Elasticsearch client singleton + health check.
 */

import { env } from '../config/env.js';

export function getElasticsearchBaseUrl(): string {
  return env.ELASTICSEARCH_URL.replace(/\/$/, '');
}

export async function checkElasticsearchHealth(): Promise<'ok' | 'down'> {
  try {
    const response = await fetch(getElasticsearchBaseUrl());
    if (!response.ok) {
      return 'down';
    }

    const payload = (await response.json()) as { version?: unknown };
    return payload.version ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

export async function elasticsearchRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const url = `${getElasticsearchBaseUrl()}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Elasticsearch request failed: ${response.status} ${text}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
}
