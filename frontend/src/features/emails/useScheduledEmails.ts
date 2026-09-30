/**
 * FILE: frontend/src/features/emails/useScheduledEmails.ts
 * PHASE: 8 - Frontend Features
 * PURPOSE: React Query hook for scheduled list (auto refetch interval).
 */

import { useQuery } from '@tanstack/react-query';
import { listEmails } from '../../api/emails.api.js';

export function useScheduledEmails(page = 1) {
	return useQuery({
		queryKey: ['emails', 'scheduled', page],
		queryFn: () => listEmails('scheduled', page),
		refetchInterval: 10_000,
	});
}
