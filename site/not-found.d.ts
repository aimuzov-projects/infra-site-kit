/**
 * Страницы, похожие на ненайденный адрес, �"учшие первыми: опечатки и родите�"и по сегментам.
 * Г�"авную не пред�"агает.
 *
 * @param options.limit - Ско�"ько подсказок вернуть, по умо�"чанию 3.
 */
export function suggestPaths(path: string, paths: string[], options?: { limit?: number }): string[]

/** Пришё�" �"и че�"овек с этого же сайта, то есть есть �"и куда вернуться кнопкой ""Назад"". */
export function canGoBack(doc?: { referrer: string; location: { origin: string } }, hist?: { length: number }): boolean

/** Ожив�"яет разметку not-found.astro: кнопку ""Назад"" и подсказки из sitemap. */
export function notFound(root: HTMLElement): Promise<void>
