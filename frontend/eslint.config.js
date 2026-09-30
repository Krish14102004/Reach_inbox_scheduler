/**
 * FILE: frontend/eslint.config.js
 * PHASE: 0 - Project Setup & Infrastructure
 * PURPOSE: ESLint flat config for the TypeScript React shell.
 */

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["dist/**", "node_modules/**"],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.{ts,tsx}"],
		rules: {
			"@typescript-eslint/no-explicit-any": "error",
		},
	},
);
/**
 * FILE: frontend/eslint.config.js
 * PHASE: 0 - Project Setup & Infrastructure
 * PURPOSE: ESLint flat config for React + hooks rules + typescript-eslint.
 */
