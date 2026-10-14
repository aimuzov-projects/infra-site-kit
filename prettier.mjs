import { fileURLToPath } from 'node:url'

// Plugins go in as paths resolved from here: they are dependencies of the kit, and the
// site may not see them by name. Not as modules: the CLI copies the config and trips the
// lazy getters of sort-imports, which want optional ember and oxc plugins.
const plugin = (name) => fileURLToPath(import.meta.resolve(name))
const astro = plugin('prettier-plugin-astro')
const svelte = plugin('prettier-plugin-svelte')
const sortImports = plugin('@ianvs/prettier-plugin-sort-imports')

export default {
	useTabs: true,
	semi: false,
	singleQuote: true,
	trailingComma: 'all',
	plugins: [astro, svelte],
	overrides: [
		{ files: '*.astro', options: { parser: 'astro' } },
		{ files: '*.svelte', options: { parser: 'svelte' } },
		{
			files: ['*.ts', '*.mjs', '*.js'],
			options: {
				plugins: [sortImports],
				importOrder: ['<BUILTIN_MODULES>', '<THIRD_PARTY_MODULES>', '', '^#', '', '^[.]'],
			},
		},
	],
}
