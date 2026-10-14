/**
 * Проставляет текущий год в элементы с `data-year`. Страницы собираются заранее, поэтому год
 * сборки так бы и висел до следующего деплоя, а браузер исправляет его по часам посетителя.
 * @param {ParentNode} [root] Где искать элементы, по умолчанию весь `document`.
 */
export function syncYear(root = document) {
	const year = String(new Date().getFullYear())

	for (const node of root.querySelectorAll('[data-year]')) node.textContent = year
}
