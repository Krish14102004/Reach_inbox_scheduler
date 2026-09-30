/**
 * FILE: frontend/src/features/compose/LeadsUploader.tsx
 * PHASE: 8 - Frontend Features
 * PURPOSE: Wraps FileDropzone + csv parser; shows detected email count + invalid rows.
 */

import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { parseLeadsFile } from '../../lib/csv.js';
import { Button } from '../../components/ui/Button.js';

export function LeadsUploader({ onLeads }: { onLeads: (emails: string[]) => void }): JSX.Element {
	const inputRef = useRef<HTMLInputElement>(null);
	const [fileName, setFileName] = useState('');
	const [message, setMessage] = useState('');

	const handleFile = async (file?: File) => {
		if (!file) return;
		try {
			const parsed = await parseLeadsFile(file);
			onLeads(parsed.emails);
			setFileName(file.name);
			setMessage(`${parsed.emails.length} valid · ${parsed.invalidCount} invalid`);
		} catch {
			setMessage('Could not read this file. Use a CSV or TXT file.');
		}
	};

	return (
		<div className="leads-uploader">
			<input ref={inputRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={(event) => void handleFile(event.target.files?.[0])} />
			<Button type="button" variant="outline" icon={<FileUp size={15} />} onClick={() => inputRef.current?.click()}>Upload List</Button>
			{fileName && <span>{fileName} · {message}</span>}
		</div>
	);
}

export default LeadsUploader;
