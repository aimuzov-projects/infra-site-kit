import { defineConfig, devices } from '@playwright/test'

// The e2e preset of the sites: the tests in e2e/ run in Chromium against the production
// build served by `astro preview`. A site extends it with defineConfig(preset, { … }).

const ci = Boolean(process.env.CI)
/** Not Astro's 4321: that one is usually taken by a dev server of some site. */
const port = Number(process.env.E2E_PORT ?? 4399)
const baseURL = `http://localhost:${port}`

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: ci,
	retries: ci ? 1 : 0,
	reporter: ci ? [['list'], ['github']] : [['list'], ['html', { open: 'never' }]],

	use: {
		baseURL,
		trace: 'retain-on-failure',
	},

	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

	webServer: {
		// A fresh build every run, so the tests always see the current sources. Astro sends a
		// server started by an AI agent to the background and exits, --ignore-lock keeps it here.
		command: `astro build && astro preview --port ${port} --ignore-lock`,
		url: baseURL,
		reuseExistingServer: false,
		timeout: 180_000,
	},
})
