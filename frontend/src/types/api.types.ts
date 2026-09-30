/**
 * FILE: frontend/src/types/api.types.ts
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Generic API types: Paginated<T>, ApiErrorBody.
 */

export interface ApiErrorBody {
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
}

export interface PageResult<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
}
