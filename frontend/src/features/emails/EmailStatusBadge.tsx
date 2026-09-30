/**
 * FILE: frontend/src/features/emails/EmailStatusBadge.tsx
 * PHASE: 8 - Frontend Features
 * PURPOSE: Maps EmailStatus -> Badge variant/label.
 */

import type { EmailStatus } from '../../types/email.types.js';
import { EmailBadge } from '../../components/ui/Badge.js';

export function EmailStatusBadge({ status }: { status: EmailStatus }): JSX.Element {
	return <EmailBadge status={status} />;
}

export default EmailStatusBadge;
