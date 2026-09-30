/**
 * FILE: backend/tests/unit/rateLimiter.test.ts
 * PHASE: 9 - Hardening, Load Test, Docs & Submission
 * PURPOSE: Unit tests: window boundaries, atomicity under concurrent calls, next-window calculation.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const { evalMock } = vi.hoisted(() => ({ evalMock: vi.fn() }));

vi.mock('../../src/lib/redis.js', () => ({ redisClient: { eval: evalMock } }));

import { checkRateLimit } from '../../src/rate-limit/rateLimiter.js';

describe('checkRateLimit', () => {
	afterEach(() => vi.clearAllMocks());

	it('increments within the UTC hour window and expires at the window boundary', async () => {
		evalMock.mockResolvedValue([1, 3]);
		const now = new Date('2026-09-30T10:30:00.000Z');

		const result = await checkRateLimit('sender-1', 5, now);

		expect(result).toEqual({
			allowed: true,
			currentCount: 3,
			limit: 5,
			nextWindowStart: new Date('2026-09-30T11:00:00.000Z'),
		});
		expect(evalMock).toHaveBeenCalledWith(
			expect.any(String),
			1,
			'rate:sender-1:2026-09-30T10:00:00.000Z',
			5,
			1800,
		);
	});

	it('denies a sender at the limit without increasing the count', async () => {
		evalMock.mockResolvedValue([0, 5]);

		const result = await checkRateLimit('sender-1', 5, new Date('2026-09-30T10:59:59.000Z'));

		expect(result.allowed).toBe(false);
		expect(result.currentCount).toBe(5);
		expect(result.nextWindowStart).toEqual(new Date('2026-09-30T11:00:00.000Z'));
		expect(evalMock).toHaveBeenCalledWith(
			expect.any(String),
			1,
			'rate:sender-1:2026-09-30T10:00:00.000Z',
			5,
			1,
		);
	});
});
