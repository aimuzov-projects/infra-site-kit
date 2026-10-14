import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { syncYear } from '../site/year.js'

test('syncYear puts the current year into every data-year element', () => {
	const nodes = [{ textContent: '2020' }, { textContent: '' }]
	const root = { querySelectorAll: (selector) => (selector === '[data-year]' ? nodes : []) }

	syncYear(root)
	assert.deepEqual(
		nodes.map((node) => node.textContent),
		Array(2).fill(String(new Date().getFullYear())),
	)
})

test('the package exports the credit files it ships', () => {
	const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'))

	for (const target of ['./credit.astro', './credit.svelte', './year.js']) assert.ok(pkg.exports[target], target)
	assert.ok(pkg.files.includes('site'))
})
