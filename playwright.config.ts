import { defineConfig, devices } from '@playwright/test';

// Serves the built site (dist/) at the domain root, as GitHub Pages does, and checks every page (research R12).
export default defineConfig({
	testDir: 'tests',
	// Page checks only; the *.test.ts files are unit tests (npm run test, npm run test:catalogue).
	testMatch: '**/*.spec.ts',
	// Every test opens its own browser context, so the per-page checks of one file spread over all workers and shards.
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				// Every page loads the header's visitor counter (spec 001 FR-015); the checks must not add to the owner's
				// count, so hitscounter.dev does not resolve in the test browser. The request is still made and checked.
				// The home page's build and statistics badges (github.com, img.shields.io) do not resolve either: a slow
				// answer from them held its load event past the test timeout, and no check is about their pictures.
				launchOptions: { args: ['--host-resolver-rules=MAP hitscounter.dev ~NOTFOUND, MAP github.com ~NOTFOUND, MAP img.shields.io ~NOTFOUND'] },
			},
		},
	],
	webServer: {
		command: 'npx sirv dist --port 4321',
		url: 'http://localhost:4321/adp/',
		reuseExistingServer: !process.env.CI,
	},
	use: {
		baseURL: 'http://localhost:4321',
	},
});
