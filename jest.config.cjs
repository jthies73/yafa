/** @type {import('jest').Config} */
const config = {
	verbose: true,
	preset: "ts-jest",
	testEnvironment: "node",
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
	},
	// Support both TypeScript and JavaScript ES modules
	extensionsToTreatAsEsm: [".ts", ".tsx"],
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
		"^.+\\.jsx?$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
};

module.exports = config;
