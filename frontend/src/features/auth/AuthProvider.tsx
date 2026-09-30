/**
 * FILE: frontend/src/features/auth/AuthProvider.tsx
 * PHASE: 8 - Frontend Features
 * PURPOSE: Context providing current user + loading state via React Query `getMe`.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '../../api/client.js';
import { getMe, logout } from '../../api/auth.api.js';
import type { User } from '../../types/user.types.js';

interface AuthContextValue {
	user: User | null;
	loading: boolean;
	refresh: () => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = async () => {
		try {
			setUser(await getMe());
		} catch (error) {
			if (!(error instanceof ApiError && error.status === 401)) throw error;
			setUser(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void refresh().catch(() => setLoading(false));
	}, []);

	const signOut = async () => {
		await logout();
		setUser(null);
	};

	return <AuthContext.Provider value={{ user, loading, refresh, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const value = useContext(AuthContext);
	if (!value) throw new Error('useAuth must be used within AuthProvider.');
	return value;
}
