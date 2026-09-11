import { BookOpen, Download, Eye } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SITE } from '../../config/site'
import { DOC_GROUPS } from '../../data/documents'
import { useLanguage } from '../../hooks/useLanguage'
import { useReveal } from '../../hooks/useReveal'
import { useRevealed } from '../../hooks/useRevealed'
import { CvDialog } from './CvDialog'
import { DocsDialog } from './DocsDialog'
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
  const { t, language } = useLanguage()
  /** On the same lines as everything else on the page, but not until the line
   *  above it has finished — see `useRevealed`. */
  const [box, shown] = useRevealed(ready)
  const [available, setAvailable] = useState(false)
  const [origin, setOrigin] = useState<DOMRect | null>(null)
  const [open, setOpen] = useState(false)
  const [docsOrigin, setDocsOrigin] = useState<DOMRect | null>(null)
  const [docsOpen, setDocsOpen] = useState(false)
  const viewButton = useRef<HTMLButtonElement>(null)
  const docsButton = useRef<HTMLButtonElement>(null)
  /** Whether there is anything behind the certificates button at all. A
   *  constant, since the list is declared rather than discovered. */
  const hasDocs = DOC_GROUPS.some((group) => group.docs.length > 0)

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

  // The certificates do not depend on the CV existing, so a missing CV must not
  // take them off the page with it — it only takes its own two buttons.
  if (!available && !hasDocs) return null

  return (
    /* `data-shown` rather than `data-reveal`, because this block has a
       condition on it that a plain reveal cannot carry — but the position it
       answers to is the same one, so it comes and goes with its neighbours
       instead of on a clock of its own. Leaving `data-reveal` on as well would
       put useReveal's opacity in a fight with the CSS transition. */
    <div className="about__cv" ref={box} data-shown={shown || undefined}>
      <p className="about__cv-intro">{t.about.cvIntro}</p>

      <div className="about__cv-actions">
        {available ? (
          <>
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
          </>
        ) : null}

        {hasDocs ? (
          <button
            type="button"
            /* The label shift is German-only. It centres the label in the room
               the badge leaves rather than in the pill, which is right for
               "Zeugnisse und Zertifizierungen" — long enough that the pill is
               mostly label — and wrong for "Ver certificados" and "View
               certificates", which are short enough that the free room is
               nearly the whole pill and the shift would carry them past the
               middle instead of onto it. That is the same reasoning the view
               button already sits out for; see `.reveal-btn--download` in
               about.css. */
            className={`reveal-btn${language === 'de' ? ' reveal-btn--docs' : ''}`}
            ref={docsButton}
            onClick={() => {
              setDocsOrigin(docsButton.current?.getBoundingClientRect() ?? null)
              setDocsOpen(true)
            }}
          >
            <span className="reveal-btn__badge" aria-hidden="true" />
            <span className="reveal-btn__icon" aria-hidden="true">
              <BookOpen size={17} strokeWidth={1.9} />
            </span>
            <span className="reveal-btn__label">{t.about.docsView}</span>
          </button>
        ) : null}
      </div>

      {open ? <CvDialog origin={origin} onClose={() => setOpen(false)} /> : null}
      {docsOpen ? (
        <DocsDialog origin={docsOrigin} onClose={() => setDocsOpen(false)} />
      ) : null}
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
  const { t } = useLanguage()
  const [failed, setFailed] = useState(false)
  /** Whether the bubble is out. A click puts it there, the pointer leaving the
   *  photo takes it away — so it costs a click each time, and hovering past the
   *  picture afterwards stays quiet. */
  const [saying, setSaying] = useState(false)
  const bubble = useRef<HTMLSpanElement>(null)

  /**
   * Put the bubble where the cursor is.
   *
   * Straight onto the node, not through state: a pointer crossing the photo
   * fires this dozens of times a second, and re-rendering the section for a
   * pair of numbers nothing else reads is the same mistake the character's
   * gaze avoids by keeping its own position in a ref.
   *
   * The flip is for the right-hand edge. The portrait is the right column on a
   * wide screen, so a bubble always drawn to the right of the cursor would hang
   * off the window; past that margin it is drawn to the left instead, and the
   * tail moves with it.
   */
  const follow = (event: { clientX: number; clientY: number }) => {
    const node = bubble.current
    if (!node) return
    node.toggleAttribute('data-flip', event.clientX + 200 > window.innerWidth)
    node.style.translate = `${event.clientX}px ${event.clientY}px`
  }

  if (failed) return null

  return (
    <figure
      className="about__portrait"
      data-reveal
      onPointerDown={(event) => {
        // A tap is not a hover: on a touch screen nothing would ever take the
        // bubble away again, so the gesture is left to pointers that can leave.
        if (event.pointerType === 'touch') return
        // The left button only. A right-click is on its way to a menu that is
        // about to be refused, and answering it with the bubble would read as
        // the refusal.
        if (event.button !== 0) return
        follow(event)
        setSaying(true)
      }}
      // No context menu on the photograph. See the note in about.css for what
      // this does and does not achieve.
      onContextMenu={(event) => event.preventDefault()}
      onPointerMove={saying ? follow : undefined}
      onPointerLeave={() => setSaying(false)}
    >
      <img
        src={SITE.portrait}
        alt={alt}
        loading="lazy"
        decoding="async"
        // Dragging an image to the desktop saves it, which is the one download
        // route that needs no menu at all.
        draggable={false}
        onError={() => setFailed(true)}
      />
      {/* On the body, not in the figure, and for two reasons that both bite.
          The section carries a scroll-scrubbed transform, which makes it the
          containing block for anything fixed inside it — measured, a click at
          x=1059 put the bubble at x=1939 — and the figure clips its overflow to
          hold the portrait's push-in, which would cut the bubble in half.

          Always mounted, so that it can fade out as well as in, and so the
          click has something to position before it is seen. Hidden from
          assistive technology on purpose: it is a joke about a picture whose
          alt text already says who this is, and it is reachable only with a
          pointer. */}
      {createPortal(
        <span
          className="about__bubble"
          ref={bubble}
          data-saying={saying || undefined}
          aria-hidden="true"
        >
          {t.about.portraitBubble}
        </span>,
        document.body,
      )}
    </figure>
  )
}

/**
 * How long the prose waits before its entrance, in seconds.
 *
 * It used to wait 0.9 — a whole entrance — so that the heading above it had
 * FINISHED rather than merely begun. That is more order than the section
 * needed and it was felt as a delay: measured from crossing the line to being
 * fully there, a paragraph took 2.2s against the heading's 1.1s and the
 * closing line's 1.1s, and nearly all of the difference was dead waiting.
 *
 * 0.2 puts a paragraph at 0.84s from the line to the first sign of it, which
 * is the closing line's own 0.88s — the line the section reveals at a speed
 * that reads right. The heading still leads it by about a third of a second,
 * which is the part that has to stay true.
 */
const REVEAL_S = 0.2

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
            <h2 className="section__title" data-reveal>
              {t.about.title}
            </h2>

            {/* Ordinary `data-reveal`, exactly as a project card — so these
                come and go the same way one does, in both directions, and leave
                back the way they came. `data-reveal-after` is the one addition:
                REVEAL_S of wait, which is `useReveal`'s own entrance length, so
                the heading above is finished and not merely started before the
                first paragraph moves. */}
            <div className="about__prose">
              {t.about.paragraphs.map((paragraph, index) => (
                <p key={index} data-reveal data-reveal-after={REVEAL_S}>
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
