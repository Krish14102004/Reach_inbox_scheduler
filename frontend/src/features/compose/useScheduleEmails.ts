/**
 * FILE: frontend/src/features/compose/useScheduleEmails.ts
 * PHASE: 8 - Frontend Features
 * PURPOSE: React Query mutation: POST schedule, invalidate lists, toast success/error.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { scheduleEmails } from '../../api/emails.api.js';
import type { ScheduleEmailsPayload } from '../../types/email.types.js';

export function useScheduleEmails() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (payload: ScheduleEmailsPayload) => scheduleEmails(payload),
		onSuccess: async (result) => {
			toast.success(`${result.total} email${result.total === 1 ? '' : 's'} scheduled`);
			await queryClient.invalidateQueries({ queryKey: ['emails'] });
		},
		onError: (error: Error) => toast.error(error.message),
	});
}
