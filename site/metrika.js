import { createHash } from 'node:crypto'

// Yandex Metrika for the sites. On mobile the ~85 KB counter script steals bandwidth from
// fonts and the first photo, so it loads on first interaction or 4 s after load, earlier
// ym calls are queued. Webvisor is off: on mobile it noticeably raises LCP.

// Runs in the page as is, so it's ES5 like the stock snippet.
function loader(m, e, t, r, i, k, a) {
	m[i] =
		m[i] ||
		function () {
			;(m[i].a = m[i].a || []).push(arguments)
		}

	m[i].l = 1 * new Date()

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

/** What the counter needs in the CSP on top of the site's own sources. */
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
	// The id goes into the script text, so it has to be a plain counter number.
	if (!Number.isSafeInteger(id) || id <= 0) throw new TypeError(`Metrika counter id must be a number, got ${id}`)
}

/** Body of the inline script: the lazy loader and the counter init, `init` overrides the defaults. */
export function metrikaScript(id, init = {}) {
	checkId(id)
	const url = `https://mc.yandex.ru/metrika/tag.js?id=${id}`
	const options = JSON.stringify({ ...defaults, ...init })

	return [
		`;(${loader})(window, document, 'script', ${JSON.stringify(url)}, 'ym')`,
		`ym(${id}, 'init', Object.assign(${options}, { referrer: document.referrer, url: location.href }))`,
	].join('\n')
}

/** Address of the pixel for visitors without JavaScript. */
export function metrikaPixel(id) {
	checkId(id)

	return `https://mc.yandex.ru/watch/${id}`
}

/** CSP hash of an inline script with this exact body, in the form Astro.csp takes. */
export const scriptHash = (code) => `sha256-${createHash('sha256').update(code).digest('base64')}`
