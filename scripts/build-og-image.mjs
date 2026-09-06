/**
 * Render public/og-image.png — the picture social platforms show for a link.
 *
 * Run this only to regenerate it; the output is committed, so a normal checkout
 * needs none of this.
 *
 *     npm run build          # the gradient is captured from the built site
 *     npm i -D playwright && npx playwright install chromium
 *     node scripts/build-og-image.mjs
 *
 * Why a script rather than a PNG somebody exported once: everything in the
 * picture already exists in this repository — the palette, the two typefaces,
 * the copy in index.html's meta tags — and the background is not an
 * approximation of the site's gradient but a frame of the real one, captured
 * from a build. Change the accent or the role line and this can be re-run;
 * a hand-made export would have to be reverse-engineered first.
 *
 * 1200x630 is the size every scraper is written for. It is rendered at twice
 * that and scaled back down in a canvas, because text at 1x has visibly
 * softer stems than the same text downsampled from 2x, and this is the one
 * asset that is judged at a glance.
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { writeFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'public', 'og-image.png')

const WIDTH = 1200
const HEIGHT = 630

/**
 * The copy. Kept here rather than read out of index.html: the meta description
 * is a sentence and this is a layout, so the two say the same thing in
 * different shapes and neither can be derived from the other.
 */
const COPY = {
  eyebrow: 'Portfolio',
  name: 'Jason Wiersum',
  role: 'Anwendungsentwickler (IHK) · Nürnberg',
  tags: ['Software', 'Design', 'Kreativität'],
  domain: 'jasonwiersum.github.io',
}

/** From src/styles/tokens.css. Written out because this file is rendered
 *  outside the app, with none of its stylesheets loaded. */
const COLOR = {
  foreground: '#0f1424',
  mutedStrong: '#2e3547',
  faint: '#6a7490',
  accent: '#0038ff',
  accentSoft: 'rgba(0, 56, 255, .1)',
  border: 'rgba(15, 20, 36, .08)',
  sheet: 'rgba(255, 255, 255, .72)',
  background: '#d6e3ff',
}

/**
 * How far down the page to scroll before capturing the gradient.
 *
 * The shader follows the scroll (see Backdrop's scrollParallax), so this
 * chooses which part of it is behind the card. At the top the bright corner
 * sits where the name goes and the letters lose their contrast against it;
 * 900px puts the pale end on the left, under the text, and the accent on the
 * right where there is nothing to read.
 */
const SCROLL = 900

/** Latin subsets only — the card has no Cyrillic or Greek in it, and the full
 *  family would be ten times the weight for glyphs nothing here can use. */
const FONTS = [
  'Inter:wght@400;500;600',
  'JetBrains+Mono:wght@500',
]

/** A browser User-Agent, or Google Fonts serves the TrueType stylesheet meant
 *  for browsers that cannot take woff2. */
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
}

/** The built site, served long enough to photograph its background. Playwright
 *  cannot load the app over file:// — the entry point is a module, and module
 *  scripts are blocked there. */
function serve(dir) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = join(dir, normalize(path).replace(/^(\.\.[/\\])+/, ''))
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
    } catch {
      file = join(dir, 'index.html')
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)))
}

/** Google Fonts' stylesheet with every woff2 pulled in as a data URI, so the
 *  render does not depend on the network resolving while the page is being
 *  photographed. */
async function inlineFonts() {
  const css = (
    await Promise.all(
      FONTS.map((family) =>
        fetch(`https://fonts.googleapis.com/css2?family=${family}&display=block`, {
          headers: { 'user-agent': UA },
        }).then((r) => r.text()),
      ),
    )
  ).join('\n')

  const faces = []
  const blocks = css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)
  for (const [, subset, body] of blocks) {
    if (subset !== 'latin') continue
    const family = /font-family:\s*'([^']+)'/.exec(body)[1]
    const weight = /font-weight:\s*(\d+)/.exec(body)[1]
    const url = /url\((https:\/\/[^)]+)\)/.exec(body)[1]
    const data = Buffer.from(await (await fetch(url)).arrayBuffer()).toString('base64')
    faces.push(
      `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};` +
        `font-display:block;src:url(data:font/woff2;base64,${data}) format('woff2')}`,
    )
  }
  if (!faces.length) throw new Error('no latin @font-face rules came back from Google Fonts')
  return faces.join('\n')
}

const card = (fonts, plate) => `<!doctype html>
<meta charset="utf-8">
<style>
${fonts}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden}
body{font-family:'Inter',sans-serif;color:${COLOR.foreground};-webkit-font-smoothing:antialiased;
     background:${COLOR.background}}
.plate{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
/* The page's own floating sheet: 28px radius (--radius-xl), a hairline border
   and 72% white over the gradient. */
.sheet{position:absolute;inset:34px;border:1px solid ${COLOR.border};border-radius:28px;
       background:${COLOR.sheet};box-shadow:0 24px 60px rgba(15,20,36,.14);
       display:flex;flex-direction:column;justify-content:center;padding:0 76px}
.eyebrow{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:15px;
         letter-spacing:.14em;text-transform:uppercase;color:${COLOR.faint}}
h1{font-size:104px;font-weight:600;letter-spacing:-.05em;line-height:.92}
.role{margin-top:30px;font-size:30px;line-height:1.3;color:${COLOR.mutedStrong};font-weight:500}
.tags{display:flex;gap:12px;margin-top:40px}
.tags span{font-size:20px;font-weight:500;color:${COLOR.accent};background:${COLOR.accentSoft};
           border-radius:999px;padding:11px 24px}
.domain{position:absolute;left:76px;bottom:44px;font-family:'JetBrains Mono',monospace;
        font-weight:500;font-size:16px;letter-spacing:.06em;color:${COLOR.faint}}
</style>
<img class="plate" src="${plate}">
<div class="sheet">
  <p class="eyebrow" style="margin-bottom:26px">${COPY.eyebrow}</p>
  <h1>${COPY.name}</h1>
  <p class="role">${COPY.role}</p>
  <div class="tags">${COPY.tags.map((t) => `<span>${t}</span>`).join('')}</div>
  <p class="domain">${COPY.domain}</p>
</div>`

async function main() {
  try {
    await stat(join(DIST, 'index.html'))
  } catch {
    throw new Error('dist/ is missing — run `npm run build` first, the gradient comes from it')
  }

  const fonts = await inlineFonts()
  const server = await serve(DIST)
  const origin = `http://127.0.0.1:${server.address().port}/`

  // SwiftShader, so this works on a machine with no GPU — CI and this
  // container both. The gradient is a fragment shader; without WebGL the
  // backdrop would photograph as a flat block of --background.
  const browser = await chromium.launch({
    // CHROMIUM_PATH is the escape hatch for an image that already ships a
    // browser — a CI runner, a container — where `playwright install` would
    // fetch a second copy of one that is already there. Unset, Playwright uses
    // the build it downloaded itself.
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--force-color-profile=srgb'],
  })
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2,
  })

  // --- the background, from the running site ------------------------------
  const site = await context.newPage()
  await site.goto(origin, { waitUntil: 'networkidle' })
  // Everything that is not the gradient. The islands and the sheet are drawn
  // again below, in this card's own proportions.
  await site.addStyleTag({ content: '.sheet,.island,.settings,.skip-link{display:none!important}' })
  await site.evaluate((y) => window.scrollTo(0, y), SCROLL)
  // The shader drifts and eases towards the scroll it was given, so this is
  // waiting for it to settle rather than for it to load.
  await site.waitForTimeout(3000)
  const plate = `data:image/png;base64,${(
    await (await site.$('.backdrop')).screenshot()
  ).toString('base64')}`

  // --- the card ----------------------------------------------------------
  const page = await context.newPage()
  await page.setContent(card(fonts, plate), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  const shot = await page.screenshot()

  // --- back down to 1200x630 ---------------------------------------------
  // In a canvas rather than an image library, so the only thing this script
  // needs installed is the browser it already has open.
  const scaler = await context.newPage()
  const png = await scaler.evaluate(
    async ([data, w, h]) => {
      const bitmap = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${data}`)).blob(),
      )
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, w, h)
      return canvas.toDataURL('image/png').split(',')[1]
    },
    [shot.toString('base64'), WIDTH, HEIGHT],
  )

  await writeFile(OUT, Buffer.from(png, 'base64'))
  await browser.close()
  server.close()

  const { size } = await stat(OUT)
  console.log(`public/og-image.png  ${WIDTH}x${HEIGHT}  ${(size / 1024).toFixed(0)} kB`)
}

await main()
