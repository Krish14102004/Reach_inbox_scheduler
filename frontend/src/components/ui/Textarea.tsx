/**
 * FILE: frontend/src/components/ui/Textarea.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Labeled textarea with error slot.
 */

import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn.js';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	label?: string;
	error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps): JSX.Element {
	const inputId = id ?? props.name;
	return (
		<label className="ui-field" htmlFor={inputId}>
			{label && <span className="ui-field-label">{label}</span>}
			<textarea id={inputId} className={cn('ui-textarea', error && 'ui-input-error', className)} aria-invalid={Boolean(error)} {...props} />
			{error && <span className="ui-field-error">{error}</span>}
		</label>
	);
}

export default Textarea;
