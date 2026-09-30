/**
 * FILE: frontend/src/components/ui/FileDropzone.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Drag/drop or click file upload for CSV/TXT with filename display.
 */

import { useRef, useState, type DragEvent } from 'react';
import { FileUp } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export interface FileDropzoneProps {
	onFile: (file: File) => void;
	accept?: string;
	fileName?: string;
	error?: string;
}

export function FileDropzone({ onFile, accept = '.csv,.txt,text/csv,text/plain', fileName, error }: FileDropzoneProps): JSX.Element {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	const useFile = (file?: File) => {
		if (file) onFile(file);
	};

	const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
		event.preventDefault();
		setDragging(false);
		useFile(event.dataTransfer.files[0]);
	};

	return (
		<div className="ui-file-picker">
			<input ref={inputRef} type="file" accept={accept} hidden onChange={(event) => useFile(event.target.files?.[0])} />
			<button
				className={cn('ui-file-dropzone', dragging && 'ui-file-dropzone-active', error && 'ui-file-dropzone-error')}
				type="button"
				onClick={() => inputRef.current?.click()}
				onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
				onDragLeave={() => setDragging(false)}
				onDrop={handleDrop}
				aria-label="Choose or drop a CSV or TXT file"
			>
				<FileUp size={17} />
				<span>{fileName ?? 'Choose a CSV or TXT file'}</span>
			</button>
			{error && <span className="ui-field-error">{error}</span>}
		</div>
	);
}

export default FileDropzone;
