import { fileURLToPath } from 'node:url'

// Плагины подключаем путями, которые резолвим отсюда: это зависимости кита,
// и сайт может не видеть их по имени. Не модулями потому что CLI копирует конфиг
// и дёргает ленивые геттеры sort-imports, а им нужны опциональные плагины ember и oxc.
const plugin = (name) => fileURLToPath(import.meta.resolve(name))
const astro = plugin('prettier-plugin-astro')
const svelte = plugin('prettier-plugin-svelte')
const sortImports = plugin('@ianvs/prettier-plugin-sort-imports')

/**
 * Общий конфиг Prettier для сайтов.
 */
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
				// `''` -- пустая строка между группами: модули, затем `#`-импорты, затем относительные.
				importOrder: ['<BUILTIN_MODULES>', '<THIRD_PARTY_MODULES>', '', '^#', '', '^[.]'],
			},
		},
	],
}
