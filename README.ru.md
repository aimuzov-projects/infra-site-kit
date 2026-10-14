# infra-site-kit

[English](README.md)

Общий CI, конфиги линтеров и e2e для сайтов aimuzov-projects, собранных из [infra-site-template](https://github.com/aimuzov-projects/infra-site-template). Правка проверок, деплоя или стиля кода попадает сюда один раз, а не в каждый сайт.

## Actions

- [`check`](check/action.yml): `npm ci`, затем Prettier, oxlint, stylelint, `astro check` и `svelte-check`, `node --test` и сборка. Пакеты из Ubuntu передаются в `apt-packages`.
- [`release`](release/action.yml): [release-please](https://github.com/googleapis/release-please) держит релизный PR с changelog из conventional-коммитов; мерж этого PR создаёт тег и GitHub Release, а action отдаёт `created` и `tag`. Релизный PR открывает `github-actions[bot]`, поэтому GitHub придерживает его прогоны `pull_request` до одобрения; action их одобряет, иначе обязательный чек так и не придёт.
- [`deploy`](deploy/action.yml): SSH на сервер проектов, где ключ запускает `deploy/site.sh` из infra-server для этого сайта, затем ждёт ответа от `url`. `ref` — тег релиза для выкладки, пустой выкладывает свежий `main`. Адрес сервера и его строка `known_hosts` живут здесь.

Это composite actions, а не reusable workflows: job остаётся в сайте, поэтому обязательный статус `check` не меняет имя, а сайт добавляет свои шаги до или после.

## Подключение

`.github/workflows/check.yml`:

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: aimuzov-projects/infra-site-kit/check@v1
```

`.github/workflows/deploy.yml`, выкладка по релизу:

```yaml
jobs:
  release:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: write
      pull-requests: write
      actions: write
    outputs:
      created: ${{ steps.release.outputs.created }}
      tag: ${{ steps.release.outputs.tag }}
    steps:
      - id: release
        uses: aimuzov-projects/infra-site-kit/release@v1

  check:
    needs: release
    if: needs.release.outputs.created == 'true'
    uses: ./.github/workflows/check.yml

  deploy:
    needs: [release, check]
    if: >-
      always() && vars.DEPLOY_ENABLED == 'true' &&
      (github.event_name == 'workflow_dispatch' || needs.check.result == 'success')
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: aimuzov-projects/infra-site-kit/deploy@v1
        with:
          ssh-key: ${{ secrets.DEPLOY_SSH_KEY }}
          url: https://example.com/
          ref: ${{ needs.release.outputs.tag || inputs.tag }}
```

release-please читает `release-please-config.json` (`"release-type": "node"`, `"packages": { ".": {} }`) и `.release-please-manifest.json` с текущей версией (`{ ".": "1.0.0" }`). В настройках Actions репо должна стоять галочка «Allow GitHub Actions to create and approve pull requests».

## Конфиги

Репо ещё и npm-пакет с конфигами Prettier, Stylelint (с BEM) и oxlint. Их плагины — зависимости пакета, а сами Prettier, Stylelint и oxlint остаются в сайте, чтобы их бинарники были там.

```bash
npm install -D github:aimuzov-projects/infra-site-kit#v1.4.3
```

- `.prettierrc.json`: `"@aimuzov-projects/infra-site-kit/prettier"`
- `stylelint.config.mjs`: `export default { extends: ['@aimuzov-projects/infra-site-kit/stylelint'] }`, свои `overrides` сайта — рядом с `extends`
- `.oxlintrc.json`: `{ "extends": ["./node_modules/@aimuzov-projects/infra-site-kit/oxlint.json"] }`

Конфиг oxlint требует пустую строку перед `return` и `throw`, вокруг блоков (`if`, циклы, `try`, `switch`), после групп `const`/`let` и вокруг многострочных выражений. Расставляет их `oxlint --fix`; Prettier их только сохраняет, поэтому сайт запускает `oxlint --fix` перед `prettier --write`.

npm забирает пакет архивом с GitHub, так что git в образе сборки не нужен.

## Строка автора

Общая для всех сайтов подпись: «2026 © Сделано с любовью [знак] aimuzov» и, если передан `repo`, ссылка «Исходный код» со знаком GitHub. Знак — лицо с усами одним путём с evenodd, без масок и id, так что копий на странице может быть сколько угодно.

- `credit.astro` — для статичных страниц: та же разметка плюс скрипт, который ставит год по часам посетителя. Без него год из сборки застывает до следующей выкладки. Astro встраивает скрипт в страницу, а его хеш кладёт в CSP вместе с остальными.
- `credit.svelte` — для Svelte-приложений, где год и так считается в браузере.
- `year.js` — сам `syncYear()`: проставляет год во все элементы с `data-year`, если у сайта есть свои.

```astro
---
import Credit from '@aimuzov-projects/infra-site-kit/credit.astro'
---

<Credit repo="https://github.com/aimuzov-projects/example" />
```

По умолчанию подпись растягивается на ширину контейнера: автор слева, «Исходный код» справа. `align="center"` ставит обе части по центру.

С мышью сначала видно только лицо с усами, а подпись выезжает снизу при наведении или фокусе с клавиатуры. На сенсорных экранах наведения нет, поэтому там подпись видна сразу.

`copyright={false}` убирает год, если у сайта своя строка с ©. Цвет ссылок при наведении задаёт `--credit-hover`, остальное наследуется от футера.

## Подсмотреть тему

Кнопка темы, которая показывает, на что переключит. Чем ближе курсор к кнопке, тем шире вокруг неё бледный круг; при наведении круг раскрывается на треть экрана, и внутри него страница уже в другой схеме. Клик гасит круг до следующего наведения. На сенсорных экранах и при просьбе системы уменьшить движение круга нет.

В круге копия страницы, покрашенная в другую схему: `color-scheme` на копии переключает цвета из `light-dark()`, а класс `light`/`dark` — для сайта, который меняет токены классом. Такой сайт объявляет светлые токены и на `:root, .light`, иначе копия внутри тёмной страницы останется с тёмными. Правила вида `.dark .input` дотянулись бы и до светлой копии, поэтому им нужен `:not(.dark .light *)`. Текущая схема берётся из `color-scheme` корня, так что неважно, где сайт хранит выбор — в атрибуте или в классе.

```svelte
<script>
	import '@aimuzov-projects/infra-site-kit/theme-peek.css'
	import { themePeek } from '@aimuzov-projects/infra-site-kit/theme-peek.js'
</script>

<button onclick={cycle} {@attach themePeek}>…</button>
```

Копия встаёт на место `<body>`, поэтому сайт добавляет `.theme-peek` к своему правилу для body ради раскладки и фона: `body, .theme-peek { … }`.

По умолчанию круг показывает схему, противоположную текущей. Переключатель с кнопкой на каждую тему передаёт свою: `{@attach (node) => themePeek(node, { target: () => 'dark' })}`. Если цель совпадает с текущей схемой, показывать нечего и круга нет. Из нескольких кнопок рядом круг рисует только ближайшая к курсору, а клик по любой гасит его для всех.

## Яндекс Метрика

Счётчик грузит `tag.js` по первому действию или через 4 с после `load`, чтобы скрипт на ~85 КБ не отнимал канал у шрифтов и первого фото; вызовы `ym` до того ждут в очереди. Вебвизор выключен: на мобильном он поднимает LCP.

- `metrika.astro` ставится в `<head>`. Он выводит сниппет инлайном и через `Astro.csp` кладёт в CSP страницы его хеш, `mc.yandex.ru` и `yastatic.net`, сливая их с директивами сайта. Из `<body>` было бы поздно: Astro пишет `<meta>` с CSP сразу после содержимого `<head>`. `init` переопределяет параметры инициализации, например `{ webvisor: true }`.
- `metrika-pixel.astro` — пиксель в `<noscript>` для посетителей без JavaScript. Он ставится в `<body>`, потому что картинка в `<noscript>` внутри `<head>` не разрешена.

```astro
---
import Metrika from '@aimuzov-projects/infra-site-kit/metrika.astro'
import MetrikaPixel from '@aimuzov-projects/infra-site-kit/metrika-pixel.astro'
---

<head>
	<Metrika id={12345678} />
</head>
<body>
	<MetrikaPixel id={12345678} />
</body>
```

В `security.csp` сайта источников Яндекса нет: компонент приносит их только на страницы, где он стоит.

## E2E-тесты

Пресет Playwright и проверки, общие для всех сайтов. Unit-тесты остаются на `node --test`, Playwright — для того, чему нужен настоящий браузер: собранных страниц, CSP, темы и счётчика.

`@playwright/test` стоит в сайте, там же его бинарник и браузер; `@axe-core/playwright` приходит вместе с kit.

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:

```ts
export { default } from '@aimuzov-projects/infra-site-kit/playwright'
```

Пресет гоняет `e2e/` в Chromium против продовой сборки: `astro build && astro preview` на порту 4399 (`E2E_PORT` его меняет), каждый прогон собирает заново. Сайт расширяет его через `defineConfig(preset, { … })`; свой сервер там, например API, запускается рядом с preview.

`e2e/site.spec.ts`:

```ts
import { siteChecks } from '@aimuzov-projects/infra-site-kit/playwright/checks'

siteChecks({
	theme: { button: (page) => page.getByRole('button', { name: /^Тема:/ }) },
	metrika: true,
})
```

- Каждая страница из `sitemap-index.xml` отвечает 200 и не пишет ошибок в консоль, включая исключения, упавшие запросы и нарушения CSP. `ignoreConsole` пропускает известные сообщения.
- axe проверяет каждую страницу из sitemap по WCAG 2.1 AA в обеих схемах. `a11y: { disableRules, exclude }` сужает проверку, `a11y: false` выключает.
- С `theme`: клик по кнопке меняет `color-scheme` корня, и выбор переживает перезагрузку (`persist: false`, если не должен), а наведение открывает круг с другой темой, который клик гасит (`peek: false` для кнопки без него).
- С `metrika`: счётчик на странице есть, но `tag.js` не запрашивается до первого действия. До самого Яндекса запросы не доходят.

Те же проверки экспортируются по отдельности (`expectHealthyPage`, `expectAccessible`, `expectThemeToggle`, `expectThemePeek`, `expectMetrikaDeferred`, `sitemapPaths`) для собственных тестов сайта.

В CI их запускает job из `.github/workflows/check.yml` после action `check`, браузер кэшируется по версии Playwright, см. [infra-site-template](https://github.com/aimuzov-projects/infra-site-template).

## Renovate

[`default.json`](default.json) — пресет Renovate для сайтов: обновления раз в неделю группами (Astro и Svelte, инструменты, Node, GitHub Actions), 3 дня выдержки после релиза. Мерж в `main` не выкладывает, выкладывает релиз, поэтому обновления, кроме мажорных, мержатся сами после зелёных проверок, а то, что попадает на прод (`dependencies`, базовые образы, Node), коммитится как `fix(deps)` — для него release-please сделает релиз. Сайт включает его файлом `renovate.json`:

```json
{ "extends": ["github>aimuzov-projects/infra-site-kit"] }
```

## Версии

Actions сайты берут по мажорному тегу `v1`, пакет — по точному тегу вроде `v1.1.0`. Совместимая правка получает тег `v1.x.y` и переносит на него `v1`, ломающая начинает `v2`.

```bash
git tag v1.0.1 && git tag -f v1 && git push origin v1.0.1 && git push -f origin v1
```
