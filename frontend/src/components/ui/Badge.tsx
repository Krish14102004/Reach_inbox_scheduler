/**
 * FILE: frontend/src/components/ui/Badge.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Status pill (scheduled, sent, failed, etc.).
 */

import type { HTMLAttributes } from 'react';
import type { EmailStatus } from '../../types/email.types.js';
import { formatEmailStatus } from '../../lib/formatters.js';
import { cn } from '../../lib/cn.js';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	variant?: EmailStatus | 'neutral';
}

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps): JSX.Element {
	return <span className={cn('ui-badge', `ui-badge-${variant}`, className)} {...props}>{children}</span>;
}

export function EmailBadge({ status }: { status: EmailStatus }): JSX.Element {
	return <Badge variant={status}>{formatEmailStatus(status)}</Badge>;
}

export default Badge;
