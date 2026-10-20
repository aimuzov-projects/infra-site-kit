import { expect, test } from '@playwright/test'

import {
	expectAccessible,
	expectHealthyPage,
	expectMetrikaDeferred,
	expectNotFound,
	expectStableWidth,
	expectThemePeek,
	sitemapPaths,
	siteChecks,
} from '../../playwright/checks.mjs'

// Общие проверки против сайта-заглушки из `server.mjs`, так, как их запускал бы сайт.
siteChecks({
	theme: { button: (page) => page.getByRole('button', { name: 'Switch the theme' }) },
	metrika: true,
	notFound: true,
})

// Сайт без sitemap перечисляет страницы для проверки ширины сам.
test.describe('without a sitemap', () => {
	siteChecks({ pages: false, a11y: false, gutter: { paths: ['/', '/about/'] } })
})

test('the sitemap paths drop the production domain', async ({ request }) => {
	expect(await sitemapPaths(request)).toEqual(['/', '/about/'])
})

// Проверки должны и падать, поэтому дальше страницы, которые их ломают.
const serve = (page, body) => page.route('/about/', (route) => route.fulfill({ contentType: 'text/html', body }))

test.fail('a console error fails the page check', async ({ page }) => {
	await serve(page, '<title>x</title><script>console.error("boom")</script>')
	await expectHealthyPage(page, '/about/')
})

test.fail('a Metrika that loads right away fails its check', async ({ page }) => {
	await serve(
		page,
		'<title>x</title><script>window.ym = () => {}</script><script src="https://mc.yandex.ru/metrika/tag.js?id=1"></script>',
	)

	await expectMetrikaDeferred(page, { path: '/about/' })
})

test.fail('a button without a name fails axe', async ({ page }) => {
	await serve(page, '<html lang="en"><title>x</title><main><button></button></main></html>')
	await page.goto('/about/')
	await expectAccessible(page)
})

test.fail('a page without the scrollbar gutter fails the width check', async ({ page }) => {
	await serve(page, '<html lang="en"><title>x</title><p style="min-height: 200vh">x</p></html>')
	await expectStableWidth(page, ['/', '/about/'])
})

test.fail('a theme button without the peek fails its check', async ({ page }) => {
	await serve(page, '<html lang="en"><title>x</title><button>Theme</button></html>')
	await expectThemePeek(page, page.getByRole('button'), { path: '/about/' })
})

test.fail('a missing page that answers 200 fails the not-found check', async ({ page }) => {
	await page.route('/kit-404-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<title>x</title>' }))
	await expectNotFound(page)
})
