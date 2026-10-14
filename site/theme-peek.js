/**
 * A peek at the other theme from a theme switch. The closer the pointer gets to the button,
 * the wider a faint circle grows around it; on hover the circle opens to a third of the
 * screen. Inside the circle the page is drawn in the other scheme: it is a copy of the page
 * laid over it, and a click puts the circle out until the next hover.
 */

/** @typedef {'light' | 'dark'} Scheme */

/** Distance from the button center at which the circle starts to show. */
const REACH = 260
/** Circle radius right at the button: a hint, not yet a preview. */
const NEAR = 60
/** How strongly the other theme shows through at the button; full strength only on hover. */
const FAINT = 0.35
/** Share of the screen the open circle covers. */
const COVER = 0.33

/**
 * Peeks on the page. A switch with a button per theme has several of them side by side: the
 * circle belongs only to the button nearest the pointer, so they don't stack.
 * @type {Map<HTMLElement, { update: () => void, live: () => boolean }>}
 */
const peeks = new Map()
/** After a click every circle is out until the pointer comes onto one of the buttons again. */
let dismissed = false

/**
 * @param {HTMLElement} anchor
 * @param {{ x: number, y: number }} pointer
 */
function distance(anchor, pointer) {
	const rect = anchor.getBoundingClientRect()

	return Math.hypot(pointer.x - rect.left - rect.width / 2, pointer.y - rect.top - rect.height / 2)
}

function updateAll() {
	for (const { update } of peeks.values()) update()
}

/**
 * The scheme the page is drawn in now. A site may keep its choice in an attribute or a class,
 * but either way it ends up in the root color-scheme; "light dark" means the system decides.
 * @returns {Scheme}
 */
export function currentScheme() {
	const value = getComputedStyle(document.documentElement).colorScheme
	const light = /\blight\b/.test(value)
	const dark = /\bdark\b/.test(value)

	if (light !== dark) return dark ? 'dark' : 'light'

	return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * The area of the part of a circle that falls on the screen: chords summed by pixel columns.
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {number} width
 * @param {number} height
 */
function visibleArea(cx, cy, r, width, height) {
	let area = 0

	for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(width, cx + r); x++) {
		const half = Math.sqrt(Math.max(0, r * r - (x + 0.5 - cx) ** 2))

		area += Math.max(0, Math.min(height, cy + half) - Math.max(0, cy - half))
	}

	return area
}

/**
 * The radius at which a circle centered at (cx, cy) covers `share` of a width × height screen.
 * The button sits near an edge and most of the circle falls off it, so there is no formula:
 * the radius is found by bisection.
 * @param {number} cx
 * @param {number} cy
 * @param {number} width
 * @param {number} height
 * @param {number} [share]
 */
export function coverRadius(cx, cy, width, height, share = COVER) {
	const target = width * height * share
	let low = 0
	let high = Math.hypot(width, height) * 2

	for (let i = 0; i < 24; i++) {
		const mid = (low + high) / 2

		if (visibleArea(cx, cy, mid, width, height) < target) low = mid
		else high = mid
	}

	return high
}

/**
 * cloneNode carries neither what was typed into the fields nor how far the containers are
 * scrolled; without this the copy would show an empty form and lists rolled back to the top.
 * Scroll positions only stick once the copy is in the document.
 * @param {Element} from
 * @param {Element} to
 */
function copyState(from, to) {
	const source = from.querySelectorAll('*')
	const target = to.querySelectorAll('*')

	source.forEach((node, i) => {
		const twin = target[i]

		if (!twin) return

		if (node.scrollTop || node.scrollLeft) twin.scrollTo(node.scrollLeft, node.scrollTop)

		if (node instanceof HTMLInputElement && twin instanceof HTMLInputElement) twin.checked = node.checked

		if ('value' in node && 'value' in twin && node.matches('input, textarea, select')) twin.value = node.value
	})
}

/**
 * Copies the page, leaving out the scripts and the copies of every peek, its own included,
 * and paints it in `scheme`.
 * color-scheme flips the light-dark() colors; the light/dark class is for sites that switch
 * their tokens by a class.
 * @param {HTMLElement} copy
 * @param {Scheme} scheme
 */
function fill(copy, scheme) {
	const pairs = [...document.body.children]
		.filter((child) => !child.classList.contains('theme-peek') && child.tagName !== 'SCRIPT')
		.map((child) => [child, /** @type {Element} */ (child.cloneNode(true))])

	copy.replaceChildren(...pairs.map(([, twin]) => twin))
	copy.style.colorScheme = scheme
	copy.classList.toggle('light', scheme === 'light')
	copy.classList.toggle('dark', scheme === 'dark')
	copy.dataset.scheme = scheme

	for (const [node, twin] of pairs) copyState(node, twin)
}

/**
 * Attaches the peek to a theme button. Works as a Svelte attachment as is:
 * `{@attach themePeek}`; returns the cleanup.
 * @param {HTMLElement} anchor
 * @param {{ target?: () => Scheme | undefined }} [options] `target` is the scheme the circle
 * shows, the opposite of the current one by default. When it matches the current scheme there
 * is nothing to show and the circle stays hidden.
 * @returns {(() => void) | undefined}
 */
export function themePeek(anchor, { target = () => (currentScheme() === 'dark' ? 'light' : 'dark') } = {}) {
	// Without a mouse there is nothing to approach with, and reduced motion asks for no circle.
	if (!matchMedia('(hover: hover)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return

	/** @type {HTMLElement | undefined} */
	let peek
	/** @type {{ x: number, y: number } | undefined} */
	let pointer
	let hovered = false

	/**
	 * @param {number} cx
	 * @param {number} cy
	 */
	function shape(cx, cy) {
		if (dismissed || !live()) return { r: 0, opacity: 0 }

		if (hovered) return { r: coverRadius(cx, cy, document.documentElement.clientWidth, innerHeight), opacity: 1 }

		if (!pointer) return { r: 0, opacity: 0 }

		const own = Math.hypot(pointer.x - cx, pointer.y - cy)

		for (const [other, { live: otherLive }] of peeks) {
			if (other !== anchor && otherLive() && distance(other, pointer) < own) return { r: 0, opacity: 0 }
		}

		const closeness = Math.max(0, 1 - own / REACH)

		// Squared: far away the circle barely grows, near the button it gains fast.
		return { r: NEAR * closeness ** 2, opacity: FAINT * closeness }
	}

	/** Whether the button has anything to show: its scheme differs from the current one. */
	function live() {
		const scheme = target()

		return Boolean(scheme) && scheme !== currentScheme()
	}

	function update() {
		const rect = anchor.getBoundingClientRect()
		const cx = rect.left + rect.width / 2
		const cy = rect.top + rect.height / 2
		const scheme = target()
		const { r, opacity } = shape(cx, cy)

		if (!r && !peek) return

		if (!peek) {
			peek = document.createElement('div')
			peek.className = 'theme-peek'
			peek.inert = true
			peek.ariaHidden = 'true'
			document.body.append(peek)
		}

		// A shrinking circle keeps its old copy; a fresh copy is taken only for a growing one.
		if (r && scheme && peek.dataset.scheme !== scheme) {
			const first = !peek.dataset.scheme

			fill(peek, scheme)

			// The first frame has a zero circle, otherwise the transition has nothing to grow from.
			if (first) peek.getBoundingClientRect()
		}

		// The copy scrolls with the page, so the center is in document coordinates.
		peek.style.setProperty('--peek-x', `${cx + scrollX}px`)
		peek.style.setProperty('--peek-y', `${cy + scrollY}px`)
		peek.style.setProperty('--peek-r', `${r}px`)
		peek.style.opacity = String(opacity)
		peek.classList.toggle('theme-peek--open', hovered && r > 0)
	}

	/** @param {TransitionEvent} event */
	function onTransitionEnd(event) {
		if (
			peek &&
			event.target === peek &&
			event.propertyName === '--peek-r' &&
			peek.style.getPropertyValue('--peek-r') === '0px'
		) {
			peek.remove()
			peek = undefined
		}
	}

	/** @param {PointerEvent} event */
	function onMove(event) {
		pointer = { x: event.clientX, y: event.clientY }
		update()
	}

	function onLeaveWindow() {
		pointer = undefined
		hovered = false
		update()
	}

	function onEnter() {
		hovered = true
		dismissed = false
		updateAll()
	}

	function onLeave() {
		hovered = false
		update()
	}

	// The choice is made: the circle has done its job and goes out.
	function onClick() {
		dismissed = true
		updateAll()
	}

	peeks.set(anchor, { update, live })
	addEventListener('pointermove', onMove, { passive: true })
	addEventListener('scroll', update, { passive: true })
	addEventListener('resize', update)
	addEventListener('transitionend', onTransitionEnd)
	document.documentElement.addEventListener('pointerleave', onLeaveWindow)
	anchor.addEventListener('pointerenter', onEnter)
	anchor.addEventListener('pointerleave', onLeave)
	anchor.addEventListener('click', onClick)

	return () => {
		peeks.delete(anchor)
		removeEventListener('pointermove', onMove)
		removeEventListener('scroll', update)
		removeEventListener('resize', update)
		removeEventListener('transitionend', onTransitionEnd)
		document.documentElement.removeEventListener('pointerleave', onLeaveWindow)
		anchor.removeEventListener('pointerenter', onEnter)
		anchor.removeEventListener('pointerleave', onLeave)
		anchor.removeEventListener('click', onClick)
		peek?.remove()
	}
}
