/**
 * FILE: frontend/src/routes/AppRoutes.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Route table: /login (public), / (protected dashboard), * (not found).
 */

import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider.js';
import LoginPage from '../features/auth/LoginPage.js';
import DashboardPage from '../features/dashboard/DashboardPage.js';
import EmailDetailPage from '../features/emails/EmailDetailPage.js';

export default function AppRoutes(): JSX.Element {
	const { user, loading } = useAuth();
	if (loading) return <div className="boot-screen"><span className="loader-ring" /></div>;

	return (
		<Routes>
			<Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
			<Route path="/" element={user ? <DashboardPage /> : <Navigate to="/login" replace />} />
			<Route path="/email/:emailId" element={user ? <EmailDetailPage /> : <Navigate to="/login" replace />} />
			<Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
		</Routes>
	);
}
