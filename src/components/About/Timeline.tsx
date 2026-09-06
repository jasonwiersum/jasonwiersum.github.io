import { useEffect, useRef, useState } from 'react'
import { milestones } from '../../data/timeline'
import { useLanguage } from '../../hooks/useLanguage'
import './timeline.css'

/** The line the layout changes on — timeline.css uses the same number, so the
 *  rail moving to the left edge and the line drawing later happen together
 *  rather than at two different widths. */
const PHONE = '(max-width: 48rem)'

/**
 * Where on the screen the line has drawn to, as a fraction of the viewport
 * height measured from the top.
 *
 * This is the one number that decides when anything appears: the rail is filled
 * down to this height, and a point lights at the moment the fill passes its own
 * dot. So the line and the card it belongs to can never disagree about when
 * that point has been reached — they are the same comparison.
 *
 * Smaller means later. At 1.0 the line would reach a point the instant it
 * crossed the bottom edge; at 0.6 the reader has to bring it well up the screen
 * first. The wide layout was effectively at 0.88 before this and everything
 * arrived while it was still entering — 0.6 puts the drawing head just above
 * the middle of the screen, which is where the eye already is.
 *
 * A phone sits slightly lower. Its points stack in one column about 140px
 * apart, so five are on screen at once and a head at 0.6 would be filling
 * through the third of them while the first is still being read.
 */
const REACH = { wide: 0.6, phone: 0.68 }

/**
 * How much of the grey track shows below the drawn line, in px: solid for the
 * first `LEAD`, then fading out over `FADE`.
 *
 * The lead is roughly half the gap between two points, so what is visible is
 * "the line continues" and not "here is the next thing". The fade is longer
 * than the lead on purpose — a hard end to the grey would read as a second,
 * shorter line rather than as the track running out of sight.
 */
const LEAD = 80
const FADE = 180

/**
 * The path, as points on one line that draws itself while you scroll.
 *
 * The line is a single element — one faint rail from the first dot to the last,
 * with one accent fill over it whose height is set from the scroll position on
 * every frame. It used to be a segment per point, each scaled from 0 to 1 by a
 * CSS transition when that point crossed an IntersectionObserver, and the
 * trouble with that was visible: the segments met at the dots, every dot wore
 * an opaque 3px ring to lift it off the rail, and the result read as nine short
 * strokes with beads between them rather than as one line. It also could not do
 * what was asked of it — a transition runs on its own clock, so the line kept
 * drawing after the reader stopped scrolling.
 *
 * Geometry comes from the rendered page rather than from arithmetic. The fill's
 * length is `getBoundingClientRect()` on the rail against the reach line, which
 * is correct however the section has been transformed — and it is transformed,
 * continuously, by `useSectionTransitions`. Each point's place along the rail is
 * the difference between its own `offsetTop` and the first point's, which needs
 * no length resolved out of a custom property: every dot sits the same `--dot-y`
 * below its own item's top, so those distances cancel.
 *
 * Everything after that is CSS. `data-shown` goes on a point when the fill
 * reaches it, and the card fades and settles from there on a transition; the
 * dot is a spring. React is asked to re-render only when that set of booleans
 * actually changes, not on every frame of scrolling.
 */
export function Timeline() {
  const { t, language } = useLanguage()
  const wrap = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLSpanElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  /** Which points the line has reached. Index-keyed rather than a count: a page
   *  loaded halfway down has to be able to arrive with a run of them already
   *  true. */
  const [shown, setShown] = useState<boolean[]>(() => milestones.map(() => false))
  /** Reactive rather than read once: a phone turned on its side crosses this,
   *  and the reach line moves when it does. */
  const [phone, setPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(PHONE).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(PHONE)
    const onChange = (event: MediaQueryListEvent) => setPhone(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const box = wrap.current
    const railEl = rail.current
    const fillEl = fill.current
    if (!box || !railEl || !fillEl) return
    const items = Array.from(box.querySelectorAll<HTMLLIElement>('.timeline__item'))
    if (items.length === 0) return

    /** Each dot's distance down the rail, and how tall the last item is. */
    let dots: number[] = []

    // The rail has to stop on the last dot, not at the foot of the last card —
    // a rail as tall as the list overshot it by the height of that card's text
    // and left the line trailing off into nothing. Its top is `--dot-y` and its
    // height is the block minus the whole last item, which lands it exactly on
    // that item's own dot. The last item's height is the only part of that CSS
    // cannot work out for itself.
    const measure = () => {
      const last = items[items.length - 1]
      box.style.setProperty('--last-h', `${last.offsetHeight}px`)
      dots = items.map((item) => item.offsetTop - items[0].offsetTop)
    }

    let frame = 0
    const draw = () => {
      frame = 0
      const rect = railEl.getBoundingClientRect()
      const reach =
        window.innerHeight * (phone ? REACH.phone : REACH.wide) - rect.top
      // Clamped for the fill, unclamped for the points. A point lights when the
      // reach line has passed it, and the first dot sits at zero — clamping
      // first would make that comparison true while the whole block was still
      // below the fold.
      const drawn = Math.min(Math.max(reach, 0), rect.height)
      fillEl.style.height = `${drawn}px`
      // The grey track's window, following the head of the fill. See the mask
      // in timeline.css: solid to the first number, gone by the second, so what
      // is on screen is a short lead of track below the line rather than the
      // whole path laid out in advance.
      railEl.style.setProperty('--rail-seen', `${drawn + LEAD}px`)
      railEl.style.setProperty('--rail-fade', `${drawn + LEAD + FADE}px`)
      setShown((previous) => {
        let changed = false
        const next = dots.map((offset, index) => {
          const lit = reach >= offset
          if (lit !== previous[index]) changed = true
          return lit
        })
        return changed ? next : previous
      })
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(draw)
    }

    measure()
    draw()

    // Anything that changes the list's height changes where the dots are: a
    // font landing, the language switching to longer headlines, a phone turned
    // on its side. Measure again and redraw from the same scroll position.
    const resize = new ResizeObserver(() => {
      measure()
      draw()
    })
    resize.observe(box)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [phone, language])

  return (
    <section className="timeline">
      <h3 className="timeline__title" data-reveal>
        {t.about.timelineTitle}
      </h3>

      {/* The rail and its fill are siblings of the list rather than children of
          it — an `<ol>` takes list items and nothing else, and putting a `span`
          in one is markup a validator is right to complain about. They come
          first in the block, so every point paints over them without needing a
          z-index to say so.

          Decoration, both of them: "the line has got this far" is a thing to
          look at, not to be told. */}
      <div className="timeline__rail-wrap" ref={wrap}>
        <span className="timeline__rail" ref={rail} aria-hidden="true" />
        <span className="timeline__fill" ref={fill} aria-hidden="true" />

        {/* An ordered list because it is one: these are steps in sequence, and
            a screen reader should say so. */}
        <ol className="timeline__list">
          {milestones.map((milestone, index) => (
            <li
              className="timeline__item"
              key={milestone.id}
              // Alternating sides. The first point is on the left, and on a
              // narrow screen CSS ignores this and stacks everything to the
              // right of the rail — see timeline.css.
              data-side={index % 2 === 0 ? 'left' : 'right'}
              data-shown={shown[index] || undefined}
              data-emphasis={milestone.emphasis || undefined}
            >
              {/* The last point is where Jason is now, and it is the only one
                  that carries anything besides its dot. */}
              {index === milestones.length - 1 ? (
                <span className="timeline__pulse" aria-hidden="true" />
              ) : null}

              <div className="timeline__card">
                <p className="timeline__period">{milestone.period}</p>
                <h4 className="timeline__label">{milestone.label[language]}</h4>
                <p className="timeline__place">{milestone.place}</p>
                {milestone.detail ? (
                  <p className="timeline__detail">{milestone.detail[language]}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
