/**
 * Puts the current year into the `data-year` elements. Pages are built ahead of time, so the
 * build year would stay until the next deploy; the browser fixes it by the visitor's clock.
 * @param {ParentNode} [root]
 */
export function syncYear(root = document) {
	const year = String(new Date().getFullYear())

	for (const node of root.querySelectorAll('[data-year]')) node.textContent = year
}
