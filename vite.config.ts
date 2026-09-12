import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { projects } from './src/data/projects'
import type { RepoCommit, RepoLanguage, RepoStatus } from './src/data/repoStatus'

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

/**
 * ---------------------------------------------------------------------------
 * REPOSITORY STATUS
 * ---------------------------------------------------------------------------
 * Reads the current state of every repository named by a project and serves it
 * to the app as `virtual:repo-status`.
 *
 * At build time rather than in the browser, for three reasons. The unauthorised
 * GitHub API allows 60 requests an hour *per IP*, and behind a mobile carrier
 * or an office NAT a visitor shares that IP with everyone else on it — the card
 * would come up empty for the people most likely to be looking at it. A request
 * made while the panel opens also has to be waited for, so the section would
 * arrive after the rest of the dialog no matter how fast it was. And a build is
 * a place where a failure can be swallowed quietly; a render is not.
 *
 * Freshness costs nothing here: the workflow already redeploys this site every
 * night for the CV's date stamp, so the snapshot is at most a day old, and any
 * push to this repository refreshes it immediately.
 *
 * GITHUB_TOKEN, if the environment has one, is only about that rate limit — the
 * repositories read here are public. The workflow passes the token Actions
 * issues itself, which lifts the limit to 1,000 requests an hour and keeps the
 * build off a shared runner IP's quota.
 */
const REPO_STATUS_MODULE = 'virtual:repo-status'

/** The subset of GitHub's repository object this uses. */
interface GithubRepo {
  name: string
  html_url: string
  description: string | null
  default_branch: string
  pushed_at: string
  created_at: string
  stargazers_count: number
  open_issues_count: number
  topics?: string[]
}

/** The subset of GitHub's commit object this uses. */
interface GithubCommit {
  sha: string
  html_url: string
  commit: {
    message: string
    author: { date: string } | null
    committer: { date: string } | null
  }
}

function githubFetch(path: string): Promise<Response> {
  const token = process.env.GITHUB_TOKEN
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      // GitHub rejects an API request without one.
      'User-Agent': 'jasonwiersum.github.io-build',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

async function githubJson<T>(path: string): Promise<T> {
  const response = await githubFetch(path)
  if (!response.ok) {
    throw new Error(`GET ${path} → ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as T
}

/**
 * The head commit and how many commits are behind it, in one request.
 *
 * GitHub has no endpoint that counts commits, but it paginates them, so asking
 * for pages of one and reading the page number of the `last` link gives the
 * total — and the single commit that comes back in the body is the head one.
 * A repository small enough to fit on one page has no `last` link, and there
 * the body's own length is the count.
 */
async function readCommits(
  slug: string,
  branch: string,
): Promise<{ count: number | null; head: RepoCommit | null }> {
  const response = await githubFetch(
    `/repos/${slug}/commits?sha=${encodeURIComponent(branch)}&per_page=1`,
  )
  if (!response.ok) return { count: null, head: null }

  const last = /[?&]page=(\d+)>;\s*rel="last"/.exec(response.headers.get('link') ?? '')
  const page = (await response.json()) as GithubCommit[]
  const head = Array.isArray(page) ? page[0] : undefined

  return {
    count: last ? Number(last[1]) : Array.isArray(page) ? page.length : null,
    head: head
      ? {
          sha: head.sha.slice(0, 7),
          // Subject line only — the body is for whoever opens the commit.
          message: head.commit.message.split('\n')[0],
          date: head.commit.author?.date ?? head.commit.committer?.date ?? '',
          url: head.html_url,
        }
      : null,
  }
}

/** Languages by share of bytes, largest first — the same measure GitHub uses. */
function toLanguages(bytes: Record<string, number>): RepoLanguage[] {
  const total = Object.values(bytes).reduce((sum, value) => sum + value, 0)
  if (!total) return []
  return Object.entries(bytes)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, bytes: value, share: value / total }))
}

async function readRepo(slug: string): Promise<RepoStatus> {
  const repo = await githubJson<GithubRepo>(`/repos/${slug}`)
  const [bytes, commits] = await Promise.all([
    githubJson<Record<string, number>>(`/repos/${slug}/languages`).catch(() => ({})),
    readCommits(slug, repo.default_branch),
  ])

  return {
    slug: slug.toLowerCase(),
    name: repo.name,
    url: repo.html_url,
    description: repo.description,
    defaultBranch: repo.default_branch,
    pushedAt: repo.pushed_at,
    createdAt: repo.created_at,
    commits: commits.count,
    openIssues: repo.open_issues_count,
    stars: repo.stargazers_count,
    topics: repo.topics ?? [],
    languages: toLanguages(bytes),
    lastCommit: commits.head,
    fetchedAt: new Date().toISOString(),
  }
}

function repoStatus(): Plugin {
  // Derived from the project data rather than listed again here, so adding a
  // repository to a project is the only step there is.
  const slugs = [
    ...new Set(
      projects.flatMap((project) =>
        project.repo ? [`${project.repo.owner}/${project.repo.name}`] : [],
      ),
    ),
  ]

  // One read per process. The dev server would otherwise re-request on every
  // reload of the importing module.
  let snapshot: Promise<string> | null = null

  const read = async () => {
    const entries = await Promise.all(
      slugs.map(async (slug) => {
        try {
          return [slug.toLowerCase(), await readRepo(slug)] as const
        } catch (error) {
          // Never fatal. A missing snapshot renders as a project without a
          // status section, which is a great deal better than a deploy blocked
          // over a rate limit — or than last week's state shown as today's.
          console.warn(
            `[repo-status] ${slug}: ${(error as Error).message}\n` +
              '            The status section will be left out of this build.',
          )
          return null
        }
      }),
    )

    const found = entries.filter((entry): entry is [string, RepoStatus] => entry !== null)
    return `export const repoStatuses = ${JSON.stringify(Object.fromEntries(found))}\n`
  }

  return {
    name: 'repo-status',
    resolveId: (id) => (id === REPO_STATUS_MODULE ? `\0${REPO_STATUS_MODULE}` : null),
    load(id) {
      if (id !== `\0${REPO_STATUS_MODULE}`) return null
      snapshot ??= read()
      return snapshot
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), siteMetadata(), repoStatus()],
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
