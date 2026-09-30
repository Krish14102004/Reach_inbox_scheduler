/**
 * FILE: frontend/src/components/ui/DateTimeInput.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Date-time picker for start time (matches Figma).
 */

interface DateTimeInputProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	min?: string;
	error?: string;
}

export function DateTimeInput({ label, value, onChange, min, error }: DateTimeInputProps): JSX.Element {
	return (
		<label className="ui-field">
			<span className="ui-field-label">{label}</span>
			<input className="ui-input" type="datetime-local" value={value} min={min} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />
			{error && <span className="ui-field-error">{error}</span>}
		</label>
	);
}

export default DateTimeInput;
