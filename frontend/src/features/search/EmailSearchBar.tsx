/**
 * FILE: frontend/src/features/search/EmailSearchBar.tsx
 * PHASE: 8 - Frontend Features
 * PURPOSE: Debounced search input hitting /api/search/emails; feeds tables.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';

export function EmailSearchBar({ onSearch, initialValue = '' }: { onSearch: (query: string) => void; initialValue?: string }): JSX.Element {
	const [value, setValue] = useState(initialValue);

	useEffect(() => {
		const timer = window.setTimeout(() => onSearch(value.trim()), 250);
		return () => window.clearTimeout(timer);
	}, [onSearch, value]);

	const submit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();
	return <form className="search-form" onSubmit={submit}><Search size={17} /><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Search email, subject, or message" aria-label="Search emails" /></form>;
}

export default EmailSearchBar;
