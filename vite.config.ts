import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * `base` is resolved at build time from the BASE_PATH environment variable so that
 * no repository URL is hardcoded. The GitHub Actions workflow computes it:
 *   - user/organisation page  (<owner>.github.io)  ->  "/"
 *   - project page            (<owner>/<repo>)     ->  "/<repo>/"
 * Locally BASE_PATH is unset and the app is served from "/".
 */
const base = process.env.BASE_PATH || '/'

/**
 * Where the site actually lives, with its scheme and host.
 *
 * `base` is not enough for any of this. A sitemap has to carry absolute URLs —
 * the format requires them — and so does `og:image`: every scraper that matters
 * (Slack, WhatsApp, LinkedIn, X) fetches the image on its own, from a machine
 * that has no idea what page it came from, so a path is simply dropped and the
 * link goes out bare. That is the whole reason the preview never showed.
 *
 * The workflow derives this from GITHUB_REPOSITORY next to BASE_PATH, so the
 * host stays out of the repository exactly as the base path does. Unset, it
 * falls back to the preview server's address, which is wrong on purpose: a
 * local build should look local rather than quietly claim to be the deployed
 * site.
 */
const siteUrl = (process.env.SITE_URL || `http://localhost:4173${base}`).replace(
  /\/+$/,
  '/',
)

/**
 * Every public page, as a path under the site's base.
 *
 * There is one. The site is a single document and its sections are anchors on
 * it — search engines discard the fragment and collapse `#work`, `#about` and
 * `#contact` back onto this same entry, so listing them would pad the file
 * with three duplicates of the page above.
 *
 * The CV is deliberately absent. It is linked from the page, so it is crawled
 * and indexed either way; naming it here additionally asks for it to be ranked
 * as a document in its own right, which is how a personal CV ends up as a
 * search result with the site nowhere near it. Add `'cv/…pdf'` if that is
 * wanted.
 */
const PAGES = ['']

/**
 * The images that belong to the page, for the image sitemap.
 *
 * Only two are worth declaring. The still is the first image on the page under
 * the mobile-first crawl — the one that becomes the thumbnail beside a search
 * result — and its filename carries a content hash, so it has to be read from
 * the manifest rather than written down here. The og-image is what a link
 * unfurls to. The sprite sheet is deliberately absent: it is a 15x16 grid of
 * every frame of a clip, which is a mechanism and not a picture, and offering
 * it to an image crawler would be offering nonsense.
 *
 * `image:loc` and nothing else. Google stopped reading `image:caption`,
 * `image:title`, `image:license` and `image:geo_location` in 2022; the tags are
 * still valid in the schema and are still ignored, so emitting them would be
 * decoration.
 */
function pageImages(): string[] {
  const manifest = JSON.parse(
    readFileSync(new URL('./src/components/Character/manifest.json', import.meta.url), 'utf8'),
  ) as { still: string }
  return [`character/${manifest.still}`, 'og-image.png']
}

/** The commit's date, so `lastmod` moves when the content does.
 *
 *  Not the build's: the workflow rebuilds nightly to keep the CV's date
 *  current, and a `lastmod` that advanced every night without the page having
 *  changed is the one way to teach a crawler to stop believing the field.
 *  Falls back to the build date outside a git checkout. */
function lastModified() {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return new Date().toISOString()
  }
}

/**
 * Emits sitemap.xml and robots.txt, and resolves %SITE_URL% in index.html.
 *
 * Generated rather than kept in `public/` because all three need the absolute
 * origin, and that is the one thing this repository refuses to write down.
 */
function siteMetadata(): Plugin {
  return {
    name: 'site-metadata',
    // Before Vite's own %BASE_URL% pass, so the two substitutions cannot race.
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%SITE_URL%', siteUrl),
    },
    generateBundle() {
      const lastmod = lastModified()
      const images = pageImages()
        .map((file) => `    <image:image>\n      <image:loc>${siteUrl}${file}</image:loc>\n    </image:image>`)
        .join('\n')
      const urls = PAGES.map((page) => {
        const loc = `${siteUrl}${page}`
        return (
          `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
          `${images}\n  </url>`
        )
      }).join('\n')

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
          '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
          `${urls}\n` +
          '</urlset>\n',
      })

      // Nothing here is disallowed: everything the build publishes is meant to
      // be read. The file exists for its last line — it is where a crawler
      // looks for the sitemap without being told.
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`,
      })
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), siteMetadata()],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          gsap: ['gsap', '@gsap/react'],
        },
      },
    },
  },
})
