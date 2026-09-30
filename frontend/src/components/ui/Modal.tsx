/**
 * FILE: frontend/src/components/ui/Modal.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Accessible modal (focus trap, esc to close) used by Compose.
 */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Modal({
	open,
	title,
	onClose,
	children,
}: {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
}): JSX.Element | null {
	useEffect(() => {
		if (!open) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [onClose, open]);

	if (!open) return null;
	return createPortal(
		<div className="ui-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
			<section className="ui-modal" role="dialog" aria-modal="true" aria-label={title}>
				<header className="ui-modal-header"><h2>{title}</h2><button className="icon-button" type="button" title="Close" onClick={onClose}><X size={17} /></button></header>
				<div className="ui-modal-content">{children}</div>
			</section>
		</div>,
		document.body,
	);
}

export default Modal;
