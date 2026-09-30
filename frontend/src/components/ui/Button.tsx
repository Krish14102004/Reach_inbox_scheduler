/**
 * FILE: frontend/src/components/ui/Button.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Reusable button: variants (primary/secondary/ghost), sizes, loading state.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
	size?: 'sm' | 'md';
	loading?: boolean;
	icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, ...props }: ButtonProps): JSX.Element {
	return (
		<button
			className={cn('ui-button', `ui-button-${variant}`, `ui-button-${size}`, className)}
			disabled={disabled || loading}
			{...props}
		>
			{loading ? <LoaderCircle size={15} className="ui-spin" /> : icon}
			{children}
		</button>
	);
}

export default Button;
