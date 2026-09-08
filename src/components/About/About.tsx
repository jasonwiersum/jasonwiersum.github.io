import { Download, Eye } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SITE } from '../../config/site'
import { useLanguage } from '../../hooks/useLanguage'
import { useLineReveal } from '../../hooks/useLineReveal'
import { useReveal } from '../../hooks/useReveal'
import { useRevealed } from '../../hooks/useRevealed'
import { CvDialog } from './CvDialog'
import { Timeline } from './Timeline'
import './about.css'

/**
 * Read the CV here, or take the file — shown only once the file is actually
 * served.
 *
 * The link is checked rather than assumed: the rest of the section already
 * removes a missing portrait and a missing project shot rather than leaving
 * something broken on the page, and a download that 404s is worse than no
 * button at all.
 */
function Cv({ ready }: { ready: boolean }) {
  const { t } = useLanguage()
  /** On the same lines as everything else on the page, but not until the line
   *  above it has finished — see `useRevealed`. */
  const [box, shown] = useRevealed(ready)
  const [available, setAvailable] = useState(false)
  const [origin, setOrigin] = useState<DOMRect | null>(null)
  const [open, setOpen] = useState(false)
  const viewButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch(SITE.cv, { method: 'HEAD' })
      .then((response) => {
        // The status alone is not enough: a dev server (and any host with an
        // SPA fallback) answers an unknown path with index.html and a 200, so
        // a missing PDF would still look present. Ask what came back.
        const type = response.headers.get('content-type') ?? ''
        if (!cancelled && response.ok && type.includes('pdf')) setAvailable(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!available) return null

  return (
    /* `data-shown` rather than `data-reveal`, because this block has a
       condition on it that a plain reveal cannot carry — but the position it
       answers to is the same one, so it comes and goes with its neighbours
       instead of on a clock of its own. Leaving `data-reveal` on as well would
       put useReveal's opacity in a fight with the CSS transition. */
    <div className="about__cv" ref={box} data-shown={shown || undefined}>
      <p className="about__cv-intro">{t.about.cvIntro}</p>

      <div className="about__cv-actions">
        <button
          type="button"
          className="reveal-btn"
          ref={viewButton}
          onClick={() => {
            setOrigin(viewButton.current?.getBoundingClientRect() ?? null)
            setOpen(true)
          }}
        >
          <span className="reveal-btn__badge" aria-hidden="true" />
          <span className="reveal-btn__icon" aria-hidden="true">
            <Eye size={17} strokeWidth={1.9} />
          </span>
          <span className="reveal-btn__label">{t.about.cvView}</span>
        </button>

        <a className="reveal-btn reveal-btn--download" href={SITE.cv} download>
          <span className="reveal-btn__badge" aria-hidden="true" />
          <span className="reveal-btn__icon" aria-hidden="true">
            <Download size={17} strokeWidth={1.9} />
          </span>
          <span className="reveal-btn__label">{t.about.cv}</span>
        </a>
      </div>

      {open ? <CvDialog origin={origin} onClose={() => setOpen(false)} /> : null}
    </div>
  )
}

/**
 * Portrait. The filename lives in `SITE.portrait`.
 *
 * The figure removes itself if the image fails to load, rather than leaving a
 * broken-image icon in the middle of the section — so renaming or removing the
 * file degrades quietly instead of breaking the layout.
 */
function Portrait({ alt }: { alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <figure className="about__portrait" data-reveal>
      <img
        src={SITE.portrait}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </figure>
  )
}

export function About() {
  const { t, language } = useLanguage()
  const root = useRef<HTMLDivElement>(null)
  useReveal(root)
  /** The prose is the one thing in the section that does not arrive in blocks.
   *  Keyed on the language: different sentences wrap differently, so the
   *  paragraphs are different heights and hold a different number of lines. */
  useLineReveal(root, language)
  /** Whether the line has reached the point it ends on. Everything below the
   *  line waits for it, so neither "read the whole history" nor the figures
   *  summing it up can arrive before the history has finished drawing.
   *
   *  It is only ever a condition on arriving. Where the two blocks stand on the
   *  screen decides everything after that — including the order they leave in,
   *  which this could not describe: the line loses its last point while both
   *  are still on screen, and hanging their exits on that would take the pair
   *  of them out together. */
  const [pathDone, setPathDone] = useState(false)
  const [factsBox, factsShown] = useRevealed(pathDone)

  return (
    <div className="about" ref={root}>
      <div className="container">
        <div className="about__grid">
          <div className="about__main">
            <h2 className="section__title" data-reveal>
              {t.about.title}
            </h2>

            {/* `data-lines` rather than `data-reveal`: these arrive a line at
                a time as the page scrolls, not a paragraph at a time. The mask
                that does it is in about.css and the arithmetic is in
                `useLineReveal` — which is a mask and not a span per line
                because this column is justified and hyphenated, and neither
                survives being cut into one block per line. */}
            <div className="about__prose">
              {t.about.paragraphs.map((paragraph, index) => (
                <p key={index} data-lines>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* The line the section lands on, in the lead's voice — hence
                `section__lead`, which is exactly the treatment asked for. */}
            <p className="section__lead about__tagline" data-reveal>
              {t.about.tagline}
            </p>
          </div>

          <aside className="about__aside">
            <Portrait alt={t.about.portraitAlt} />
          </aside>
        </div>

        {/* Full width, straight after the prose, and immediately before the CV:
            the paragraphs above say the path did not start in IT, this is that
            path, and the button to read the whole thing properly sits at the
            end of it.

            It has to be full width — alternating points inside the 1.22fr text
            column would be two very narrow ones, and the long headlines wrap
            to five lines there. That is why the CV block came OUT of the text
            column rather than the line going into it: putting the line before
            the CV was the ask, and only one of the two could keep the column.

            The CV block loses nothing by the move. Its paragraph was already
            capped at 40rem — about what the column gave it — and the buttons
            are an inline-grid that takes its width from the wider label, so
            neither of them stretches now that the room is wider. */}
        <Timeline onComplete={setPathDone} />

        <Cv ready={pathDone} />

        {/* Full width, under both columns: the facts read as one row of labelled
            values rather than a narrow stack beside the portrait. The heading
            sits outside the panel, so the panel holds only the values and can
            centre them.

            Same treatment as the CV above it, and the order between the two
            comes from where they sit rather than from any delay. This block is
            187px lower, so scrolling down it crosses the entrance line second
            and scrolling up it crosses the exit line first — last in, first
            out, at any speed and without either of them counting.

            Delays were what did this before, and they only held while the
            reader scrolled slowly enough for them: at speed, the contact
            section below reached its own line before this one's 1240ms had
            elapsed, and "Reden wir?" arrived ahead of both blocks. */}
        <section
          className="about__facts-block"
          ref={factsBox}
          data-shown={factsShown || undefined}
        >
          <h3 className="about__facts-title">{t.about.factsTitle}</h3>
          <div className="about__facts card">
            <dl className="about__facts-list">
              {t.about.facts.map((fact) => (
                <div className="about__fact" key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
              <div className="about__fact">
                <dt>{t.about.languagesTitle}</dt>
                <dd>
                  {t.about.languages.map((language) => (
                    <span className="about__language" key={language.name}>
                      {language.name}
                      <span className="about__language-level">{language.level}</span>
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </div>
  )
}
