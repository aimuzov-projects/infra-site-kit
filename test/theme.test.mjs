import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'

import { applyTheme, currentTheme, nextTheme, toggleTheme, watchTheme } from '../site/theme.js'

// Заглушка страницы: корень с dataset, хранилище, системная схема и наблюдатель
// за атрибутом, который тест дёргает руками.
const page = {
	dark: false,
	/** @type {Set<Function>} */
	mediaListeners: new Set(),
	/** @type {Set<Function>} */
	observers: new Set(),
	setSystem(dark) {
		page.dark = dark
		for (const fn of page.mediaListeners) fn()
	},
}

const store = new Map()
const root = { dataset: {} }

Object.assign(globalThis, {
	document: { documentElement: root },
	localStorage: {
		getItem: (key) => store.get(key) ?? null,
		setItem: (key, value) => store.set(key, value),
		removeItem: (key) => store.delete(key),
	},
	matchMedia: () => ({
		get matches() {
			return page.dark
		},
		addEventListener: (_, fn) => page.mediaListeners.add(fn),
		removeEventListener: (_, fn) => page.mediaListeners.delete(fn),
	}),
	MutationObserver: class {
		constructor(fn) {
			this.fn = fn
		}
		observe() {
			page.observers.add(this.fn)
		}
		disconnect() {
			page.observers.delete(this.fn)
		}
	},
})

const reset = () => {
	store.clear()
	delete root.dataset.theme
	page.dark = false
}

test('a click always flips the visible scheme and lands back on auto when it matches the system', () => {
	assert.equal(nextTheme('auto', 'light'), 'dark')
	assert.equal(nextTheme('dark', 'light'), 'auto')
	assert.equal(nextTheme('auto', 'dark'), 'light')
	assert.equal(nextTheme('light', 'dark'), 'auto')
	// Выбор против системы, а система сменилась вслед за ним: клик снова видимо меняет схему.
	assert.equal(nextTheme('dark', 'dark'), 'light')
})

test('applyTheme writes the choice under the given key and forgets it on auto', () => {
	reset()

	applyTheme('dark', { key: 'site:theme' })
	assert.equal(root.dataset.theme, 'dark')
	assert.equal(store.get('site:theme'), 'dark')
	assert.equal(currentTheme(), 'dark')

	applyTheme('auto', { key: 'site:theme' })
	assert.equal(root.dataset.theme, undefined)
	assert.equal(store.has('site:theme'), false)
	assert.equal(currentTheme(), 'auto')
})

test('applyTheme still sets the attribute when storage is closed', () => {
	reset()

	const { setItem } = localStorage

	localStorage.setItem = () => {
		throw new Error('closed')
	}
	applyTheme('light')
	localStorage.setItem = setItem

	assert.equal(root.dataset.theme, 'light')
})

test('toggleTheme goes dark and back to auto on a light system', () => {
	reset()

	assert.equal(toggleTheme(), 'dark')
	assert.equal(store.get('theme'), 'dark')
	assert.equal(toggleTheme(), 'auto')
	assert.equal(store.has('theme'), false)
})

test('watchTheme reports the current theme, then system and attribute changes and attribute changes until unsubscribed', () => {
	reset()

	const seen = []
	const stop = watchTheme((theme, system) => seen.push(`${theme}/${system}`))

	page.setSystem(true)
	root.dataset.theme = 'light'
	for (const fn of page.observers) fn()
	stop()
	page.setSystem(false)

	assert.deepEqual(seen, ['auto/light', 'auto/dark', 'light/dark'])
	assert.equal(page.observers.size, 0)
})

const boot = readFileSync(join(import.meta.dirname, '..', 'site', 'theme-boot.js'), 'utf8')

/** Прогоняет boot-скрипт на свежей странице с тегом `data-key` или без него. */
function runBoot(stored, key) {
	const html = { dataset: {} }
	const storage = new Map(Object.entries(stored))

	vm.runInNewContext(boot, {
		document: { documentElement: html, currentScript: { dataset: key ? { key } : {} } },
		localStorage: { getItem: (name) => storage.get(name) ?? null },
	})

	return html.dataset.theme
}

test('the boot script applies a stored scheme under data-key or the default key', () => {
	assert.equal(runBoot({ theme: 'dark' }), 'dark')
	assert.equal(runBoot({ 'site:theme': 'light' }, 'site:theme'), 'light')
	assert.equal(runBoot({ theme: 'dark' }, 'site:theme'), undefined)
	assert.equal(runBoot({ theme: 'sepia' }), undefined)
})

test('the boot script survives closed storage', () => {
	assert.doesNotThrow(() =>
		vm.runInNewContext(boot, {
			document: { documentElement: { dataset: {} }, currentScript: null },
			localStorage: {
				getItem() {
					throw new Error('closed')
				},
			},
		}),
	)
})

test('the package exports the theme files it ships', () => {
	const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'))

	for (const target of ['./theme.js', './theme-boot.astro']) assert.ok(pkg.exports[target], target)
})
