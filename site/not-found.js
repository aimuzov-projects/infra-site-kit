/**
 * Логика общей 404 без разметки: подсказки "Возможно, вы искали" по sitemap и кнопка "Назад".
 * Разметку рисует not-found.astro, этот модуль её оживляет.
 */

import { loadSitemapPaths } from './sitemap.js'

/**
 * Путь без регистра, `.html`, `index` и хвостового слеша: `/Docs/Index.html` и `/docs/`
 * сравниваются как один адрес. Главная превращается в пустую строку.
 * @param {string} path
 */
function normalize(path) {
	let decoded = path

	try {
		decoded = decodeURI(path)
	} catch {
		// Битый %-код оставляем как есть, сравнение просто выйдет хуже.
	}

	return decoded
		.toLowerCase()
		.replace(/\/{2,}/g, '/')
		.replace(/\.html?$/, '')
		.replace(/\/index$/, '')
		.replace(/\/+$/, '')
}

/** Расстояние Левенштейна: сколько вставок, удалений и замен превращают `a` в `b`. */
function distance(a, b) {
	let row = Array.from({ length: b.length + 1 }, (_, j) => j)

	for (let i = 1; i <= a.length; i++) {
		const next = [i]

		for (let j = 1; j <= b.length; j++) {
			next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
		}

		row = next
	}

	return row[b.length]
}

/**
 * Страницы, похожие на ненайденный адрес, лучшие первыми.
 *
 * Похожая -- это опечатка (правок не больше трети длины, минимум две) или страница,
 * которой адрес продолжается по сегментам: `/docs/old/page` подскажет `/docs`.
 * Главную не предлагаем, на неё и так ведёт кнопка.
 *
 * На двуязычном сайте у каждого языка своя 404: `scope` оставляет страницы под своим
 * префиксом, `exclude` убирает чужие, и русская 404 не подскажет английскую страницу.
 *
 * @param {string} path Ненайденный путь.
 * @param {string[]} paths Пути страниц сайта.
 * @param {{ limit?: number, scope?: string, exclude?: string[] }} [options]
 * @returns {string[]}
 */
export function suggestPaths(path, paths, { limit = 3, scope = '/', exclude = [] } = {}) {
	const target = normalize(path)
	const root = normalize(scope)
	const under = (key, prefix) => key === prefix || key.startsWith(`${prefix}/`)
	const foreign = exclude.map(normalize)
	const budget = Math.max(2, Math.ceil(target.length / 3))
	const seen = new Set()
	const scored = []

	for (const candidate of paths) {
		const key = normalize(candidate)

		// Главная языка -- та же кнопка "На главную", её тоже не предлагаем.
		if (!key || key === root || seen.has(key)) continue

		if (!under(key, root) || foreign.some((prefix) => under(key, prefix))) continue

		seen.add(key)

		const edits = distance(target, key)
		// Родитель по сегментам хуже любой опечатки, но ближайший родитель лучше дальнего.
		const parent = target.startsWith(`${key}/`) ? budget + target.split('/').length - key.split('/').length : null
		const score = edits <= budget ? edits : parent

		if (score !== null) scored.push({ candidate, score })
	}

	return scored
		.sort((a, b) => a.score - b.score || a.candidate.length - b.candidate.length)
		.slice(0, limit)
		.map(({ candidate }) => candidate)
}

/**
 * Есть ли куда вернуться: человек пришёл с этого же сайта, а не по внешней ссылке
 * или из закладки. Иначе "Назад" увёл бы с сайта или не сделал ничего.
 *
 * @param {{ referrer: string, location: { origin: string } }} [doc]
 * @param {{ length: number }} [hist]
 */
export function canGoBack(doc = document, hist = history) {
	if (hist.length < 2 || !doc.referrer) return false

	try {
		return new URL(doc.referrer).origin === doc.location.origin
	} catch {
		return false
	}
}

/**
 * Оживляет разметку not-found.astro: показывает "Назад", если есть куда, и подгружает
 * подсказки из sitemap, если `data-sitemap` задан. `data-scope` и `data-exclude` (префиксы
 * через запятую) сужают подсказки так же, как `scope` и `exclude` у suggestPaths. Пока подсказок нет или sitemap
 * не загрузилась, блок остаётся скрытым: 404 работает и без него.
 *
 * @param {HTMLElement} root Элемент с `data-not-found`.
 * @returns {Promise<void>}
 */
export async function notFound(root) {
	const back = root.querySelector('[data-not-found-back]')

	if (back && canGoBack()) {
		back.hidden = false
		back.addEventListener('click', () => history.back())
	}

	const block = root.querySelector('[data-not-found-suggest]')
	const list = block?.querySelector('[data-not-found-list]')
	const index = root.dataset.sitemap

	if (!list || !index) return

	let paths

	try {
		paths = await loadSitemapPaths(index)
	} catch {
		return
	}

	const found = suggestPaths(location.pathname, paths, {
		scope: root.dataset.scope,
		exclude: root.dataset.exclude?.split(',').filter(Boolean),
	})

	if (!found.length) return

	list.replaceChildren(
		...found.map((path) => {
			const item = document.createElement('li')
			const link = document.createElement('a')

			link.className = 'not-found__link'
			link.href = path
			link.textContent = decodeURI(path)
			item.append(link)

			return item
		}),
	)

	block.hidden = false
}
