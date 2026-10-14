import preset from './playwright/config.mjs'

// The kit has no Astro site: the checks run against the fixture site of test/e2e/server.mjs.
export default {
	...preset,
	testDir: './test/e2e',
	webServer: { ...preset.webServer, command: 'node test/e2e/server.mjs', timeout: 10_000 },
}
