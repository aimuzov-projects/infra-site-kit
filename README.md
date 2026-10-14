# infra-site-kit

[Русский](README.ru.md)

Shared CI and linter configs for the aimuzov-projects sites built from [infra-site-template](https://github.com/aimuzov-projects/infra-site-template). A fix to the checks, the deploy or the code style lands here once instead of in every site.

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

## Configs

The repo is also an npm package with the Prettier, Stylelint (BEM included) and oxlint configs. Their plugins are dependencies of the package; Prettier, Stylelint and oxlint stay in the site, so their binaries are there.

```bash
npm install -D github:aimuzov-projects/infra-site-kit#v1.3.1
```

- `.prettierrc.json`: `"@aimuzov-projects/infra-site-kit/prettier"`
- `stylelint.config.mjs`: `export default { extends: ['@aimuzov-projects/infra-site-kit/stylelint'] }`, the site's own `overrides` go next to `extends`
- `.oxlintrc.json`: `{ "extends": ["./node_modules/@aimuzov-projects/infra-site-kit/oxlint.json"] }`

The oxlint config wants blank lines before `return` and `throw`, around blocks (`if`, loops, `try`, `switch`), after `const`/`let` groups and around multiline expressions. `oxlint --fix` puts them in; Prettier only keeps them, so the site runs `oxlint --fix` before `prettier --write`.

npm takes the package as a tarball from GitHub, so the build image needs no git.

## Author credit

The credit line every site shares: "2026 © Сделано [mark] aimuzov" and, when `repo` is given, an "Исходный код" link with the GitHub mark. The mark is a face with a mustache drawn as one evenodd path with no masks or ids, so a page may hold any number of copies.

- `credit.astro` is for static pages: the same markup plus a script that sets the year by the visitor's clock. Without it the build year stays until the next deploy. Astro inlines the script and puts its hash into the CSP with the rest.
- `credit.svelte` is for Svelte apps, where the year is computed in the browser anyway.
- `year.js` is `syncYear()` itself: it fills every `data-year` element, for a site that has its own.

```astro
---
import Credit from '@aimuzov-projects/infra-site-kit/credit.astro'
---

<Credit repo="https://github.com/aimuzov-projects/example" />
```

`copyright={false}` drops the year when the site has its own © line. `--credit-hover` sets the link hover color; everything else is inherited from the footer.

## Renovate

[`default.json`](default.json) is the Renovate preset of the sites: weekly grouped updates (Astro and Svelte, tooling, Node, GitHub Actions), a 3-day wait after a release, no automerge. A site turns it on with `renovate.json`:

```json
{ "extends": ["github>aimuzov-projects/infra-site-kit"] }
```

## Versions

Sites pin the actions to the major tag `v1` and the package to an exact tag such as `v1.1.0`. A compatible change gets a `v1.x.y` tag and moves `v1` to it; a breaking one starts `v2`.

```bash
git tag v1.0.1 && git tag -f v1 && git push origin v1.0.1 && git push -f origin v1
```
