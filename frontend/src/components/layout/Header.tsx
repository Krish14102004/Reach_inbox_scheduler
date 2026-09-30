/**
 * FILE: frontend/src/components/layout/Header.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Top header: brand, user name/email/avatar, logout action.
 */

import { LogOut, Mail } from 'lucide-react';
import { Avatar } from '../ui/Avatar.js';
import type { User } from '../../types/user.types.js';

export function Header({ user, onLogout }: { user: User; onLogout: () => void }): JSX.Element {
	return (
		<header className="dashboard-header">
			<a href="/" className="brand-lockup"><span className="brand-mark"><Mail size={16} /></span><span>reachinbox</span></a>
			<div className="dashboard-header-user"><Avatar name={user.name} src={user.avatarUrl} /><span>{user.name}</span><button className="icon-button" type="button" title="Sign out" onClick={onLogout}><LogOut size={16} /></button></div>
		</header>
	);
}

export default Header;
