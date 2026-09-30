/**
 * FILE: backend/src/search/mapping.ts
 * PHASE: 6 - Search (Elasticsearch) & Queue Dashboard
 * PURPOSE: Index name + mapping/settings for the `emails` index (email, subject, body, status, senderId, userId, scheduledAt, sentAt).
 */

import { ELASTICSEARCH_INDEX_NAME } from '../config/constants.js';

export const emailIndexName = ELASTICSEARCH_INDEX_NAME;

export const emailMapping = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
  },
  mappings: {
    properties: {
      userId: { type: 'keyword' },
      senderId: { type: 'keyword' },
      toEmail: { type: 'keyword' },
      subject: { type: 'text' },
      body: { type: 'text' },
      status: { type: 'keyword' },
      scheduledAt: { type: 'date' },
      sentAt: { type: 'date' },
      createdAt: { type: 'date' },
    },
  },
};

export function buildSearchQuery(q: string) {
  return {
    query: {
      bool: {
        should: [
          { match: { subject: q } },
          { match: { body: q } },
          { match: { toEmail: q } },
        ],
        minimum_should_match: 1,
      },
    },
  };
}
