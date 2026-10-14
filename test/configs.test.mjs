import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import prettier from 'prettier'
import stylelint from 'stylelint'

// `test/site` изображает сайт: берёт конфиги по имени пакета, как это делают сайты.
const site = join(import.meta.dirname, 'site')

const format = async (source, name) => {
	const filepath = join(site, name)
	return prettier.format(source, { ...(await prettier.resolveConfig(filepath)), filepath })
}

test('prettier sorts imports and formats Astro and Svelte', async () => {
	const ts = await format("import b from './b'\nimport a from 'a'\nimport fs from 'node:fs'\n", 'x.ts')
	assert.equal(ts, "import fs from 'node:fs'\nimport a from 'a'\n\nimport b from './b'\n")
	assert.equal(await format('<p   class="a">{x}</p>\n', 'x.astro'), '<p class="a">{x}</p>\n')
	assert.equal(await format('<p   class="a">{x}</p>\n', 'x.svelte'), '<p class="a">{x}</p>\n')
})

test('prettier CLI loads the config', () => {
	const input = "import b from './b'\nimport fs from 'node:fs'\n"
	const out = execFileSync('npx', ['prettier', '--stdin-filepath', 'x.mjs'], { cwd: site, input })
	assert.equal(String(out), "import fs from 'node:fs'\n\nimport b from './b'\n")
})

const lint = async (code, name) => {
	const { results } = await stylelint.lint({ code, codeFilename: join(site, name) })
	return results[0].warnings.map((w) => w.rule)
}

test('stylelint wants BEM and no tags inside blocks', async () => {
	assert.deepEqual(await lint('.card {\n\t&__title {\n\t\tcolor: red;\n\t}\n}\n', 'src/a.css'), [])
	assert.deepEqual(await lint('.card_title {\n\tcolor: red;\n}\n', 'src/a.css'), ['local/bem-class'])
	assert.deepEqual(await lint('.card p {\n\tcolor: red;\n}\n', 'src/a.css'), ['selector-max-type'])
	assert.deepEqual(await lint('p {\n\tcolor: red;\n}\n', 'src/frontend/styles/global.css'), [])
})

test('stylelint reads styles inside Svelte files', async () => {
	const svelte = '<p class="card">x</p>\n\n<style>\n\t.card_title {\n\t\tcolor: red;\n\t}\n</style>\n'
	assert.deepEqual(await lint(svelte, 'src/a.svelte'), ['local/bem-class'])
})

test('oxlint takes the rules and plugins through extends', (t) => {
	const dir = mkdtempSync(join(site, 'tmp-'))
	t.after(() => rmSync(dir, { recursive: true }))
	writeFileSync(join(dir, 'a.ts'), 'export interface A {\n\ta: string\n}\n')
	const run = () => execFileSync('npx', ['oxlint', '--deny-warnings', dir], { cwd: site, stdio: 'pipe' })
	assert.throws(run, (error) => String(error.stdout).includes('consistent-type-definitions'))
})

test('oxlint wants blank lines around blocks and before return, and fixes them', (t) => {
	const dir = mkdtempSync(join(site, 'tmp-'))
	t.after(() => rmSync(dir, { recursive: true }))
	const file = join(dir, 'a.ts')
	writeFileSync(
		file,
		'export const f = (a: number) => {\n\tconst b = a + 1\n\tif (b) {\n\t\ta++\n\t}\n\treturn b\n}\n',
	)
	const run = (...args) => execFileSync('npx', ['oxlint', ...args, dir], { cwd: site, stdio: 'pipe' })
	assert.throws(
		() => run('--deny-warnings'),
		(error) => String(error.stdout).includes('padding-line-between-statements'),
	)
	run('--fix')
	const fixed = 'export const f = (a: number) => {\n\tconst b = a + 1\n\n\tif (b) {\n\t\ta++\n\t}\n\n\treturn b\n}\n'
	assert.equal(readFileSync(file, 'utf8'), fixed)
})
