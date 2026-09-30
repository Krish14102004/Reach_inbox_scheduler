/**
 * FILE: frontend/src/components/layout/DashboardLayout.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Page shell for authenticated screens (header + content container).
 */

import type { ReactNode } from 'react';
import { Header } from './Header.js';
import type { User } from '../../types/user.types.js';

export function DashboardLayout({ user, onLogout, children }: { user: User; onLogout: () => void; children: ReactNode }): JSX.Element {
	return <div className="dashboard-layout"><Header user={user} onLogout={onLogout} /><div className="dashboard-layout-content">{children}</div></div>;
}

export default DashboardLayout;
