import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { milestones } from '../../data/timeline'
import { useLanguage } from '../../hooks/useLanguage'
import { motionBudget } from '../../hooks/usePrefersReducedMotion'
import './timeline.css'

gsap.registerPlugin(useGSAP)

/**
 * Every dot's arrival: it grows out of its own centre to full size.
 *
 * Two keyframes rather than one `back.out`, and that is the whole point of the
 * shape. `back.out` is heavily front-loaded — a fifth of the way through the
 * duration it is already three quarters of the way to full size — so however
 * long you make it, what a reader sees is a pop and then a wobble, not
 * something growing. The growth has to occupy the middle of the curve, which is
 * what `power2.inOut` does: slow away from nothing, quick through the middle,
 * slow into place.
 *
 * The bounce is then a separate, smaller move at the end: 12% past full size
 * and back. It reads as settling rather than as overshoot, and it is the only
 * part `back.out` was ever contributing.
 *
 * The dot scales about the point the line passes through. `translate(-50%,-50%)`
 * resolves against the UNSCALED box, so whatever the scale, the element's
 * centre lands on the same coordinate — it opens out of that point instead of
 * growing away from a corner.
 */
const DOT = {
  grow: { scale: 1.12, duration: 0.62, ease: 'power2.inOut' },
  settle: { duration: 0.34, ease: 'power2.out' },
  /**
   * With the preference set it still grows, and that is a deliberate reading of
   * `motionBudget` rather than a bypass of it. What the budget removes is
   * travel, because distance provokes discomfort; a 12px dot going from nothing
   * to 12px is not distance. What it caps is duration, so this is 0.45s — the
   * budget's own ceiling — and the overshoot goes, since a bounce is the one
   * part of this that is decoration rather than the idea.
   *
   * The alternative shipped for a while and was wrong: CSS pinned the dot at
   * scale(1) and cross-faded its opacity instead, so under the preference the
   * dots appeared at full size rather than arriving. Measured, `--dot-scale`
   * never left its final value and the pseudo-element ran 0.75, 0.92, 0.98 of
   * opacity — a fade wearing the name of a grow.
   */
  reduced: { duration: 0.45, ease: 'power2.out' },
}

/**
 * How much further the line has to draw past a point, in px, before the next
 * piece of that point's card arrives.
 *
 * The card no longer appears as one block. Its date comes with the dot, and
 * the headline and the place are each earned by scrolling on — so a point
 * assembles itself while it is read rather than landing complete.
 *
 * 34px is roughly a quarter of the gap between two points on a phone, so a
 * card finishes well before the line reaches the next dot; slow enough to be a
 * sequence, short enough that a reader never has to hunt for the rest of it.
 */
const PART = 34

/** Pieces of a card that arrive one at a time: date, headline, place, detail. */
const PARTS = 4

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
 * How long the line takes to catch up with the scroll position, as the time
 * constant of an exponential chase in ms — it covers about 63% of the distance
 * left in one of these, and effectively all of it in three.
 *
 * The line used to be set straight from `scrollY`, which is smooth only if the
 * scrolling is. A notched mouse wheel does not scroll, it jumps: every click is
 * an instant 100-odd px, and the fill reproduced each one as a step. Chasing
 * the value instead of taking it turns those steps into one continuous glide,
 * because what the eye follows is now the chase and not the input.
 *
 * 110ms is the length that smooths the wheel without lagging behind a drag: a
 * notch is absorbed in a third of a second, which is under the ~400ms gap
 * between two clicks of a wheel being turned steadily, so the line is never
 * more than one notch behind the page.
 */
const GLIDE = 110

/**
 * The path, as points on one line that draws itself while you scroll.
 *
 * The line is a single element — one faint rail from the first dot to the last,
 * with one accent fill over it whose height chases the scroll position frame by
 * frame. It used to be a segment per point, each scaled from 0 to 1 by a
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
export function Timeline({ onComplete }: { onComplete?: (done: boolean) => void }) {
  const { t, language } = useLanguage()
  const wrap = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLSpanElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  /** Which points the line has reached. Index-keyed rather than a count: a page
   *  loaded halfway down has to be able to arrive with a run of them already
   *  true. */
  /**
   * How far each point has come, as a small integer: 0 is not reached, 1 is the
   * dot and its date, and each step after that is one more line of the card.
   *
   * One array rather than a boolean for the dot and a second number for the
   * card, because both answers come from the same comparison — how far the line
   * has drawn past this point — and two states written from one place can drift
   * apart in a way one cannot.
   */
  const [stage, setStage] = useState<number[]>(() => milestones.map(() => 0))
  /** Reactive rather than read once: a phone turned on its side crosses this,
   *  and the reach line moves when it does. */
  const [phone, setPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(PHONE).matches,
  )

  /**
   * The line reaching its end, reported upwards.
   *
   * What follows the timeline on the page is the CV block, and it used to
   * appear before the last point did — `useReveal` brings a block in when its
   * top crosses 90% of the viewport, while a point lights at 60%, and the CV
   * sits only ~200px below the final dot. So the invitation to read the whole
   * history arrived while the history was still being drawn.
   *
   * Passing the fact up rather than having About watch the DOM: the component
   * that decides when a point is lit is the only one that can say so without
   * a second copy of that arithmetic.
   */
  const last = (stage[stage.length - 1] ?? 0) > 0
  useEffect(() => {
    onComplete?.(last)
  }, [last, onComplete])

  /**
   * Every dot growing into place, on GSAP.
   *
   * It animates a custom property, not the element: the dot is a pseudo-element
   * (see timeline.css) and there is nothing there for a tween to hold. Every
   * `.timeline__item` carries its own `--dot-scale` and the stylesheet reads it
   * for all of them, so one effect drives the whole line.
   *
   * `played` is what stops a dot restarting every time a LATER dot lights.
   * `useGSAP` reverts the previous run's tweens when its dependencies change,
   * which puts an already-grown dot back to nothing — so a dot that has had its
   * tween is SET to 1 here rather than skipped. Returning early instead is the
   * bug that leaves every earlier point invisible the moment the next one
   * arrives.
   *
   * `fromTo` rather than `to`, because scrolling back up and down again has to
   * replay it — a `to` from a value already at 1 would do nothing the second
   * time. Under `prefers-reduced-motion` it is set rather than tweened: growth
   * is travel, which is the thing that preference is about, and the dot still
   * has its card's cross-fade arriving beside it.
   */
  const litKey = stage.map((value) => (value > 0 ? '1' : '0')).join('')
  const played = useRef<boolean[]>([])
  useGSAP(
    () => {
      const items = wrap.current?.querySelectorAll<HTMLLIElement>('.timeline__item')
      if (!items) return
      const budget = motionBudget()
      items.forEach((item, index) => {
        if (!(stage[index] > 0)) {
          played.current[index] = false
          gsap.set(item, { '--dot-scale': 0 })
          return
        }
        if (played.current[index]) {
          gsap.set(item, { '--dot-scale': 1 })
          return
        }
        played.current[index] = true
        if (budget.reduced) {
          gsap.fromTo(
            item,
            { '--dot-scale': 0 },
            { '--dot-scale': 1, duration: DOT.reduced.duration, ease: DOT.reduced.ease },
          )
          return
        }
        gsap.fromTo(
          item,
          { '--dot-scale': 0 },
          {
            keyframes: [
              {
                '--dot-scale': DOT.grow.scale,
                duration: DOT.grow.duration,
                ease: DOT.grow.ease,
              },
              { '--dot-scale': 1, duration: DOT.settle.duration, ease: DOT.settle.ease },
            ],
          },
        )
      })
    },
    { dependencies: [litKey] },
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

    /** Where the line has drawn to, in px down the rail. Its own value rather
     *  than a reading of the scroll position, because it chases that position
     *  instead of taking it — see GLIDE. */
    let drawn = 0
    let frame = 0
    let clock = 0

    /** Where the line would be if it kept up with the page exactly. */
    const target = (railTop: number) =>
      window.innerHeight * (phone ? REACH.phone : REACH.wide) - railTop

    const render = (railHeight: number) => {
      // Clamped for the fill, unclamped for the points. A point lights when the
      // line has passed it, and the first dot sits at zero — clamping first
      // would make that comparison true while the whole block was still below
      // the fold.
      const height = Math.min(Math.max(drawn, 0), railHeight)
      fillEl.style.height = `${height}px`
      // The grey track's window, following the head of the fill. See the mask
      // in timeline.css: solid to the first number, gone by the second, so what
      // is on screen is a short lead of track below the line rather than the
      // whole path laid out in advance.
      //
      // Nothing at all until the line has reached the first dot. `height` is
      // clamped at 0 while the block is still below the fold, so the window was
      // sitting at a flat LEAD there and 80px of grey track hung in the section
      // ahead of any point existing — a line with nothing on it. The lead is
      // worth having between points; it is not worth having before the first
      // one. `drawn` rather than `height` decides, because that is the
      // unclamped value and the first dot sits at zero.
      const lead = drawn < 0 ? 0 : LEAD
      railEl.style.setProperty('--rail-seen', `${height + lead}px`)
      railEl.style.setProperty('--rail-fade', `${height + lead + (lead && FADE)}px`)
      // Read off the same value the fill is drawn from, so a point cannot light
      // before the line visibly reaches it — the smoothing carries the cards
      // with it rather than running ahead of the line.
      setStage((previous) => {
        let changed = false
        const next = dots.map((offset, index) => {
          // 0 until the line arrives, 1 for the bare dot, and one more piece
          // of the card for every PART of line drawn beyond it. The dot has
          // that first PART to itself: it is what gives the date something to
          // arrive after, and it is a distance rather than a delay so that the
          // three lines can only ever appear in their own order — a delay on
          // the date alone loses that race the moment a reader scrolls quickly
          // enough to cross the headline's threshold before it elapses.
          const past = drawn - offset
          const value = past < 0 ? 0 : 1 + Math.min(PARTS, Math.floor(past / PART))
          if (value !== previous[index]) changed = true
          return value
        })
        return changed ? next : previous
      })
    }

    // One frame of the chase: close a share of the remaining distance, where
    // the share comes from how long this frame actually took. Written as a
    // decay rather than a fixed fraction per frame so the line settles in the
    // same third of a second at 60Hz as at 144Hz.
    const step = (now: number) => {
      const rect = railEl.getBoundingClientRect()
      const want = target(rect.top)
      // A tab in the background hands back one enormous delta on return, and an
      // uncapped one would close the whole distance in a single frame. Capping
      // it means the line resumes from where it was.
      const elapsed = Math.min(now - clock, 64)
      clock = now
      drawn += (want - drawn) * (1 - Math.exp(-elapsed / GLIDE))
      // Close enough is arrived. An exponential never actually gets there, so
      // without this the loop would run forever on an ever-halving remainder —
      // and half a pixel of fill is not a thing anyone can see.
      const settled = Math.abs(want - drawn) < 0.5
      if (settled) drawn = want
      render(rect.height)
      frame = settled ? 0 : requestAnimationFrame(step)
    }

    const onScroll = () => {
      if (frame) return
      clock = performance.now()
      frame = requestAnimationFrame(step)
    }

    /** Straight to where it belongs, no chase. For the first paint and for
     *  anything that moves the geometry under the line rather than scrolls it:
     *  a page loaded halfway down should arrive with the line already drawn,
     *  not draw itself once. */
    const snap = () => {
      const rect = railEl.getBoundingClientRect()
      drawn = target(rect.top)
      render(rect.height)
    }

    const reset = () => {
      measure()
      snap()
    }

    reset()

    // Anything that changes the list's height changes where the dots are: a
    // font landing, the language switching to longer headlines, a phone turned
    // on its side. Measure again and redraw from the same scroll position.
    const resize = new ResizeObserver(reset)
    resize.observe(box)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', reset)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', reset)
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
              data-shown={stage[index] > 0 || undefined}
              data-emphasis={milestone.emphasis || undefined}
            >
              {/* The last point is where Jason is now, and it is the only one
                  that carries anything besides its dot. */}
              {index === milestones.length - 1 ? (
                <span className="timeline__pulse" aria-hidden="true" />
              ) : null}

              {/* The card assembles itself as the line draws past. `data-in`
                  is one gate per line of it, and the order is the order they
                  are read in: when, then what, then where. Each waits on a
                  further PART of drawn line, the dot having the first one to
                  itself, so the order holds at any scroll speed. */}
              <div className="timeline__card">
                <p className="timeline__period" data-in={stage[index] >= 2 || undefined}>
                  {milestone.period}
                </p>
                <h4 className="timeline__label" data-in={stage[index] >= 3 || undefined}>
                  {milestone.label[language]}
                </h4>
                <p className="timeline__place" data-in={stage[index] >= 4 || undefined}>
                  {milestone.place}
                </p>
                {milestone.detail ? (
                  <p className="timeline__detail" data-in={stage[index] >= 5 || undefined}>
                    {milestone.detail[language]}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
