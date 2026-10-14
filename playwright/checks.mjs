import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Checks every site shares: the pages of the sitemap, accessibility, the theme switch with its
// peek and the lazy Yandex Metrika. siteChecks() registers them as tests; the functions also
// work one by one inside a site's own tests.

/** @typedef {import('@playwright/test').Page} Page */
/** @typedef {import('@playwright/test').Locator} Locator */
/** @typedef {import('@playwright/test').APIRequestContext} APIRequestContext */

/** WCAG 2.1 A and AA, what axe can check automatically. */
const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const METRIKA_TAG = /^https:\/\/mc\.yandex\.ru\/metrika\/tag\.js/

const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(([, loc]) => loc)

/**
 * Paths of the pages listed in the sitemap. Its URLs carry the production domain, so only the
 * path is kept and the page is asked from the server under test.
 * @param {APIRequestContext} request
 * @param {string} [index] the sitemap index of @astrojs/sitemap
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
 * Opens the page and checks that it answers 200 and logs no errors to the console: neither
 * an exception, nor a failed request, nor a CSP violation.
 * @param {Page} page
 * @param {string} path
 * @param {{ ignore?: RegExp[] }} [options] console errors to let through
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
 * Runs axe over the open page against WCAG 2.1 AA.
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
 * The scheme the page is drawn in now, the same way theme-peek.js reads it: by the root
 * color-scheme, and by the system when that leaves the choice open.
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
 * Clicks the theme button until the scheme changes and checks that it survives a reload.
 * A switch may go through "as in the system" first, which looks the same, so it gets up to
 * three clicks. The system is light.
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
		await nextFrame(page)
		scheme = await pageScheme(page)
	}

	expect(scheme, 'the theme button does not change the scheme').not.toBe(start)

	if (!persist) return

	await page.reload()
	expect(await pageScheme(page), 'the chosen scheme is lost on reload').toBe(scheme)
}

/**
 * Hovers the theme button and checks the circle of theme-peek.js: it opens with a copy of the
 * page in the other scheme, hidden from assistive tech, and goes out on click.
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
 * Checks that Yandex Metrika waits for the visitor: the page has the counter, but tag.js is
 * not requested until the first interaction, and right after it is. The page clock is faked,
 * so the 4 s fallback after load does not fire on a slow machine. Yandex itself is not
 * reached: its requests get an empty answer.
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

	await page.clock.runFor(3_000)
	expect(loads, 'tag.js loaded before any interaction').toEqual([])

	await page.keyboard.press('Shift')
	await expect.poll(() => loads.length, { message: 'tag.js did not load after a key press' }).toBe(1)
}

/**
 * Registers the shared checks as tests of the current file.
 * @param {object} [options]
 * @param {boolean} [options.pages] every sitemap page answers 200 without console errors
 * @param {RegExp[]} [options.ignoreConsole] console errors the pages may log
 * @param {false | { disableRules?: string[], exclude?: string[] }} [options.a11y] axe over
 * every sitemap page in both schemes, `false` turns it off
 * @param {{ button: (page: Page) => Locator, path?: string, persist?: boolean, peek?: boolean }} [options.theme]
 * the theme button; without it the theme is not checked
 * @param {boolean | { path?: string }} [options.metrika] the page with the Metrika counter
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
