/**
 * FILE: frontend/src/features/emails/useSentEmails.ts
 * PHASE: 8 - Frontend Features
 * PURPOSE: React Query hook for sent list (auto refetch interval).
 */

import { useQuery } from '@tanstack/react-query';
import { listEmails } from '../../api/emails.api.js';

export function useSentEmails(page = 1) {
	return useQuery({
		queryKey: ['emails', 'sent', page],
		queryFn: () => listEmails('sent', page),
		refetchInterval: 10_000,
	});
}
