/**
 * FILE: frontend/src/components/ui/Toaster.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Thin wrapper configuring the toast library with design tokens.
 */

import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps): JSX.Element {
	return <SonnerToaster position="top-right" richColors closeButton {...props} />;
}

export default Toaster;
