import { defineConfig, devices } from '@playwright/test';

// Serves the built site (dist/) at the domain root, as GitHub Pages does, and checks every page (research R12).
export default defineConfig({
	testDir: 'tests',
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npx sirv dist --port 4321',
		url: 'http://localhost:4321/adp/',
		reuseExistingServer: !process.env.CI,
	},
	use: {
		baseURL: 'http://localhost:4321',
	},
});
