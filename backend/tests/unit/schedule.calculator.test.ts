import { describe, expect, it } from 'vitest';
import { scheduleEmails } from '../../src/modules/emails/schedule.calculator.js';

describe('scheduleEmails', () => {
  it('spaces emails evenly from a start time and rotates senders', () => {
    const start = new Date('2026-01-01T10:00:00.000Z');

    const result = scheduleEmails({
      leads: ['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com'],
      startTime: start,
      delayBetweenMs: 60_000,
      senderCount: 2,
    });

    expect(result).toHaveLength(4);
    expect(result[0]!).toMatchObject({ email: 'a@example.com', senderIndex: 0 });
    expect(result[1]!).toMatchObject({ email: 'b@example.com', senderIndex: 1 });
    expect(result[2]!).toMatchObject({ email: 'c@example.com', senderIndex: 0 });
    expect(result[3]!).toMatchObject({ email: 'd@example.com', senderIndex: 1 });
    expect(result[0]!.scheduledAt.getTime()).toBe(start.getTime());
    expect(result[1]!.scheduledAt.getTime()).toBe(start.getTime() + 60_000);
    expect(result[2]!.scheduledAt.getTime()).toBe(start.getTime() + 120_000);
  });

  it('keeps the first slot as the start time even if the start is in the past', () => {
    const start = new Date('2025-01-01T00:00:00.000Z');

    const result = scheduleEmails({
      leads: ['a@example.com', 'b@example.com'],
      startTime: start,
      delayBetweenMs: 30_000,
      senderCount: 1,
    });

    expect(result[0]!.scheduledAt.getTime()).toBe(start.getTime());
    expect(result[1]!.scheduledAt.getTime()).toBe(start.getTime() + 30_000);
  });
});
