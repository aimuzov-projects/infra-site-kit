/**
 * Страницы, похожие на ненайденный адрес, лучшие первыми: опечатки и родители по сегментам.
 * Главную не предлагает.
 *
 * @param options.limit - Сколько подсказок вернуть, по умолчанию 3.
 * @param options.scope - Префикс, под которым ищем, например `/ru/`. По умолчанию весь сайт.
 * @param options.exclude - Префиксы, которые не предлагаем, например `['/ru/']` у английской 404.
 */
export function suggestPaths(
	path: string,
	paths: string[],
	options?: { limit?: number; scope?: string; exclude?: string[] },
): string[]

/** Пришёл ли человек с этого же сайта, то есть есть ли куда вернуться кнопкой "Назад". */
export function canGoBack(doc?: { referrer: string; location: { origin: string } }, hist?: { length: number }): boolean

/** Оживляет разметку not-found.astro: кнопку "Назад" и подсказки из sitemap. */
export function notFound(root: HTMLElement): Promise<void>
