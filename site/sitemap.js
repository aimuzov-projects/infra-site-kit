/**
 * Чтение sitemap от `@astrojs/sitemap`: и в браузере (подсказки 404), и в Playwright-проверках.
 * Адреса в sitemap записаны с продовым доменом, наружу отдаются только пути.
 */

/**
 * Адреса из `<loc>` в XML sitemap или её индекса.
 * @param {string} xml
 * @returns {string[]}
 */
export const sitemapLocs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(([, loc]) => loc)

/**
 * Пути всех страниц сайта по sitemap. Индекс разворачивается в свои части,
 * одиночная sitemap без индекса читается как есть.
 *
 * @param {string} [index] Индекс sitemap, по умолчанию `/sitemap-index.xml`.
 * @param {{ fetch?: typeof fetch }} [options] `fetch` подменяется в тестах.
 * @returns {Promise<string[]>}
 */
export async function loadSitemapPaths(index = '/sitemap-index.xml', { fetch = globalThis.fetch } = {}) {
	const read = async (url) => {
		const response = await fetch(url)

		if (!response.ok) throw new Error(`${url}: ${response.status}`)

		return response.text()
	}

	const pathOf = (loc) => new URL(loc).pathname
	const xml = await read(index)

	if (!xml.includes('<sitemapindex')) return sitemapLocs(xml).map(pathOf)

	const parts = await Promise.all(sitemapLocs(xml).map((loc) => read(pathOf(loc))))

	return parts.flatMap((part) => sitemapLocs(part).map(pathOf))
}
