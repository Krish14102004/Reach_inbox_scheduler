/**
 * FILE: frontend/src/components/ui/Spinner.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Loading spinner + skeleton-row helper.
 */

import { LoaderCircle } from 'lucide-react';

export function Spinner({ label = 'Loading' }: { label?: string }): JSX.Element {
	return <span className="ui-spinner" role="status"><LoaderCircle size={17} className="ui-spin" /><span>{label}</span></span>;
}

export function SkeletonRows({ count = 3 }: { count?: number }): JSX.Element {
	return <div className="ui-skeleton-rows" aria-label="Loading rows">{Array.from({ length: count }, (_, index) => <span key={index} />)}</div>;
}

export default Spinner;
