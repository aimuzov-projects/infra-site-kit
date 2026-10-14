import preset from './playwright/config.mjs'

/**
 * Конфиг Playwright для e2e самого кита.
 *
 * В ките нет Astro-сайта, поэтому проверки гоняем по сайту-фикстуре
 * из `test/e2e/server.mjs`.
 */
export default {
	...preset,
	testDir: './test/e2e',
	webServer: { ...preset.webServer, command: 'node test/e2e/server.mjs', timeout: 10_000 },
}
