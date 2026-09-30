/**
 * FILE: frontend/src/features/compose/ComposeEmailModal.tsx
 * PHASE: 8 - Frontend Features
 * PURPOSE: Compose modal/page per Figma; hosts ComposeForm.
 */

import ComposeEmail from './ComposeEmail.js';

export function ComposeEmailModal({ open, onClose, onScheduled }: {
	open: boolean;
	onClose: () => void;
	onScheduled: () => Promise<void>;
}): JSX.Element | null {
	if (!open) return null;
	return <ComposeEmail onClose={onClose} onScheduled={onScheduled} />;
}

export default ComposeEmailModal;
