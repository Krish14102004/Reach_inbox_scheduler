/**
 * FILE: backend/eslint.config.js
 * PHASE: 0 - Project Setup & Infrastructure
 * PURPOSE: TypeScript ESLint flat config with promise-safety and scheduler-library bans.
 */

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["dist/**", "node_modules/**", "src/generated/**"],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-floating-promises": "error",
			"no-restricted-imports": [
				"error",
				{
					paths: ["node-cron", "cron", "agenda", "node-schedule"].map((name) => ({
						name,
						message: "Cron and polling schedulers are prohibited by the project requirements.",
					})),
				},
			],
		},
	},
);
/**
 * FILE: backend/eslint.config.js
 * PHASE: 0 - Project Setup & Infrastructure
 * PURPOSE: ESLint flat config: typescript-eslint, no-explicit-any, no-floating-promises. Ban cron libraries via no-restricted-imports.
 */
