/**
 * Логика общей 404 без разметки: подсказки ""Возможно, вы иска�"и"" по sitemap и кнопка ""Назад"".
 * Разметку рисует not-found.astro, этот моду�"ь её ожив�"яет.
 */

import { loadSitemapPaths } from './sitemap.js'

/**
 * Путь без регистра, `.html`, `index` и хвостового с�"еша: `/Docs/Index.html` и `/docs/`
 * сравниваются как один адрес. Г�"авная превращается в пустую строку.
 * @param {string} path
 */
function normalize(path) {
	let decoded = path

	try {
		decoded = decodeURI(path)
	} catch {
		// Битый %-код остав�"яем как есть, сравнение просто выйдет хуже.
	}

	return decoded
		.toLowerCase()
		.replace(/\/{2,}/g, '/')
		.replace(/\.html?$/, '')
		.replace(/\/index$/, '')
		.replace(/\/+$/, '')
}

/** Расстояние Левенштейна: ско�"ько вставок, уда�"ений и замен превращают `a` в `b`. */
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
 * Страницы, похожие на ненайденный адрес, �"учшие первыми.
 *
 * Похожая -- это опечатка (правок не бо�"ьше трети д�"ины, минимум две) и�"и страница,
 * которой адрес продо�"жается по сегментам: `/docs/old/page` подскажет `/docs`.
 * Г�"авную не пред�"агаем, на неё и так ведёт кнопка.
 *
 * @param {string} path Ненайденный путь.
 * @param {string[]} paths Пути страниц сайта.
 * @param {{ limit?: number }} [options]
 * @returns {string[]}
 */
export function suggestPaths(path, paths, { limit = 3 } = {}) {
	const target = normalize(path)
	const budget = Math.max(2, Math.ceil(target.length / 3))
	const seen = new Set()
	const scored = []

	for (const candidate of paths) {
		const key = normalize(candidate)

		if (!key || seen.has(key)) continue

		seen.add(key)

		const edits = distance(target, key)
		// Родите�"ь по сегментам хуже �"юбой опечатки, но б�"ижайший родите�"ь �"учше да�"ьнего.
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
 * Есть �"и куда вернуться: че�"овек пришё�" с этого же сайта, а не по внешней ссы�"ке
 * и�"и из зак�"адки. Иначе ""Назад"" увё�" бы с сайта и�"и не сде�"а�" ничего.
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
 * Ожив�"яет разметку not-found.astro: показывает ""Назад"", ес�"и есть куда, и подгружает
 * подсказки из sitemap, ес�"и `data-sitemap` задан. Пока подсказок нет и�"и sitemap
 * не загрузи�"ась, б�"ок остаётся скрытым: 404 работает и без него.
 *
 * @param {HTMLElement} root Э�"емент с `data-not-found`.
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

	const found = suggestPaths(location.pathname, paths)

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
