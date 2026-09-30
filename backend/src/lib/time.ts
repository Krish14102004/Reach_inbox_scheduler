/**
 * FILE: backend/src/lib/time.ts
 * PHASE: 4 - Rate Limiting, Delay & Concurrency
 * PURPOSE: Time helpers: hour-window key (UTC floor to hour), next-window start, ms-until helpers. Pure functions, unit-tested.
 */

export function getHourWindowStart(date: Date): Date {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  return next;
}

export function getHourWindowKey(date: Date, prefix: string): string {
  return `${prefix}:${getHourWindowStart(date).toISOString()}`;
}

export function getNextHourWindowStart(date: Date): Date {
  const next = getHourWindowStart(date);
  next.setUTCHours(next.getUTCHours() + 1);
  return next;
}

export function getMsUntilNextHour(date: Date): number {
  return Math.max(0, getNextHourWindowStart(date).getTime() - date.getTime());
}
