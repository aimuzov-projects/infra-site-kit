/**
 * Тема сайта без разметки: как в системе, светлая или тёмная. Выбор живёт на
 * `<html data-theme>` и в localStorage; без атрибута тему ведёт `prefers-color-scheme`.
 * До отрисовки его ставит theme-boot.astro, кнопку и подписи сайт рисует сам.
 */

/** @typedef {'light' | 'dark'} Scheme */
/** @typedef {'auto' | Scheme} Theme */

const media = () => matchMedia('(prefers-color-scheme: dark)')

/** @returns {Scheme} */
export const systemScheme = () => (media().matches ? 'dark' : 'light')

/** @returns {Theme} */
export function currentTheme() {
	const theme = document.documentElement.dataset.theme

	return theme === 'light' || theme === 'dark' ? theme : 'auto'
}

/**
 * Схема, которую даёт тема.
 * @param {Theme} theme
 * @param {Scheme} system
 * @returns {Scheme}
 */
export const schemeOf = (theme, system) => (theme === 'auto' ? system : theme)

/**
 * Следующая тема по клику. Клик всегда переворачивает видимую схему, иначе из "как в
 * системе" можно попасть в ту же схему, и клик выглядит пустым. Совпала новая схема с
 * системной -- это снова "как в системе", а не выбор, прибитый к localStorage.
 * @param {Theme} theme
 * @param {Scheme} system
 * @returns {Theme}
 */
export function nextTheme(theme, system) {
	const next = schemeOf(theme, system) === 'dark' ? 'light' : 'dark'

	return next === system ? 'auto' : next
}

/**
 * Ставит тему на страницу и запоминает её; `auto` выбор забывает.
 * @param {Theme} theme
 * @param {{ key?: string }} [options] Ключ в localStorage, тот же, что у theme-boot.astro.
 */
export function applyTheme(theme, { key = 'theme' } = {}) {
	const root = document.documentElement

	if (theme === 'auto') delete root.dataset.theme
	else root.dataset.theme = theme

	try {
		if (theme === 'auto') localStorage.removeItem(key)
		else localStorage.setItem(key, theme)
	} catch {
		// Хранилище закрыто (приватный режим) -- тема продержится до перезагрузки.
	}
}

/**
 * Клик по кнопке темы: переворачивает видимую схему.
 * @param {{ key?: string }} [options]
 * @returns {Theme} Новая тема.
 */
export function toggleTheme(options) {
	const theme = nextTheme(currentTheme(), systemScheme())

	applyTheme(theme, options)

	return theme
}

/**
 * Следит за темой: её меняет и переключатель (в том числе в другом компоненте), и сама система.
 * Первый вызов сразу, с тем, что есть сейчас: в браузере кнопке не нужно читать тему отдельно.
 * @param {(theme: Theme, system: Scheme) => void} callback
 * @returns {() => void} Отписка.
 */
export function watchTheme(callback) {
	const sync = () => callback(currentTheme(), systemScheme())
	const query = media()
	const observer = new MutationObserver(sync)

	query.addEventListener('change', sync)
	observer.observe(document.documentElement, { attributeFilter: ['data-theme'] })
	sync()

	return () => {
		query.removeEventListener('change', sync)
		observer.disconnect()
	}
}
