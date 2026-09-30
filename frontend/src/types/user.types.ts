/**
 * FILE: frontend/src/types/user.types.ts
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: User (id, name, email, avatarUrl).
 */

export interface User {
	id: string;
	name: string;
	email: string;
	avatarUrl: string | null;
}
