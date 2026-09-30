/**
 * FILE: frontend/src/components/ui/Tabs.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Tab switcher for Scheduled / Sent.
 */

import type { ReactNode } from 'react';

export interface TabOption<T extends string> {
	id: T;
	label: string;
	count?: number;
	icon?: ReactNode;
}

export function Tabs<T extends string>({
	options,
	value,
	onChange,
}: {
	options: TabOption<T>[];
	value: T;
	onChange: (value: T) => void;
}): JSX.Element {
	return (
		<div className="ui-tabs" role="tablist">
			{options.map((option) => (
				<button
					key={option.id}
					type="button"
					role="tab"
					aria-selected={value === option.id}
					className={value === option.id ? 'ui-tab ui-tab-active' : 'ui-tab'}
					onClick={() => onChange(option.id)}
				>
					{option.icon}{option.label}{option.count !== undefined && <small>{option.count}</small>}
				</button>
			))}
		</div>
	);
}

export default Tabs;
