import { useEffect, useRef, useState } from 'react'
import { milestones } from '../../data/timeline'
import { useLanguage } from '../../hooks/useLanguage'
import './timeline.css'

/** The line the layout changes on — timeline.css uses the same number, so the
 *  rail moving to the left edge and the trigger moving up the screen happen
 *  together rather than at two different widths. */
const PHONE = '(max-width: 48rem)'

/**
 * How far into the viewport a point has to be before it lights, as an inset on
 * the bottom of the observer's box.
 *
 * A phone waits far longer than a desktop, and the reason is the shape of the
 * layout rather than the size of the screen. Wide, the points alternate and
 * each one owns a row about 180px tall, so at most two are ever near the fold
 * and 12% is enough to make them arrive one at a time. Narrow, the same points
 * stack into a single column roughly 140px each in an 844px viewport — five of
 * them fit on screen at once, and at 12% a normal flick brought three or four
 * across the line in the same tick. They all lit together, which is the thing
 * that read as abrupt: the line was not drawing, it was flashing.
 *
 * 32% puts the trigger at roughly two thirds down instead of just above the
 * fold. A point is then well inside the screen before it appears, so the
 * reader scrolls it into place and it lights under the thumb rather than
 * having gone off ahead of them.
 */
const TRIGGER = { wide: '-12%', phone: '-32%' }

/**
 * The path, as points on a line that draws itself while you scroll.
 *
 * Every point is watched on its own, and the whole animation is a `data-shown`
 * attribute being switched on it — the movement is CSS transitions from there,
 * with the ordering inside a point (line, then dot, then card) done with
 * transition delays rather than a timeline.
 *
 * IntersectionObserver rather than ScrollTrigger, for the reason `useReveal`
 * gives at length: the About section carries its own scroll-scrubbed transform
 * from `useSectionTransitions`, which moves these elements continuously, and a
 * ScrollTrigger start position computed once does not know about that. The
 * observer reports real rendered geometry every time, so the two cannot
 * disagree.
 *
 * CSS rather than GSAP, once the observer is doing the watching. A point has
 * three parts that have to move in a fixed order and never in parallel with
 * anything else, which is what transition-delay is for; bringing a timeline
 * library in to schedule three delays would only add a second thing that can
 * hold a transform on these nodes.
 */
export function Timeline() {
  const { t, language } = useLanguage()
  const list = useRef<HTMLOListElement>(null)
  /** Which points have been reached. Index-keyed rather than a count: they do
   *  not necessarily arrive in order — a page loaded halfway down, or a fast
   *  scroll that skips several in one tick, brings them in together. */
  const [shown, setShown] = useState<boolean[]>(() => milestones.map(() => false))
  /** Reactive rather than read once: a phone turned on its side crosses this,
   *  and the observers below have to be rebuilt when it does — a rootMargin
   *  cannot be changed on an observer that already exists. */
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
    const node = list.current
    if (!node) return
    const items = Array.from(node.querySelectorAll<HTMLLIElement>('.timeline__item'))
    if (items.length === 0) return

    // Two observers with different boxes, the same shape as useReveal: the box
    // a point has to enter to appear sits inside the box it has to leave to
    // disappear, so anyone stopped exactly on one edge does not get a point
    // flickering on and off a pixel either way.
    //
    // The inset at the bottom is what makes the line arrive rather than being
    // already there: a point lights when it is properly into the viewport, not
    // the instant its first pixel crosses the fold. See TRIGGER for why a
    // phone waits more than twice as long as a desktop.
    const show = new IntersectionObserver(
      (entries) => {
        const reached = entries.filter((entry) => entry.isIntersecting)
        if (reached.length === 0) return
        setShown((previous) => {
          const next = [...previous]
          for (const entry of reached) next[items.indexOf(entry.target as HTMLLIElement)] = true
          return next
        })
      },
      { rootMargin: `0px 0px ${phone ? TRIGGER.phone : TRIGGER.wide} 0px`, threshold: 0.01 },
    )

    const hide = new IntersectionObserver(
      (entries) => {
        const gone = entries.filter((entry) => !entry.isIntersecting)
        if (gone.length === 0) return
        setShown((previous) => {
          const next = [...previous]
          for (const entry of gone) next[items.indexOf(entry.target as HTMLLIElement)] = false
          return next
        })
      },
      { rootMargin: '20% 0px 20% 0px', threshold: 0 },
    )

    items.forEach((item) => {
      show.observe(item)
      hide.observe(item)
    })
    return () => {
      show.disconnect()
      hide.disconnect()
    }
  }, [phone])

  return (
    <section className="timeline">
      <h3 className="timeline__title" data-reveal>
        {t.about.timelineTitle}
      </h3>

      {/* An ordered list because it is one: these are steps in sequence, and a
          screen reader should say so. The rail and the dots are decoration
          drawn in CSS, so nothing here has to be hidden from it. */}
      <ol className="timeline__list" ref={list}>
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
            {/* The faint track this point's share of the line is drawn over.
                One per point rather than one behind the whole list: the list
                runs to the bottom of the LAST CARD, so a single track
                overshot the last dot by the height of its text and left the
                line trailing off into nothing. Per point, it ends where the
                last dot is, because the last point does not get one. */}
            {index < milestones.length - 1 ? (
              <span className="timeline__track" aria-hidden="true" />
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
    </section>
  )
}
