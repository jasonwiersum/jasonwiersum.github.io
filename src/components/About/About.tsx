import { Download, Eye } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SITE } from '../../config/site'
import { useLanguage } from '../../hooks/useLanguage'
import { motionBudget } from '../../hooks/usePrefersReducedMotion'
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

/** How long `useReveal` takes over one entrance, in ms. Its own default, and
 *  the wait the prose serves so the heading is finished and not merely started
 *  before the first paragraph moves. */
const REVEAL_MS = 900

/**
 * How long the last timeline card takes to finish writing itself once the line
 * has passed its final threshold, in ms.
 *
 * 300 of delay plus 620 of fade, both from the card-line rules in timeline.css.
 * Duplicated here rather than plumbed through because what the CV is waiting
 * for is a CSS transition in another component, and a number with the two
 * halves named beside it is easier to keep true than an event listener reaching
 * across the boundary.
 *
 * Not run through `motionBudget`: those rules have no reduced-motion variant,
 * so the transition is 920ms whatever the preference, and a shorter wait would
 * put the CV back on top of the text it is meant to follow.
 */
const LAST_CARD_MS = 920

export function About() {
  const { t } = useLanguage()
  const root = useRef<HTMLDivElement>(null)
  useReveal(root)

  /**
   * The heading arrives, and only then the paragraphs under it.
   *
   * Document order alone very nearly does this already — the heading sits above
   * the prose, so it crosses the entrance line first and `useReveal` staggers a
   * group in the order it finds it. What it does not give is a guarantee: the
   * two cross within about a tenth of a second of each other at reading speed,
   * against the 900ms an entrance takes, so the paragraphs were fading up while
   * the heading was still mostly transparent and the pair read as arriving
   * together.
   *
   * So the prose waits on the heading twice over: for it to cross the same line
   * (`useRevealed` reports exactly that, using `useReveal`'s own band so there
   * is one answer), and then for its entrance to finish. The gate is read on
   * the way in and ignored on the way out, which is what `useRevealed` is for —
   * scrolling back up, the prose leaves on its own account rather than waiting
   * for the heading again.
   */
  const [titleBox, titleShown] = useRevealed()
  const [afterTitle, setAfterTitle] = useState(false)
  useEffect(() => {
    if (!titleShown) {
      setAfterTitle(false)
      return
    }
    // Capped with everything else under `prefers-reduced-motion`: the order is
    // the point and the waiting is not, so the wait shortens with the entrance
    // it is waiting for rather than outliving it.
    const wait = motionBudget().duration(REVEAL_MS / 1000) * 1000
    const timer = window.setTimeout(() => setAfterTitle(true), wait)
    return () => window.clearTimeout(timer)
  }, [titleShown])
  const [proseBox, proseShown] = useRevealed(afterTitle)

  /**
   * Once the paragraphs are in, they stay in.
   *
   * `useRevealed` takes them back out when they leave the band, which every
   * other block on the page wants — a heading or a panel replays its entrance
   * and that reads as the page being alive. Body copy is not that. Scrolling
   * back up to re-read a sentence meant scrolling almost to the heading before
   * the paragraphs would come back, because the entrance line they answer to
   * is near the top of the screen and they had genuinely been unshown.
   *
   * So this latches. It is deliberately one-way and never resets: the reader
   * has already seen these words, and there is nothing to reveal to them a
   * second time.
   */
  const [proseStays, setProseStays] = useState(false)
  useEffect(() => {
    if (proseShown) setProseStays(true)
  }, [proseShown])
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

  /**
   * The line reaching its last point is not the same as that point being
   * READ-able, and the CV block has to wait for the second.
   *
   * `pathDone` goes true when the last card's final threshold is crossed —
   * which is the moment its last line is TOLD to appear, not the moment it is
   * there. Measured before this wait: the CV block was at 0.44 opacity with all
   * four lines of the closing point still at zero. So the invitation to read
   * the whole history was, again, arriving over the top of the history.
   */
  const [pathSettled, setPathSettled] = useState(false)
  useEffect(() => {
    if (!pathDone) {
      setPathSettled(false)
      return
    }
    const timer = window.setTimeout(() => setPathSettled(true), LAST_CARD_MS)
    return () => window.clearTimeout(timer)
  }, [pathDone])

  const [factsBox, factsShown] = useRevealed(pathSettled)

  return (
    <div className="about" ref={root}>
      <div className="container">
        <div className="about__grid">
          <div className="about__main">
            <h2 className="section__title" ref={titleBox} data-reveal>
              {t.about.title}
            </h2>

            {/* `data-shown` on the block rather than `data-reveal` on each
                paragraph: the paragraphs still arrive one after another, but
                the whole run is held until the heading above them has finished.
                A `data-reveal` cannot be held — `useReveal` animates whatever
                it finds, on its own schedule. */}
            <div className="about__prose" ref={proseBox} data-shown={proseStays || undefined}>
              {t.about.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
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

        <Cv ready={pathSettled} />

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
