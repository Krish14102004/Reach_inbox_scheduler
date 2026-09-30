/**
 * FILE: frontend/src/components/ui/Table.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Generic typed table primitives (Table, Th, Td, Row) for both email tables.
 */

import type { HTMLAttributes, TableHTMLAttributes } from 'react';
import { cn } from '../../lib/cn.js';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>): JSX.Element {
	return <div className="ui-table-wrap"><table className={cn('ui-table', className)} {...props} /></div>;
}

export function Th({ className, ...props }: HTMLAttributes<HTMLTableCellElement>): JSX.Element {
	return <th className={cn('ui-table-heading', className)} scope="col" {...props} />;
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>): JSX.Element {
	return <td className={cn('ui-table-cell', className)} {...props} />;
}

export function Row({ className, ...props }: HTMLAttributes<HTMLTableRowElement>): JSX.Element {
	return <tr className={cn('ui-table-row', className)} {...props} />;
}
