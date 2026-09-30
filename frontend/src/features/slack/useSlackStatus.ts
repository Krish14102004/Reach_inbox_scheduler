/**
 * FILE: frontend/src/features/slack/useSlackStatus.ts
 * PHASE: 8 - Frontend Features
 * PURPOSE: React Query hooks for Slack status + disconnect mutation.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { disconnectSlack, getSlackStatus } from '../../api/slack.api.js';

export function useSlackStatus() {
	return useQuery({ queryKey: ['slack-status'], queryFn: getSlackStatus });
}

export function useDisconnectSlack() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: disconnectSlack,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['slack-status'] });
			toast.success('Slack disconnected');
		},
		onError: (error: Error) => toast.error(error.message),
	});
}
