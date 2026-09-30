import { describe, expect, it } from 'vitest';
import { getHourWindowStart, getHourWindowKey, getNextHourWindowStart } from '../../src/lib/time.js';

describe('time helpers', () => {
  it('rounds a timestamp to the start of its UTC hour', () => {
    const start = new Date('2026-09-30T10:15:45.000Z');
    expect(getHourWindowStart(start).toISOString()).toBe('2026-09-30T10:00:00.000Z');
  });

  it('creates a stable hour-window key', () => {
    const start = new Date('2026-09-30T10:15:45.000Z');
    expect(getHourWindowKey(start, 'sender-42')).toBe('sender-42:2026-09-30T10:00:00.000Z');
  });

  it('returns the next hour boundary', () => {
    const start = new Date('2026-09-30T10:15:45.000Z');
    expect(getNextHourWindowStart(start).toISOString()).toBe('2026-09-30T11:00:00.000Z');
  });
});
