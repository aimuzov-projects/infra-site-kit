import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { coverRadius } from '../site/theme-peek.js'

test('coverRadius matches the plain circle area when the whole circle is on the screen', () => {
	const r = coverRadius(500, 500, 1000, 1000, 0.1)

	assert.ok(Math.abs(r - Math.sqrt(100_000 / Math.PI)) < 1, String(r))
})

test('coverRadius grows the circle in a corner, where three quarters of it are off the screen', () => {
	const r = coverRadius(0, 0, 1000, 1000, 0.1)

	assert.ok(Math.abs(r - Math.sqrt(400_000 / Math.PI)) < 1, String(r))
})

test('the package exports the theme peek files it ships', () => {
	const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'))

	for (const target of ['./theme-peek.js', './theme-peek.css']) assert.ok(pkg.exports[target], target)
})
