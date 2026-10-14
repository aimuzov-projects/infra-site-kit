export type Scheme = 'light' | 'dark'

/** The scheme the page is drawn in now, by the root color-scheme or the system. */
export function currentScheme(): Scheme

/** The radius at which a circle centered at (cx, cy) covers `share` of a width × height screen. */
export function coverRadius(cx: number, cy: number, width: number, height: number, share?: number): number

/**
 * Attaches the peek to a theme button; works as a Svelte attachment as is. Returns the cleanup,
 * or nothing on touch screens and with reduced motion, where there is no peek.
 */
export function themePeek(
	anchor: HTMLElement,
	options?: {
		/** The scheme the circle shows, the opposite of the current one by default. */
		target?: (current: Scheme) => Scheme | undefined
	},
): (() => void) | undefined
