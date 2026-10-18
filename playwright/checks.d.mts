import type { APIRequestContext, Locator, Page } from '@playwright/test'

/** Цветовая схема, в которой нарисована страница. */
export type Scheme = 'light' | 'dark'

/** Настройки проверки axe. */
export type A11yOptions = {
	/** Id прави�" axe, которые пропускаем, например `['color-contrast']`. */
	disableRules?: string[]
	/** Се�"екторы частей страницы, которые axe не проверяет. */
	exclude?: string[]
}

/** Настройки проверки перек�"ючате�"я темы. */
export type ThemeOptions = {
	/** Страница, на которой проверяем, по умо�"чанию `/`. */
	path?: string
	/** Проверять, что выбор схемы переживает перезагрузку, по умо�"чанию `true`. */
	persist?: boolean
}

/**
 * Пути страниц, перечис�"енных в sitemap, отсортированные.
 *
 * Продовый домен из адресов отбрасывается, страницы запрашиваются у тестируемого сервера.
 *
 * @param index - Индекс sitemap, по умо�"чанию `/sitemap-index.xml`.
 */
export function sitemapPaths(request: APIRequestContext, index?: string): Promise<string[]>

/**
 * Открывает страницу и проверяет, что она отвечает 200 и не пишет ошибок в консо�"ь.
 *
 * @param options.ignore - Ошибки консо�"и, которые пропускаем.
 */
export function expectHealthyPage(page: Page, path: string, options?: { ignore?: RegExp[] }): Promise<void>

/** Прогоняет axe по уже открытой странице на соответствие WCAG 2.1 AA. */
export function expectAccessible(page: Page, options?: A11yOptions): Promise<void>

/** Схема, в которой страница нарисована сейчас. Читается так же, как в `theme-peek.js`. */
export function pageScheme(page: Page): Promise<Scheme>

/**
 * Проверяет, что к�"ик по кнопке темы меняет схему, а выбор переживает перезагрузку.
 *
 * К�"икает до трёх раз, так как перек�"ючате�"ь может снача�"а пройти через "как в системе".
 */
export function expectThemeToggle(page: Page, button: Locator, options?: ThemeOptions): Promise<void>

/** Наведение на кнопку темы раскрывает круг `theme-peek.js`, к�"ик его гасит. */
export function expectThemePeek(page: Page, button: Locator, options?: { path?: string }): Promise<void>

/**
 * Проверяет, что Яндекс Метрика есть на странице,
 * но `tag.js` грузится то�"ько пос�"е первого взаимодействия.
 */
export function expectMetrikaDeferred(page: Page, options?: { path?: string }): Promise<void>

/**
 * Открывает несуществующий адрес и проверяет общую 404 из not-found.astro: ответ 404,
 * `noindex`, ссы�"ку на г�"авную, кнопку ""Назад"" и чистую консо�"ь.
 *
 * @param options.path - Несуществующий адрес, по умо�"чанию `/kit-404-probe`.
 * @param options.home - Адрес г�"авной, по умо�"чанию `/`.
 * @param options.ignore - Ошибки консо�"и, которые пропускаем.
 */
export function expectNotFound(page: Page, options?: { path?: string; home?: string; ignore?: RegExp[] }): Promise<void>

/** Портит адрес страницы из sitemap одной буквой и ждёт её в подсказках 404. */
export function expectNotFoundSuggests(
	page: Page,
	request: APIRequestContext,
	options?: { index?: string },
): Promise<void>

/** Регистрирует общие проверки как тесты текущего фай�"а. */
export function siteChecks(options?: {
	/** Каждая страница из sitemap отвечает 200 без ошибок в консо�"и, по умо�"чанию `true`. */
	pages?: boolean
	/** Ошибки консо�"и, которые страницам можно писать. */
	ignoreConsole?: RegExp[]
	/** axe по каждой странице из sitemap в обеих схемах, `false` вык�"ючает проверку. */
	a11y?: false | A11yOptions
	/** Кнопка темы, без неё тема не проверяется. */
	theme?: ThemeOptions & {
		/** Находит кнопку темы на странице. */
		button: (page: Page) => Locator
		/** Подк�"ючён �"и к кнопке `theme-peek.js`, по умо�"чанию `true`. */
		peek?: boolean
	}
	/** Проверка Метрики, с `true` проверяется страница `/`. */
	metrika?: boolean | { path?: string }
	/** Общая 404 из not-found.astro, `suggest: false` -- д�"я сайта без подсказок. */
	notFound?: boolean | { path?: string; home?: string; suggest?: boolean }
}): void
