import { createHash } from 'node:crypto'

// Яндекс Метрика для сайтов. На мобилках скрипт счётчика (~85 КБ) отъедает канал
// у шрифтов и первой фотографии, поэтому он грузится на первое взаимодействие
// или через 4 с после load, а вызовы ym до этого копятся в очереди.
// Вебвизор выключен: на мобилках он заметно поднимает LCP.

// Выполняется на странице как есть, поэтому ES5, как и штатный сниппет.
function loader(m, e, t, r, i, k, a) {
	m[i] =
		m[i] ||
		function () {
			;(m[i].a = m[i].a || []).push(arguments)
		}

	m[i].l = 1 * new Date()

	// Скрипт счётчика уже на странице -- второй раз не грузим.
	for (var j = 0; j < document.scripts.length; j++) {
		if (document.scripts[j].src === r) {
			return
		}
	}

	var events = ['scroll', 'pointerdown', 'keydown', 'touchstart']
	var load = function () {
		if (k) return

		events.forEach(function (name) {
			m.removeEventListener(name, load)
		})

		k = e.createElement(t)
		a = e.getElementsByTagName(t)[0]
		k.async = 1
		k.src = r
		a.parentNode.insertBefore(k, a)
	}

	events.forEach(function (name) {
		m.addEventListener(name, load, { passive: true })
	})

	var later = function () {
		setTimeout(load, 4000)
	}

	if (e.readyState === 'complete') later()
	else m.addEventListener('load', later)
}

const defaults = {
	ssr: true,
	webvisor: false,
	clickmap: true,
	ecommerce: 'dataLayer',
	accurateTrackBounce: true,
	trackLinks: true,
}

/** Что нужно счётчику в CSP сверх собственных источников сайта. */
export const metrikaCsp = {
	scriptResources: ['https://mc.yandex.ru', 'https://yastatic.net'],
	directives: [
		'img-src https://mc.yandex.ru',
		'connect-src https://mc.yandex.ru',
		'frame-src blob: https://mc.yandex.ru',
		'child-src blob: https://mc.yandex.ru',
	],
}

const checkId = (id) => {
	// id подставляется прямо в текст скрипта, поэтому это должен быть просто номер счётчика.
	if (!Number.isSafeInteger(id) || id <= 0) throw new TypeError(`Metrika counter id must be a number, got ${id}`)
}

/**
 * Тело инлайн-скрипта: ленивый загрузчик и инициализация счётчика.
 *
 * @param id - Номер счётчика в Яндекс Метрике.
 * @param init - Опции `ym(id, 'init')`, перекрывают значения по умолчанию.
 */
export function metrikaScript(id, init = {}) {
	checkId(id)
	const url = `https://mc.yandex.ru/metrika/tag.js?id=${id}`
	const options = JSON.stringify({ ...defaults, ...init })

	return [
		`;(${loader})(window, document, 'script', ${JSON.stringify(url)}, 'ym')`,
		`ym(${id}, 'init', Object.assign(${options}, { referrer: document.referrer, url: location.href }))`,
	].join('\n')
}

/**
 * Адрес пикселя для посетителей без JavaScript.
 *
 * @param id - Номер счётчика в Яндекс Метрике.
 */
export function metrikaPixel(id) {
	checkId(id)

	return `https://mc.yandex.ru/watch/${id}`
}

/** CSP-хеш инлайн-скрипта ровно с таким телом, в том виде, в каком его принимает `Astro.csp`. */
export const scriptHash = (code) => `sha256-${createHash('sha256').update(code).digest('base64')}`
