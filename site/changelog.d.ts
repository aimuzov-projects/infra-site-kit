/** Запись ченжлога для читателя. */
export type Release = {
	version: string
	/** `YYYY-MM-DD`, как в CHANGELOG.md. */
	date: string
	title: string
	/** Имя иконки: экспорт lucide-static (`Goal`) или своя иконка сайта. */
	icon?: string
	/** Пункты; ссылка внутри -- `[текст](/путь/)`. */
	items: string[]
	/** Релиз без заметных читателю изменений: на странице не показывается. */
	hidden?: boolean
}

/** Пункт в HTML: текст экранирован, ссылки `[текст](/путь/)` становятся `<a>`. */
export function itemHtml(item: string): string

/** Пути всех ссылок пункта. */
export function itemLinks(item: string): string[]

/** "18 октября 2026" из `2026-10-18`. */
export function releaseDate(date: string, locale?: string): string

/** Якорь раздела релиза: `v1-12-0` из `1.12.0`. */
export function releaseId(version: string): string

/** Записи без скрытых. */
export function visibleReleases<T extends { hidden?: boolean }>(releases: T[]): T[]

/** Ошибки формата записей; пустой массив -- всё в порядке. */
export function releaseErrors(releases: unknown, options?: { icons?: string[] }): string[]
