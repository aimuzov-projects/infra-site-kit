import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { MARK } from '../site/mark.js'
import { canGoBack, suggestPaths } from '../site/not-found.js'
import { loadSitemapPaths, sitemapLocs } from '../site/sitemap.js'

const pages = ['/', '/extras', '/docs/install/', '/docs/config/', '/about/', '/blog/first-post/']

test('suggestPaths finds a page with a typo in its address', () => {
	assert.deepEqual(suggestPaths('/extra', pages), ['/extras'])
	assert.equal(suggestPaths('/docs/instal/', pages)[0], '/docs/install/')
})

test('suggestPaths ignores case, the trailing slash, .html and index', () => {
	assert.equal(suggestPaths('/About', pages)[0], '/about/')
	assert.equal(suggestPaths('/extras/', pages)[0], '/extras')
	assert.equal(suggestPaths('/about.html', pages)[0], '/about/')
	assert.equal(suggestPaths('/about/index.html', pages)[0], '/about/')
})

test('suggestPaths falls back to the parent page', () => {
	assert.deepEqual(suggestPaths('/blog/first-post/comments/old', ['/', '/blog/', '/blog/first-post/']), [
		'/blog/first-post/',
		'/blog/',
	])
})

test('suggestPaths puts typos before parents and keeps the limit', () => {
	const found = suggestPaths('/docs/confg', ['/docs/', '/docs/config/', '/docs/conf/'], { limit: 2 })

	assert.deepEqual(found, ['/docs/conf/', '/docs/config/'])
})

test('suggestPaths offers nothing for an unrelated address and never the home page', () => {
	assert.deepEqual(suggestPaths('/wp-admin/setup-config.php', pages), [])
	assert.deepEqual(suggestPaths('/x', ['/', '/xy/']), ['/xy/'])
	assert.ok(!suggestPaths('/a', pages).includes('/'))
})

test('suggestPaths lists one address once', () => {
	assert.deepEqual(suggestPaths('/abut', ['/about', '/about/', '/About/index.html']), ['/about'])
})

test('canGoBack needs a referrer from the same site and some history', () => {
	const doc = (referrer) => ({ referrer, location: { origin: 'https://example.com' } })

	assert.equal(canGoBack(doc('https://example.com/docs/'), { length: 2 }), true)
	assert.equal(canGoBack(doc('https://google.com/'), { length: 2 }), false)
	assert.equal(canGoBack(doc(''), { length: 2 }), false)
	assert.equal(canGoBack(doc('https://example.com/'), { length: 1 }), false)
})

const xml = (tag, locs) =>
	`<?xml version="1.0"?><${tag}>${locs.map((loc) => `<loc> ${loc} </loc>`).join('\n')}</${tag}>`

test('sitemapLocs reads every loc', () => {
	assert.deepEqual(sitemapLocs(xml('urlset', ['https://example.com/', 'https://example.com/a/'])), [
		'https://example.com/',
		'https://example.com/a/',
	])
})

test('loadSitemapPaths unfolds the index into page paths', async () => {
	const files = {
		'/sitemap-index.xml': xml('sitemapindex', [
			'https://example.com/sitemap-0.xml',
			'https://example.com/sitemap-1.xml',
		]),
		'/sitemap-0.xml': xml('urlset', ['https://example.com/', 'https://example.com/a/']),
		'/sitemap-1.xml': xml('urlset', ['https://example.com/b/']),
	}
	const fetch = async (url) => ({ ok: url in files, status: url in files ? 200 : 404, text: async () => files[url] })

	assert.deepEqual(await loadSitemapPaths('/sitemap-index.xml', { fetch }), ['/', '/a/', '/b/'])
	assert.deepEqual(await loadSitemapPaths('/sitemap-1.xml', { fetch }), ['/b/'])
	await assert.rejects(loadSitemapPaths('/missing.xml', { fetch }), /404/)
})

test('credit and the not-found page share one mark', () => {
	const credit = readFileSync(join(import.meta.dirname, '..', 'site', 'credit.svelte'), 'utf8')

	assert.ok(MARK.startsWith('M1.8 12'))
	assert.ok(credit.includes("from './mark.js'"))
	assert.ok(!credit.includes(MARK))
})

test('the package exports the not-found files it ships', () => {
	const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'))

	for (const target of ['./not-found.astro', './not-found.js', './sitemap.js', './mark.js'])
		assert.ok(pkg.exports[target], target)
})
