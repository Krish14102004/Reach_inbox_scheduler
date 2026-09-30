/**
 * FILE: frontend/src/lib/cn.ts
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: className joiner (clsx + tailwind-merge).
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...values: ClassValue[]): string {
	return twMerge(clsx(values));
}
