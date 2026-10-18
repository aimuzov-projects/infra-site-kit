/** Цветовая схема страницы. */
export type Scheme = 'light' | 'dark'

/** Тема сайта: `auto` -- как в системе. */
export type Theme = 'auto' | Scheme

/** Схема системы по `prefers-color-scheme`. */
export function systemScheme(): Scheme

/** Тема по `<html data-theme>`: без атрибута -- `auto`. */
export function currentTheme(): Theme

/** Схема, которую даёт тема. */
export function schemeOf(theme: Theme, system: Scheme): Scheme

/** Следующая тема по клику: видимая схема переворачивается, совпавшая с системной -- снова `auto`. */
export function nextTheme(theme: Theme, system: Scheme): Theme

/**
 * Ставит тему на страницу и запоминает её; `auto` выбор забывает.
 *
 * @param options.key - Ключ в localStorage, тот же, что у theme-boot.astro. По умолчанию `theme`.
 */
export function applyTheme(theme: Theme, options?: { key?: string }): void

/** Клик по кнопке темы: переворачивает видимую схему и возвращает новую тему. */
export function toggleTheme(options?: { key?: string }): Theme

/**
 * Следит за темой: её меняет и переключатель, и сама система. Первый вызов сразу.
 *
 * @returns Отписку.
 */
export function watchTheme(callback: (theme: Theme, system: Scheme) => void): () => void
