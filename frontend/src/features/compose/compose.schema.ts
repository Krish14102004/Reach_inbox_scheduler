/**
 * FILE: frontend/src/features/compose/compose.schema.ts
 * PHASE: 8 - Frontend Features
 * PURPOSE: Zod schema + inferred type for the compose form.
 */

import { z } from 'zod';

export const composeSchema = z.object({
	subject: z.string().trim().min(1, 'Enter a subject').max(998),
	body: z.string().trim().min(1, 'Enter a message'),
	leads: z.array(z.string().email()).min(1, 'Add at least one valid recipient').max(5000),
	startTime: z.string().datetime(),
	delayBetweenMs: z.number().int().nonnegative(),
	hourlyLimit: z.number().int().positive(),
});

export type ComposeValues = z.infer<typeof composeSchema>;
