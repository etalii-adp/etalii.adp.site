import { defineConfig } from 'vitest/config';

// Unit tests of the reference pipeline, over the pinned fixture (research D16).
export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		// The catalogue's unit tests use node:test and run with npm run test:catalogue (spec 003).
		exclude: ['tests/unit/**', 'node_modules/**'],
		testTimeout: 60_000,
	},
});
