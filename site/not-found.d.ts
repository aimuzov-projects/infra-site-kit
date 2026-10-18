/**
 * Страницы, похожие на ненайденный адрес, лучшие первыми: опечатки и родители по сегментам.
 * Главную не предлагает.
 *
 * @param options.limit - Сколько подсказок вернуть, по умолчанию 3.
 */
export function suggestPaths(path: string, paths: string[], options?: { limit?: number }): string[]

/** Пришёл ли человек с этого же сайта, то есть есть ли куда вернуться кнопкой "Назад". */
export function canGoBack(doc?: { referrer: string; location: { origin: string } }, hist?: { length: number }): boolean

/** Оживляет разметку not-found.astro: кнопку "Назад" и подсказки из sitemap. */
export function notFound(root: HTMLElement): Promise<void>
