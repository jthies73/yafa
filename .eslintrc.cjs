module.exports = {
	root: true,
	env: {
		browser: true,
		es2022: true,
		node: true,
	},
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:react/recommended",
		"plugin:react-hooks/recommended",
	],
	ignorePatterns: ["dist", "node_modules"],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		ecmaFeatures: {
			jsx: true,
		},
	},
	plugins: ["@typescript-eslint", "react-refresh"],
	rules: {
		// Import sorting
		"sort-imports": [
			"warn",
			{
				ignoreCase: false,
				ignoreDeclarationSort: true, // Don't sort import declarations, only member imports
				ignoreMemberSort: false,
				memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
				allowSeparatedGroups: false,
			},
		],

		// React
		"react/react-in-jsx-scope": "off",
		"react/prop-types": "off",
		"react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

		// TypeScript - Essential only
		"@typescript-eslint/no-unused-vars": [
			"warn",
			{
				argsIgnorePattern: "^_",
				varsIgnorePattern: "^_",
			},
		],
		"@typescript-eslint/no-explicit-any": "warn",
	},
	settings: {
		react: {
			version: "detect",
		},
	},
};
