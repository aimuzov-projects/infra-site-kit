/** Адреса из `<loc>` в XML sitemap или её индекса. */
export function sitemapLocs(xml: string): string[]

/**
 * Пути всех страниц сайта по sitemap: индекс разворачивается в свои части.
 *
 * @param index - Индекс sitemap, по умолчанию `/sitemap-index.xml`.
 * @param options.fetch - Подмена `fetch` для тестов.
 */
export function loadSitemapPaths(index?: string, options?: { fetch?: typeof fetch }): Promise<string[]>
