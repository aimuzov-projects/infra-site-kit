import { defineConfig, devices } from '@playwright/test'

// E2e-пресет для сайтов: тесты из `e2e/` гоняются в Chromium против продовой сборки,
// которую раздаёт `astro preview`. Сайт расширяет его через `defineConfig(preset, { ... })`.

const ci = Boolean(process.env.CI)
/** Не астровский 4321: его обычно уже занимает dev-сервер какого-нибудь сайта. */
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
		// Свежая сборка на каждый прогон, чтобы тесты всегда видели текущие исходники.
		// Если сервер запускает ИИ-агент, Astro уводит его в фон и сам выходит,
		// а `--ignore-lock` держит сервер здесь.
		command: `astro build && astro preview --port ${port} --ignore-lock`,
		url: baseURL,
		reuseExistingServer: false,
		timeout: 180_000,
	},
})
