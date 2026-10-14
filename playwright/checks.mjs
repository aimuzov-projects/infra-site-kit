import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Проверки, общие для всех сайтов: страницы из sitemap, доступность, переключатель темы
// с подглядыванием и ленивая Яндекс Метрика. `siteChecks()` регистрирует их как тесты,
// но каждую функцию можно звать и по отдельности внутри тестов самого сайта.

/** @typedef {import('@playwright/test').Page} Page */
/** @typedef {import('@playwright/test').Locator} Locator */
/** @typedef {import('@playwright/test').APIRequestContext} APIRequestContext */

/** WCAG 2.1 уровней A и AA: то, что axe умеет проверить автоматически. */
const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const METRIKA_TAG = /^https:\/\/mc\.yandex\.ru\/metrika\/tag\.js/

const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(([, loc]) => loc)

/**
 * Пути страниц, перечисленных в sitemap, отсортированные.
 *
 * В sitemap адреса записаны с продовым доменом, поэтому берём только путь
 * и запрашиваем страницу у сервера, который тестируем.
 *
 * @param {APIRequestContext} request
 * @param {string} [index] Индекс sitemap от `@astrojs/sitemap`.
 * @returns {Promise<string[]>}
 */
export async function sitemapPaths(request, index = '/sitemap-index.xml') {
	const response = await request.get(index)

	expect(response.status(), `${index} is missing`).toBe(200)

	const paths = []

	for (const sitemap of locs(await response.text())) {
		const part = await request.get(new URL(sitemap).pathname)

		expect(part.status(), `${sitemap} is missing`).toBe(200)

		for (const loc of locs(await part.text())) paths.push(new URL(loc).pathname)
	}

	expect(paths, `${index} lists no pages`).not.toHaveLength(0)

	return paths.sort()
}

/**
 * Открывает страницу и проверяет, что она отвечает 200 и не пишет ошибок в консоль:
 * ни исключений, ни упавших запросов, ни нарушений CSP.
 *
 * Проверки мягкие (`expect.soft`), то есть тест не обрывается на первой плохой странице.
 *
 * @param {Page} page
 * @param {string} path
 * @param {{ ignore?: RegExp[] }} [options] Ошибки консоли, которые пропускаем.
 */
export async function expectHealthyPage(page, path, { ignore = [] } = {}) {
	const errors = []
	const onConsole = (message) => {
		if (message.type() === 'error' && !ignore.some((re) => re.test(message.text()))) errors.push(message.text())
	}
	const onError = (error) => errors.push(String(error))

	page.on('console', onConsole)
	page.on('pageerror', onError)

	try {
		const response = await page.goto(path)

		expect.soft(response?.status(), `${path} status`).toBe(200)
		await page.waitForLoadState('load')
		expect.soft(errors, `${path} console errors`).toEqual([])
	} finally {
		page.off('console', onConsole)
		page.off('pageerror', onError)
	}
}

/**
 * Прогоняет axe по открытой странице на соответствие WCAG 2.1 AA.
 *
 * Страницу не открывает: перед вызовом нужен `page.goto()`.
 *
 * @param {Page} page
 * @param {{ disableRules?: string[], exclude?: string[] }} [options]
 */
export async function expectAccessible(page, { disableRules = [], exclude = [] } = {}) {
	let builder = new AxeBuilder({ page }).withTags(A11Y_TAGS).disableRules(disableRules)

	for (const selector of exclude) builder = builder.exclude(selector)

	const { violations } = await builder.analyze()
	const summary = violations.map(({ id, help, nodes }) => `${id}: ${help} (${nodes.map((n) => n.target).join(', ')})`)

	expect.soft(summary, `${page.url()} accessibility`).toEqual([])
}

/**
 * Схема, в которой страница нарисована сейчас.
 *
 * Читается так же, как в `theme-peek.js`: по `color-scheme` корня, а если он оставляет
 * выбор открытым (`light dark` или пусто), то по системной настройке.
 *
 * @param {Page} page
 * @returns {Promise<'light' | 'dark'>}
 */
export function pageScheme(page) {
	return page.evaluate(() => {
		const value = getComputedStyle(document.documentElement).colorScheme
		const light = /\blight\b/.test(value)
		const dark = /\bdark\b/.test(value)

		if (light !== dark) return dark ? 'dark' : 'light'

		return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
	})
}

const nextFrame = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())))

/**
 * Жмёт кнопку темы, пока схема не сменится,
 * и проверяет, что выбор переживает перезагрузку.
 *
 * Переключатель может сначала пройти через "как в системе", а это выглядит так же,
 * поэтому даём ему до трёх кликов. Система эмулируется светлой.
 *
 * @param {Page} page
 * @param {Locator} button
 * @param {{ path?: string, persist?: boolean }} [options]
 */
export async function expectThemeToggle(page, button, { path = '/', persist = true } = {}) {
	await page.emulateMedia({ colorScheme: 'light' })
	await page.goto(path)

	const start = await pageScheme(page)
	let scheme = start

	for (let i = 0; i < 3 && scheme === start; i++) {
		await button.click()
		// Ждём кадр после клика: на глаз так приятнее, чем непрерывное мелькание инверсии.
		await nextFrame(page)
		scheme = await pageScheme(page)
	}

	expect(scheme, 'the theme button does not change the scheme').not.toBe(start)

	if (!persist) return

	await page.reload()
	expect(await pageScheme(page), 'the chosen scheme is lost on reload').toBe(scheme)
}

/**
 * Наводит курсор на кнопку темы и проверяет круг из `theme-peek.js`: он раскрывается
 * с копией страницы в другой схеме, скрыт от вспомогательных технологий и гаснет по клику.
 *
 * @param {Page} page
 * @param {Locator} button
 * @param {{ path?: string }} [options]
 */
export async function expectThemePeek(page, button, { path = '/' } = {}) {
	await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
	await page.goto(path)

	const peek = page.locator('body > .theme-peek')

	await button.hover()
	await expect(peek).toHaveClass(/\btheme-peek--open\b/)
	await expect(peek).toHaveAttribute('data-scheme', 'dark')
	await expect(peek).toHaveAttribute('aria-hidden', 'true')
	expect(await peek.evaluate((node) => node.inert && node.childElementCount > 0)).toBe(true)

	await button.click()
	await expect(peek).toHaveCount(0)
}

/**
 * Проверяет, что Яндекс Метрика ждёт посетителя: счётчик на странице есть, но `tag.js`
 * не запрашивается до первого взаимодействия, а сразу после него запрашивается.
 *
 * Часы страницы подменены, чтобы запасной запуск через 4 с после `load` не сработал
 * на медленной машине. До самого Яндекса запросы не доходят, им отвечаем пустотой.
 *
 * @param {Page} page
 * @param {{ path?: string }} [options]
 */
export async function expectMetrikaDeferred(page, { path = '/' } = {}) {
	const loads = []

	await page.route(/^https:\/\/(mc\.yandex\.ru|yastatic\.net)\//, (route) =>
		route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
	)
	page.on('request', (request) => {
		if (METRIKA_TAG.test(request.url())) loads.push(request.url())
	})

	await page.clock.install()
	await page.goto(path)
	await page.waitForLoadState('load')

	expect(await page.evaluate(() => typeof window.ym), `${path} has no Metrika counter`).toBe('function')

	// Меньше 4 с, после которых `site/metrika.js` грузит `tag.js` и без взаимодействия.
	await page.clock.runFor(3_000)
	expect(loads, 'tag.js loaded before any interaction').toEqual([])

	await page.keyboard.press('Shift')
	await expect.poll(() => loads.length, { message: 'tag.js did not load after a key press' }).toBe(1)
}

/**
 * Регистрирует общие проверки как тесты текущего файла.
 *
 * @param {object} [options]
 * @param {boolean} [options.pages] Каждая страница из sitemap отвечает 200 без ошибок в консоли.
 * @param {RegExp[]} [options.ignoreConsole] Ошибки консоли, которые страницам можно писать.
 * @param {false | { disableRules?: string[], exclude?: string[] }} [options.a11y] axe по каждой
 * странице из sitemap в обеих схемах, `false` выключает проверку.
 * @param {{ button: (page: Page) => Locator, path?: string, persist?: boolean, peek?: boolean }} [options.theme]
 * Кнопка темы, без неё тема не проверяется.
 * @param {boolean | { path?: string }} [options.metrika] Страница со счётчиком Метрики.
 */
export function siteChecks({ pages = true, ignoreConsole = [], a11y = {}, theme, metrika } = {}) {
	test.describe('site', () => {
		if (pages) {
			test('every sitemap page answers 200 without console errors', async ({ page, request }) => {
				for (const path of await sitemapPaths(request)) {
					await test.step(path, () => expectHealthyPage(page, path, { ignore: ignoreConsole }))
				}
			})
		}

		if (a11y) {
			for (const colorScheme of /** @type {const} */ (['light', 'dark'])) {
				test(`every sitemap page passes axe in the ${colorScheme} scheme`, async ({ page, request }) => {
					await page.emulateMedia({ colorScheme })

					for (const path of await sitemapPaths(request)) {
						await test.step(path, async () => {
							await page.goto(path)
							await expectAccessible(page, a11y)
						})
					}
				})
			}
		}

		if (theme) {
			test('the theme button switches the scheme', ({ page }) =>
				expectThemeToggle(page, theme.button(page), theme))

			if (theme.peek !== false) {
				test('the theme button peeks at the other scheme', ({ page }) =>
					expectThemePeek(page, theme.button(page), theme))
			}
		}

		if (metrika) {
			test('Yandex Metrika waits for the first interaction', ({ page }) =>
				expectMetrikaDeferred(page, metrika === true ? {} : metrika))
		}
	})
}
