/**
 * FILE: frontend/src/lib/csv.ts
 * PHASE: 8 - Frontend Features
 * PURPOSE: Parse CSV/TXT of leads with papaparse, extract + dedupe + validate emails, return {emails, invalidCount}.
 */

import Papa from 'papaparse';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedLeads {
	emails: string[];
	invalidCount: number;
}

export function parseLeads(content: string): ParsedLeads {
	const rows = Papa.parse<string[]>(content, { skipEmptyLines: 'greedy' }).data;
	const candidates = rows.flatMap((row) => row.flatMap((cell) => cell.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []));
	const valid = new Set<string>();
	let invalidCount = 0;

	for (const candidate of candidates) {
		const email = candidate.trim().toLowerCase();
		if (emailPattern.test(email)) valid.add(email);
		else invalidCount += 1;
	}

	return { emails: [...valid], invalidCount };
}

export async function parseLeadsFile(file: File): Promise<ParsedLeads> {
	return parseLeads(await file.text());
}
