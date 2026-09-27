import { defineConfig } from 'vitest/config';

// Unit tests of the reference pipeline, over the pinned fixture (research D16).
export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		testTimeout: 60_000,
	},
});
