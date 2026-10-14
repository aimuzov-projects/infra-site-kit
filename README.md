# site-kit

[Русский](README.ru.md)

Shared CI for the aimuzov-projects sites built from [infra-template-site](https://github.com/aimuzov-projects/infra-template-site). A fix to the checks or the deploy lands here once instead of in every site.

## Actions

- [`check`](check/action.yml): `npm ci`, then Prettier, oxlint, stylelint, `astro check` and `svelte-check`, `node --test` and the build. Packages from Ubuntu go in `apt-packages`.
- [`deploy`](deploy/action.yml): SSH to the projects server, where the key runs the site's `deploy/remote.sh`, then waits for `url` to answer. The server address and its `known_hosts` line live here.

They are composite actions, not reusable workflows: the job stays in the site, so the required `check` status keeps its name, and a site adds its own steps before or after.

## Usage

`.github/workflows/check.yml`:

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: aimuzov-projects/site-kit/check@v1
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
      - uses: aimuzov-projects/site-kit/deploy@v1
        with:
          ssh-key: ${{ secrets.DEPLOY_SSH_KEY }}
          url: https://example.com
```

## Versions

Sites pin the major tag `v1`. A compatible change gets a `v1.x.y` tag and moves `v1` to it; a breaking one starts `v2`.

```bash
git tag v1.0.1 && git tag -f v1 && git push origin v1.0.1 && git push -f origin v1
```
