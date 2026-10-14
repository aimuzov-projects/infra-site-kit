import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'

import { metrikaPixel, metrikaScript, scriptHash } from '../site/metrika.js'

// Заглушка страницы: DOM ровно настолько, чтобы загрузчик подключился
// и было видно, что он вставляет.
const page = () => {
	const listeners = {}
	const inserted = []
	const first = { parentNode: { insertBefore: (node) => inserted.push(node) } }
	const window = {
		addEventListener: (name, fn) => (listeners[name] = fn),
		removeEventListener: (name) => delete listeners[name],
	}
	const document = {
		readyState: 'loading',
		referrer: 'https://ref.example/',
		scripts: [],
		createElement: () => ({}),
		getElementsByTagName: () => [first],
	}
	window.window = window
	window.document = document
	window.location = { href: 'https://site.example/page' }

	return { window, listeners, inserted }
}

test('the counter queues the init and loads tag.js only on the first interaction', () => {
	const { window, listeners, inserted } = page()

	vm.runInNewContext(metrikaScript(42), window)
	assert.equal(window.ym.a.length, 1)
	assert.deepEqual([...window.ym.a[0]].slice(0, 2), [42, 'init'])
	assert.equal(window.ym.a[0][2].webvisor, false)
	assert.equal(window.ym.a[0][2].url, 'https://site.example/page')
	assert.equal(inserted.length, 0)

	listeners.pointerdown()
	assert.equal(inserted.length, 1)
	assert.equal(inserted[0].src, 'https://mc.yandex.ru/metrika/tag.js?id=42')
	assert.equal(listeners.scroll, undefined)
})

test('init options override the defaults', () => {
	const { window } = page()

	vm.runInNewContext(metrikaScript(42, { webvisor: true }), window)
	assert.equal(window.ym.a[0][2].webvisor, true)
	assert.equal(window.ym.a[0][2].clickmap, true)
})

test('the counter id has to be a plain number', () => {
	for (const id of ['42', 0, -1, 1.5, '1); alert(1']) {
		assert.throws(() => metrikaScript(id), TypeError)
		assert.throws(() => metrikaPixel(id), TypeError)
	}
})

test('the hash is what a browser computes for the script body', () => {
	assert.equal(scriptHash('alert(1)'), 'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI=')
})

test('the package exports the Metrika components', () => {
	const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'))

	for (const target of ['./metrika.astro', './metrika-pixel.astro']) assert.ok(pkg.exports[target], target)
})
