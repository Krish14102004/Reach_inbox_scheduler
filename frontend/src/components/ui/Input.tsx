/**
 * FILE: frontend/src/components/ui/Input.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Labeled text/number input with error message slot.
 */

import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps): JSX.Element {
	const inputId = id ?? props.name;
	return (
		<label className="ui-field" htmlFor={inputId}>
			{label && <span className="ui-field-label">{label}</span>}
			<input id={inputId} className={cn('ui-input', error && 'ui-input-error', className)} aria-invalid={Boolean(error)} {...props} />
			{error && <span className="ui-field-error">{error}</span>}
		</label>
	);
}

export default Input;
