import type { APIRequestContext, Locator, Page } from '@playwright/test'

export type Scheme = 'light' | 'dark'

export type A11yOptions = {
	/** axe rule ids to skip, e.g. `['color-contrast']`. */
	disableRules?: string[]
	/** Selectors of the parts of the page axe leaves out. */
	exclude?: string[]
}

export type ThemeOptions = {
	/** Page to check on, `/` by default. */
	path?: string
	/** Whether the chosen scheme survives a reload, `true` by default. */
	persist?: boolean
}

/** Paths of the pages listed in the sitemap, sorted. */
export function sitemapPaths(request: APIRequestContext, index?: string): Promise<string[]>

/** Opens the page; it answers 200 and logs no errors to the console. */
export function expectHealthyPage(page: Page, path: string, options?: { ignore?: RegExp[] }): Promise<void>

/** axe over the open page against WCAG 2.1 AA. */
export function expectAccessible(page: Page, options?: A11yOptions): Promise<void>

/** The scheme the page is drawn in now, the way theme-peek.js reads it. */
export function pageScheme(page: Page): Promise<Scheme>

/** Clicking the theme button changes the scheme, and the choice survives a reload. */
export function expectThemeToggle(page: Page, button: Locator, options?: ThemeOptions): Promise<void>

/** Hovering the theme button opens the circle of theme-peek.js, a click puts it out. */
export function expectThemePeek(page: Page, button: Locator, options?: { path?: string }): Promise<void>

/** Yandex Metrika is on the page, but tag.js loads only after the first interaction. */
export function expectMetrikaDeferred(page: Page, options?: { path?: string }): Promise<void>

/** Registers the shared checks as tests of the current file. */
export function siteChecks(options?: {
	/** Every sitemap page answers 200 without console errors, `true` by default. */
	pages?: boolean
	/** Console errors the pages may log. */
	ignoreConsole?: RegExp[]
	/** axe over every sitemap page in both schemes; `false` turns it off. */
	a11y?: false | A11yOptions
	/** The theme button; without it the theme is not checked. */
	theme?: ThemeOptions & {
		button: (page: Page) => Locator
		/** Whether the button has theme-peek.js attached, `true` by default. */
		peek?: boolean
	}
	/** The Metrika check, on `/` with `true`. */
	metrika?: boolean | { path?: string }
}): void
