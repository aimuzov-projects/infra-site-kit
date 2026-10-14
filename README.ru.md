# infra-site-kit

[English](README.md)

Общий CI для сайтов aimuzov-projects, собранных из [infra-site-template](https://github.com/aimuzov-projects/infra-site-template). Правка проверок или деплоя попадает сюда один раз, а не в каждый сайт.

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

## Версии

Сайты ссылаются на мажорный тег `v1`. Совместимая правка получает тег `v1.x.y` и переносит на него `v1`, ломающая начинает `v2`.

```bash
git tag v1.0.1 && git tag -f v1 && git push origin v1.0.1 && git push -f origin v1
```
