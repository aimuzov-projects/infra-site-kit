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
npm install -D github:aimuzov-projects/infra-site-kit#v1.4.2
```

- `.prettierrc.json`: `"@aimuzov-projects/infra-site-kit/prettier"`
- `stylelint.config.mjs`: `export default { extends: ['@aimuzov-projects/infra-site-kit/stylelint'] }`, the site's own `overrides` go next to `extends`
- `.oxlintrc.json`: `{ "extends": ["./node_modules/@aimuzov-projects/infra-site-kit/oxlint.json"] }`

The oxlint config wants blank lines before `return` and `throw`, around blocks (`if`, loops, `try`, `switch`), after `const`/`let` groups and around multiline expressions. `oxlint --fix` puts them in; Prettier only keeps them, so the site runs `oxlint --fix` before `prettier --write`.

npm takes the package as a tarball from GitHub, so the build image needs no git.

## Author credit

The credit line every site shares: "2026 © Сделано с любовью [mark] aimuzov" and, when `repo` is given, an "Исходный код" link with the GitHub mark. The mark is a face with a mustache drawn as one evenodd path with no masks or ids, so a page may hold any number of copies.

- `credit.astro` is for static pages: the same markup plus a script that sets the year by the visitor's clock. Without it the build year stays until the next deploy. Astro inlines the script and puts its hash into the CSP with the rest.
- `credit.svelte` is for Svelte apps, where the year is computed in the browser anyway.
- `year.js` is `syncYear()` itself: it fills every `data-year` element, for a site that has its own.

```astro
---
import Credit from '@aimuzov-projects/infra-site-kit/credit.astro'
---

<Credit repo="https://github.com/aimuzov-projects/example" />
```

By default the credit stretches over the container: the author on the left, "Исходный код" on the right. `align="center"` keeps both parts in the middle.

With a mouse only the face peeks out at first, and the line slides up from below on hover or keyboard focus. Touch screens have no hover, so they show the whole line right away.

`copyright={false}` drops the year when the site has its own © line. `--credit-hover` sets the link hover color; everything else is inherited from the footer.

## Theme peek

A theme button that shows what it switches to. The closer the pointer gets to the button, the wider a faint circle grows around it; on hover the circle opens to a third of the screen, and inside it the page is drawn in the other scheme. A click puts the circle out until the next hover. Touch screens and reduced motion get no circle.

The circle holds a copy of the page painted in the other scheme: `color-scheme` on the copy flips the `light-dark()` colors, and the `light`/`dark` class is for a site that switches its tokens by a class. Such a site declares its light tokens on `:root, .light` as well, or the copy inside a dark page keeps the dark ones. The current scheme is read from the root `color-scheme`, so it does not matter whether the choice lives in an attribute or a class.

```svelte
<script>
	import '@aimuzov-projects/infra-site-kit/theme-peek.css'
	import { themePeek } from '@aimuzov-projects/infra-site-kit/theme-peek.js'
</script>

<button onclick={cycle} {@attach themePeek}>…</button>
```

The copy takes the place of `<body>`, so the site adds `.theme-peek` to its body rule for the layout and background: `body, .theme-peek { … }`.

By default the circle shows the scheme opposite to the current one. A switch with a button per theme passes its own: `{@attach (node) => themePeek(node, { target: () => 'dark' })}`. When the target matches the current scheme there is nothing to show and the circle stays hidden.

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
