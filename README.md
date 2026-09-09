# Jason Wiersum — Portfolio

Single-page personal portfolio: React + TypeScript + Vite, a Three.js character
in the hero, GSAP for all motion, three languages, light/dark themes and a real
contact form powered by Web3Forms. Deployed to GitHub Pages.

---

## Running it

```bash
npm install     # install dependencies
npm run dev     # dev server at http://localhost:5173
npm run build   # type-check + production build into dist/
npm run preview # serve the production build locally
```

Node 20 or newer.

---

## What is where

```
src/
├── components/
│   ├── Navigation/    FloatingNavigation · LanguageSwitcher · ThemeToggle
│   ├── Character/     frame sheet + manifest, gaze tracking
│   ├── Hero/          first screen
│   ├── About/         biography, facts panel, the four creative pillars
│   ├── Skills/        technologies by category + spoken languages
│   ├── Projects/      grid + project card   (Skills + Projects make up #work)
│   ├── Contact/       section + Web3Forms form
│   └── Layout/        footer, background ambience
├── hooks/             theme · language · section observer · scroll · reveal
├── i18n/              translations.ts  ← every interface string
├── data/              projects.ts · skills.ts
├── config/            site.ts (personal data, links) · web3forms.ts
└── styles/            tokens.css (design system) · globals.css

public/
├── character/         frames.webp · still.webp — built, do not edit by hand
│                      wave.mp4 — optional, played once on touch devices
├── cv/                the CV offered for download in About
└── images/            portrait · project shots

source-media/          build inputs, never served — see its README
└── final-chroma.mp4   the character's source footage

scripts/
└── build-character.py final-chroma.mp4 → frames.webp + still.webp + manifest.json
```

The page has four sections — `#home`, `#work`, `#about`, `#contact` — in one
document. There is no router: navigation is smooth scrolling, and the active
item is detected with an `IntersectionObserver`.

---

## The character

A 2D character taken from `source-media/final-chroma.mp4`. There is no 3D: no
Three.js, no WebGL, no canvas. It is one `<img>` — a sheet holding the clip's
frames in order — and the cursor decides where in the clip to be.

### The idea

The sheet holds **one unbroken stretch of the recording**, at its own frame
rate. The cursor picks a **position in that stretch**, and the runtime walks
there **one frame at a time**. Every step is therefore two frames that were
filmed next to each other, so what plays is movement that was actually
recorded: the head turning, not a cut between two stills.

Both halves matter, and each fixes a different failure:

**One frame at a time** is what stops it looking like a slideshow. An earlier
version kept 36 frames chosen for how *different* they looked and jumped
straight to the best match:

| | mean pixel difference per step | p99 |
| --- | --- | --- |
| adjacent recorded frames | 1.6 / 255 | 24 |
| 36 frames chosen by appearance | 10.0 | 132 |

**Unbroken** is what stops it looking like it is ignoring the cursor. Sampled
across the whole clip, every direction recurs several times with the body in a
different place, so the frame it aims for flips between those recurrences and
the head sets off the wrong way before coming back. Measured on a cursor jump
from the far left to the far right, as gaze travelled in x:

| | backtracking | net travel |
| --- | --- | --- |
| frames sampled across the clip | 2.98 | 1.92 |
| one unbroken stretch | 0.01 | 1.61 |

Nothing crossfades — two frames are never mixed, so there is no ghosting. The
smoothness comes from the steps being small, not from blending.

### Why not the video element

Driving `video.currentTime` from an animation frame does not work: seeks are
asynchronous and coalesce, so the element presents a small fraction of the
frames asked for. A sheet is one decode and then a transform per frame, which is
exact and costs nothing per step.

### How the asset is built

`scripts/build-character.py` turns the video into three files:

```
public/character/frames.webp              # the clip, in order, one sheet
public/character/still.webp               # one frame, for touch devices
src/components/Character/manifest.json    # sheet geometry + per-frame gaze
```

```bash
python3 scripts/build-character.py                  # 72 frames, 400px
python3 scripts/build-character.py --segment 96     # a longer stretch
```

It needs `ffmpeg` on `PATH` and `pillow`, `numpy`, `scipy`. The video is never
shipped to the browser and never played — it is the reference original.

What the script does:

1. **Extract** all 240 frames (1280×720, 24 fps, 10 s).
2. **Measure gaze** per frame from the pupils, so the runtime knows where each
   frame is looking.
3. **Choose the window**: the contiguous run of `--segment` frames that answers
   the nine directions best. Contiguous, and chosen by coverage rather than by
   hand. The clip revisits every direction several times, so a window this
   short loses almost nothing — the run it picks (source frames 63–134) reaches
   every direction as well as all 240 do.
4. **Matte** each one. The backdrop is a warm grey gradient, not white, and the
   sweater is brighter than it in places and darker in others, so no brightness
   threshold works. A degree-3 polynomial is fitted per channel to the frame
   borders to predict the backdrop, and the silhouette is where the frame
   departs from that prediction. Nothing keys on "is this pixel white", so the
   eyes, the sweater and the highlights survive.
5. **Unmix** the soft edge — `(pixel − (1−α)·backdrop) / α` — so no pale fringe
   glows against a dark page.
6. **Compose** the sheet, each frame in a cell with an 8 px transparent gutter
   so compression and sub-pixel sampling cannot bleed one frame into the next.

### Size, and what touch devices get instead

72 frames at 400 px is a 3744×3368 sheet — 1.2 MB, 12.6 megapixels, about 50 MB
decoded. Desktop handles that easily; a phone would struggle, and iOS silently
downsamples very large images, which would break the sheet's alignment.

It never has to. Tracking needs a cursor, so on a coarse pointer the sheet is
never fetched. Those devices get `still.webp` (21 KB), with
`public/character/wave.mp4` played once over the top of it if that file exists.

The wave is not built by the pipeline — drop the file in and it is used. It is
layered over the still and stays invisible until it can actually play, so a
missing or unplayable file costs nothing but the wave.

### Cursor tracking

The pointer writes a target; a `requestAnimationFrame` loop eases the current
gaze towards it, picks the frame to aim for, and steps towards it. Nothing runs
inside the `mousemove` handler and no React state is involved.

Gaze smoothing is exponential and frame-rate independent (`1 − e^(−k·Δt)`), so
it feels the same at 60 Hz and 144 Hz. Both axes track, measured from the centre
of the character, with a radial dead zone so a parked cursor cannot make the
character drift.

`MAX_TRAVEL` caps how fast the clip may run. That cap is what guarantees the
walk passes through the frames in between rather than skipping over them.

The character never moves: no translate, no scale, no rotation, no parallax.
Only which frame is shown changes.

### Tuning

Every knob lives in `src/components/Character/characterConfig.ts`, documented in
place:

| | |
| --- | --- |
| `LAYOUT.width`, `maxWidth`, `mobileMaxWidth` | size |
| `LAYOUT.offsetX`, `offsetY` | position |
| `SENSITIVITY.x`, `.y` | how far the cursor travels for a full look |
| `DEAD_ZONE` | the still area around centre |
| `SMOOTHING` | how fast the aimed-at gaze follows the pointer |
| `FOLLOW`, `MAX_TRAVEL` | how fast the character walks there |

Window length, size and quality are arguments to the build script.

### What the source video can and cannot do

The subject never looks up-and-right, so that corner of the cursor plane has no
matching frame and the nearest sensible one is used. The gaze match weights
horizontal error 2.5× vertical (`GAZE_WEIGHT_X`), because looking the wrong way
left/right reads as an error while a shallow nod does not.

There are no blinks in the clip, so there are none on the page.

The window reaches every direction the whole clip does, but two of them are
weak in the source itself: straight up resolves to +0.60 of gaze rather than
+1.00, and up-and-right to +0.23. The subject never looks there.

---

## Translations

All interface copy lives in **`src/i18n/translations.ts`** — Spanish, English and
German. German is the default; Spanish defines the type every other language
must satisfy, so adding a key to `es` makes the compiler demand it in `en` and
`de` too.

Switching language updates the copy, `<html lang>`, the document title and the
meta description without a reload, and the choice is stored in `localStorage`
under `jw-language`.

Project titles and descriptions are content rather than interface, so they live
with the rest of the project data (see below) — already translated per language.

---

## Scroll transitions

Each top-level section owns one scrubbed GSAP timeline covering its whole
passage through the viewport: it rises and resolves as it arrives, holds at full
strength while it is being read, then settles back and dims as it leaves. One
timeline per section means the arriving and departing phases can never fight
over the same properties. Tuned in `src/hooks/useSectionTransitions.ts`.

Inside a section, `src/hooks/useReveal.ts` staggers the individual elements.

## Dark mode

Behind the gear at the top right, alongside the language island: the two slide
out together and the gear becomes a chevron that puts them back. **Light is the
default.**
The choice is stored in `localStorage` under `jw-theme`, and a tiny inline
script in `index.html` applies it before first paint so there is no flash.

Colours are design tokens in `src/styles/tokens.css`: light values on `:root`,
dark values on `[data-theme="dark"]`. Components never hardcode a colour, so
adjusting the palette is a single-file job.

---

## Projects

Edit **`src/data/projects.ts`**. Each entry has:

```ts
{
  id: 'project-01',
  title:       { es: '…', en: '…', de: '…' },
  description: { es: '…', en: '…', de: '…' },
  technologies: ['Java', 'Spring'],
  image: 'images/my-project.jpg', // file in public/images — no leading slash
  url: 'https://…',               // null while there is nothing to link to
  placeholder: false,             // true shows the "placeholder" badge
}
```

The three current entries are placeholders and are visibly marked as such.
Cover images go in `public/images/`; without one, a generated cover is used.

---

## Contact form (Web3Forms)

The form posts with `fetch` to `https://api.web3forms.com/submit` — the page is
never left, and loading / success / error are all rendered inline. There is no
backend.

**To change the destination inbox**, replace the access key in
**`src/config/web3forms.ts`**:

```ts
export const WEB3FORMS_ACCESS_KEY = '…'   // get one at https://web3forms.com
export const WEB3FORMS_SUBJECT    = 'Neue Nachricht über dein Portfolio'
export const WEB3FORMS_FROM_NAME  = 'Portfolio-Kontaktformular'
```

The key is visible in the built JavaScript. That is how Web3Forms is designed to
work for static sites: the key only permits submissions to the inbox it is bound
to. A hidden honeypot field filters out most bots.

Social links (LinkedIn, GitHub) are in `src/config/site.ts`.

---

## Accessibility

Keyboard navigable throughout, with a skip link, visible focus rings, labelled
form fields, `aria-live` feedback on submit and `aria-label`s on the icon-only
controls.

`prefers-reduced-motion: reduce` removes every autonomous animation: the
entrance reveals, the scroll transitions, the greeting wave, the idle float, the
breathing and the blinking. The render loop itself stays live so the character's
gaze still follows the pointer — that motion is small, user-driven and stops the
moment the pointer does. (An earlier version froze the canvas entirely here,
which just looked broken.)

---

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.

### Required one-time setting

**Settings → Pages → Build and deployment → Source: `GitHub Actions`.**

This is not optional. With the default `Deploy from a branch`, GitHub publishes
the repository *as it is* — so visitors receive the development `index.html`,
whose entry point is `/src/main.tsx`, and the browser has nothing it can run.
The result is a blank white page.

You can tell which mode is active from the Actions tab. Under `Deploy from a
branch` there is a second, GitHub-generated run called **“pages build and
deployment”** alongside our **“Deploy to GitHub Pages”**. Both publish, and
whichever finishes last wins — so the site can even flip between working and
blank between deploys. Once the source is set to `GitHub Actions`, only our
workflow runs.

If the deployed page is ever blank, it says so itself: an inline fallback in
`index.html` detects that the source is being served and prints the fix on the
page after a few seconds.

The workflow derives the Vite base path from the repository name, so nothing is
hardcoded:

* `<owner>.github.io` → served at `/`
* any other repository → served at `/<repo>/`

To build with a specific base path locally:

```bash
BASE_PATH=/my-repo/ npm run build
```

---

## Still to add

Nothing below is invented or filled in with placeholder facts — these are yours
to supply:

- [ ] `public/cv/JasonWiersum-Lebenslauf.pdf` — the CV the About section
      offers for download (see `public/cv/README.md`)
- [ ] `public/character/wave.mp4` — the wave played once on touch devices
- [ ] `public/images/projects/landesamt-logo.png` — the mark on the
      Bürgermeisterverzeichnis card
- [ ] Real projects in `src/data/projects.ts`
- [ ] Project cover images in `public/images/`
- [ ] A public email address, if you want one shown next to the form
- [ ] A final professional description, if you want to replace the current
      About copy
- [ ] Photographs of yourself, if you want any
- [ ] An Open Graph share image (`og:image` is deliberately not set yet)
