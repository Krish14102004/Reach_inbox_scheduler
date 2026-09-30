/**
 * FILE: frontend/src/components/layout/ProtectedRoute.tsx
 * PHASE: 8 - Frontend Features
 * PURPOSE: Redirects to /login when unauthenticated; shows spinner while auth loads.
 */

import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider.js';
import { Spinner } from '../ui/Spinner.js';

export function ProtectedRoute({ children }: { children?: ReactNode }): JSX.Element {
	const { user, loading } = useAuth();
	if (loading) return <div className="boot-screen"><Spinner /></div>;
	if (!user) return <Navigate to="/login" replace />;
	return <>{children ?? <Outlet />}</>;
}

export default ProtectedRoute;
