/**
 * FILE: frontend/src/components/ui/EmptyState.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Empty-state illustration/text/action block.
 */

import type { ReactNode } from 'react';

export interface EmptyStateProps {
	icon?: ReactNode;
	title: string;
	description?: string;
	action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): JSX.Element {
	return (
		<section className="ui-empty-state">
			{icon && <div className="ui-empty-icon">{icon}</div>}
			<h2>{title}</h2>
			{description && <p>{description}</p>}
			{action && <div className="ui-empty-action">{action}</div>}
		</section>
	);
}

export default EmptyState;
