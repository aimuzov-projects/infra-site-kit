# infra-site-kit

[English](README.md)

Общий CI и конфиги линтеров для сайтов aimuzov-projects, собранных из [infra-site-template](https://github.com/aimuzov-projects/infra-site-template). Правка проверок, деплоя или стиля кода попадает сюда один раз, а не в каждый сайт.

## Actions

- [`check`](check/action.yml): `npm ci`, затем Prettier, oxlint, stylelint, `astro check` и `svelte-check`, `node --test` и сборка. Пакеты из Ubuntu передаются в `apt-packages`.
- [`deploy`](deploy/action.yml): SSH на сервер проектов, где ключ запускает `deploy/remote.sh` сайта, затем ждёт ответа от `url`. Адрес сервера и его строка `known_hosts` живут здесь.

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

`.github/workflows/deploy.yml`:

```yaml
jobs:
  check:
    uses: ./.github/workflows/check.yml

  deploy:
    needs: check
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: aimuzov-projects/infra-site-kit/deploy@v1
        with:
          ssh-key: ${{ secrets.DEPLOY_SSH_KEY }}
          url: https://example.com
```

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

## Renovate

[`default.json`](default.json) — пресет Renovate для сайтов: обновления раз в неделю группами (Astro и Svelte, инструменты, Node, GitHub Actions), 3 дня выдержки после релиза, без автомержа. Сайт включает его файлом `renovate.json`:

```json
{ "extends": ["github>aimuzov-projects/infra-site-kit"] }
```

## Версии

Actions сайты берут по мажорному тегу `v1`, пакет — по точному тегу вроде `v1.1.0`. Совместимая правка получает тег `v1.x.y` и переносит на него `v1`, ломающая начинает `v2`.

```bash
git tag v1.0.1 && git tag -f v1 && git push origin v1.0.1 && git push -f origin v1
```
