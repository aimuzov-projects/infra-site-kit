import postcssHtml from 'postcss-html'
import stylelint from 'stylelint'
import { propertyGroups } from 'stylelint-config-clean-order'
import order from 'stylelint-order'

// Только БЭМ: классы вида block__elem--mod и никаких тегов внутри блоков.
const name = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*'
const mod = '[a-z0-9]+(?:-[a-z0-9]+)*'
const bem = new RegExp(`^${name}(?:__${name})?(?:--${mod})?$`)

// Встроенный `selector-class-pattern` не видит `&__elem` (селекторы без точки
// он пропускает), а в Stylelint 17 убрали `resolveNestedSelectors`. Поэтому
// склеиваем `&` с родителем сами, так же как это делает postcss-nested.
const ruleName = 'local/bem-class'
const messages = stylelint.utils.ruleMessages(ruleName, {
	rejected: (cls) => `Class ".${cls}" is not BEM: block__elem--mod`,
})

const resolve = (rule) => {
	let parent = rule.parent
	while (parent && parent.type !== 'rule' && parent.type !== 'root') parent = parent.parent
	if (!parent || parent.type === 'root') return rule.selectors
	return resolve(parent).flatMap((p) =>
		rule.selectors.map((s) => (s.includes('&') ? s.replaceAll('&', p) : `${p} ${s}`)),
	)
}

const bemClass = stylelint.createPlugin(ruleName, (on) => (root, result) => {
	if (!on) return
	root.walkRules((rule) => {
		if (rule.parent?.type === 'atrule' && rule.parent.name.endsWith('keyframes')) return
		// Один и тот же класс репортим один раз на правило, даже если он в нескольких селекторах.
		const seen = new Set()
		for (const selector of resolve(rule))
			for (const [, cls] of selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
				if (bem.test(cls) || seen.has(cls)) continue
				seen.add(cls)
				stylelint.utils.report({ result, ruleName, node: rule, message: messages.rejected(cls) })
			}
	})
})

/**
 * Общий конфиг Stylelint для сайтов.
 *
 * Синтаксис подключаем модулем потому что postcss-html -- зависимость кита,
 * и сайт может не видеть его по имени.
 */
export default {
	customSyntax: postcssHtml,
	plugins: [bemClass, order],
	rules: {
		[ruleName]: true,
		// Блок читается сверху вниз: свои свойства, его `@media`, потом его элементы.
		'order/order': ['custom-properties', 'declarations', { type: 'at-rule', name: 'media' }, 'rules'],
		// Группы из clean-order (позиционирование, раскладка, размеры, текст, внешний вид, анимация),
		// но без пустых строк между ними.
		'order/properties-order': [propertyGroups.map((properties) => ({ properties })), { unspecified: 'bottom' }],
		'selector-max-type': [
			0,
			{ ignoreTypes: ['html', 'body'], message: 'Tag inside a block: give the element a block__elem class' },
		],
	},
	overrides: [
		{ files: ['**/*.css'], customSyntax: null },
		// Здесь живут базовые стили тегов, это не элементы блоков.
		{ files: ['src/frontend/styles/global.css'], rules: { 'selector-max-type': null } },
	],
}
