/**
 * FILE: frontend/src/features/emails/ScheduledEmailsTable.tsx
 * PHASE: 8 - Frontend Features
 * PURPOSE: Scheduled table: Email, Subject, Scheduled time, Status; loading + empty + error states.
 */

import { formatDateTime } from '../../lib/formatters.js';
import type { ScheduledEmail } from '../../types/email.types.js';
import { EmailStatusBadge } from './EmailStatusBadge.js';
import { useScheduledEmails } from './useScheduledEmails.js';

export function ScheduledEmailsTable({ onSelect }: { onSelect?: (email: ScheduledEmail) => void }): JSX.Element {
	const query = useScheduledEmails();
	if (query.isLoading) return <div className="mail-loading" aria-label="Loading scheduled email"><span /><span /></div>;
	if (query.isError) return <p className="inline-error">Couldn’t load scheduled email.</p>;
	if (!query.data?.items.length) return <p className="empty-table-state">No scheduled email.</p>;

	return <div className="mail-list">{query.data.items.map((email) => (
		<button className="mail-row" key={email.id} onClick={() => onSelect?.(email)}>
			<span className="mail-recipient">To: <strong>{email.toEmail}</strong></span>
			<EmailStatusBadge status={email.status} />
			<span className="mail-row-copy"><strong>{email.subject}</strong><span> — {email.body}</span></span>
			<span className="mail-row-time">{formatDateTime(email.scheduledAt)}</span>
		</button>
	))}</div>;
}

export default ScheduledEmailsTable;
