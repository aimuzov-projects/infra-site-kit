import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'

import { metrikaScript } from '../../site/metrika.js'

// A two-page site for the e2e checks of the kit: a sitemap with the production domain, a theme
// button with theme-peek.js and the lazy Metrika, the way the sites have them after a build.

const root = join(import.meta.dirname, '../..')
const port = Number(process.env.E2E_PORT ?? 4399)
const domain = 'https://example.com'

const page = (title, body) => `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>${title}</title>
		<link rel="stylesheet" href="/site/theme-peek.css" />
		<style>
			:root { color-scheme: light dark; }
			:root[data-theme='light'] { color-scheme: light; }
			:root[data-theme='dark'] { color-scheme: dark; }
			body, .theme-peek { margin: 0; padding: 1rem; color: light-dark(#111, #eee); background: light-dark(#fff, #111); }
			a { color: inherit; }
		</style>
		<script>
			const stored = localStorage.getItem('theme')
			if (stored) document.documentElement.dataset.theme = stored
		</script>
		<script>${metrikaScript(12345678)}</script>
	</head>
	<body>
		<header>
			<nav><a href="/">Home</a> <a href="/about/">About</a></nav>
			<button type="button" aria-label="Switch the theme">Theme</button>
		</header>
		<main><h1>${title}</h1>${body}</main>
		<script type="module">
			import { themePeek } from '/site/theme-peek.js'

			const button = document.querySelector('button')
			const next = { system: 'light', light: 'dark', dark: 'system' }

			themePeek(button)
			button.addEventListener('click', () => {
				const theme = next[document.documentElement.dataset.theme ?? 'system']

				if (theme === 'system') delete document.documentElement.dataset.theme
				else document.documentElement.dataset.theme = theme

				if (theme === 'system') localStorage.removeItem('theme')
				else localStorage.setItem('theme', theme)
			})
		</script>
	</body>
</html>`

const sitemap = (tag, locs) =>
	`<?xml version="1.0" encoding="UTF-8"?><${tag} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs.join('')}</${tag}>`

const routes = {
	'/': ['text/html', page('Home', '<p>The home page.</p>')],
	'/about/': ['text/html', page('About', '<p>The about page.</p>')],
	'/sitemap-index.xml': [
		'application/xml',
		sitemap('sitemapindex', [`<sitemap><loc>${domain}/sitemap-0.xml</loc></sitemap>`]),
	],
	'/sitemap-0.xml': [
		'application/xml',
		sitemap('urlset', [`<url><loc>${domain}/</loc></url>`, `<url><loc>${domain}/about/</loc></url>`]),
	],
}

const types = { '.js': 'text/javascript', '.css': 'text/css' }

createServer((request, response) => {
	const { pathname } = new URL(request.url, 'http://localhost')
	const route = routes[pathname]

	if (route) {
		response.writeHead(200, { 'content-type': route[0] }).end(route[1])

		return
	}

	const type = types[pathname.slice(pathname.lastIndexOf('.'))]

	if (pathname.startsWith('/site/') && type) {
		try {
			response.writeHead(200, { 'content-type': type }).end(readFileSync(join(root, pathname)))

			return
		} catch {
			// Falls through to 404.
		}
	}

	response.writeHead(404).end()
}).listen(port)
