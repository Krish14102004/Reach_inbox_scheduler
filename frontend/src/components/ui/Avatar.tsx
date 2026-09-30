/**
 * FILE: frontend/src/components/ui/Avatar.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: User avatar with initials fallback.
 */

import { cn } from '../../lib/cn.js';

export interface AvatarProps {
	name: string;
	src?: string | null;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps): JSX.Element {
	const initials = name.trim().split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('');
	return src
		? <img className={cn('ui-avatar', `ui-avatar-${size}`, className)} src={src} alt={name} />
		: <span className={cn('ui-avatar', `ui-avatar-${size}`, 'ui-avatar-fallback', className)} aria-label={name}>{initials || '?'}</span>;
}

export default Avatar;
