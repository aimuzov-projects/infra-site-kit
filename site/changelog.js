/**
 * Ченжлог для читателя ("Что нового"): формат записей, их проверка и разметка пунктов.
 * Записи лежат в JSON сайта (путь -- в поле `changelog` его package.json), новые сверху.
 * Технический CHANGELOG.md ведёт release-please, а запись для читателя пишется в релизный PR
 * по выводу `site-changelog context`.
 */

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Пункт в HTML: текст экранирован, ссылки `[текст](/путь/)` становятся `<a>`. */
export function itemHtml(item) {
	let html = ''
	let from = 0

	for (const m of item.matchAll(LINK)) {
		html += escape(item.slice(from, m.index)) + `<a href="${escape(m[2])}">${escape(m[1])}</a>`
		from = m.index + m[0].length
	}

	return html + escape(item.slice(from))
}

/** Пути всех ссылок пункта, для проверки, что страницы существуют. */
export const itemLinks = (item) => [...item.matchAll(LINK)].map((m) => m[2])

/** "18 октября 2026" из `2026-10-18`. */
export const releaseDate = (date, locale = 'ru-RU') =>
	new Date(`${date}T00:00:00Z`)
		.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
		.replace(/\s*г\.$/, '')

/** Якорь раздела релиза: `v1-12-0` из `1.12.0`. */
export const releaseId = (version) => `v${version.replaceAll('.', '-')}`

/**
 * Записи, которые видит читатель. Скрытая запись (`hidden: true`) только отмечает, что
 * релиз без заметных читателю изменений рассмотрен, и гард не требует её дописать.
 */
export const visibleReleases = (releases) => releases.filter((r) => !r.hidden)

/**
 * Ошибки формата: версия в semver и одна на запись, дата `YYYY-MM-DD`, новые сверху,
 * у видимой записи есть заголовок и пункты. Пустой массив -- всё в порядке.
 *
 * @param {unknown} releases
 * @param {{ icons?: string[] }} [options] Допустимые имена иконок; без списка не проверяются.
 * @returns {string[]}
 */
export function releaseErrors(releases, { icons } = {}) {
	if (!Array.isArray(releases)) return ['the changelog must be an array of releases']

	const errors = []
	const seen = new Set()

	for (const [i, r] of releases.entries()) {
		const at = typeof r?.version === 'string' ? r.version : `#${i}`

		if (!/^\d+\.\d+\.\d+$/.test(r?.version ?? '')) errors.push(`${at}: version must look like 1.2.3`)
		else if (seen.has(r.version)) errors.push(`${at}: the version is listed twice`)

		seen.add(r?.version)

		if (r?.hidden === true) continue

		const dated = /^\d{4}-\d{2}-\d{2}$/.test(r?.date ?? '')

		if (!dated) errors.push(`${at}: date must look like 2026-10-18`)

		if (typeof r?.title !== 'string' || !r.title.trim()) errors.push(`${at}: title is empty`)

		if (
			!Array.isArray(r?.items) ||
			!r.items.length ||
			r.items.some((item) => typeof item !== 'string' || !item.trim())
		)
			errors.push(`${at}: items must be a non-empty list of strings`)

		if (r?.icon !== undefined && (typeof r.icon !== 'string' || (icons && !icons.includes(r.icon))))
			errors.push(`${at}: unknown icon ${JSON.stringify(r.icon)}`)

		const next = releases.slice(i + 1).find((n) => n?.hidden !== true)

		if (dated && next && /^\d{4}-\d{2}-\d{2}$/.test(next.date ?? '') && r.date < next.date)
			errors.push(`${at}: is older than ${next.version}, newer releases go first`)
	}

	return errors
}
