import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { RefObject } from 'react'
import { motionBudget } from './usePrefersReducedMotion'

gsap.registerPlugin(useGSAP)

/**
 * The two lines every entrance and exit on the page is measured against, as
 * `rootMargin` strings — shared so that anything not driven by this hook can
 * cross the same lines rather than guess at them (see `useRevealed`).
 *
 * Read them as positions down the viewport. `show` ends 25% up from the bottom,
 * so an element appears once its top has risen past 75% of the screen. `hide`
 * ends 10% up, so it leaves once its top sinks back past 90%.
 *
 * Both used to sit further down — appearing at 90% and leaving at 115%, which
 * is off the bottom of the screen entirely. That made the exit invisible: an
 * element scrolled back up slid off the edge at full opacity and was simply
 * gone. The exit now begins with the last tenth of the screen still holding it,
 * so blocks fade down out of the bottom the way they faded up into it.
 *
 * The gap between the lines is the point of having two. It is 15% of the
 * viewport — 135px on a laptop — and inside it nothing changes at all, so
 * someone parked on the boundary cannot flicker an element in and out. Moving
 * the exit line up meant moving the entrance line up with it to keep that gap;
 * 75% is also late enough that a block below the timeline cannot arrive before
 * the line has drawn to its last point, which is the order the section needs.
 */
export const REVEAL_BAND = {
  show: '0px 0px -25% 0px',
  hide: '15% 0px -10% 0px',
} as const

/**
 * Whether the page has run out of scroll.
 *
 * The floor under both entrance lines. An element in the last screenful can sit
 * below the show line with no way of rising above it — there is no more page —
 * and would stay hidden for good; where the page ends, whatever is left is
 * brought in. Shared with `useRevealed` so the two answers cannot differ.
 */
export function atDocumentEnd(): boolean {
  const page = document.documentElement
  return window.scrollY + window.innerHeight >= page.scrollHeight - 2
}

/**
 * Scroll-linked entrance and exit for a section.
 *
 * Any descendant carrying `data-reveal` fades and lifts into place as it comes
 * into view, staggered in document order, and fades back out once it has left
 * — so scrolling back up plays the entrance again rather than finding
 * everything already there.
 *
 * Two observers rather than one, with different margins. A single observer
 * toggling on the same edge would flicker for anyone stopped right on it: one
 * pixel either way would fade the element in and out. So the box an element
 * has to enter to appear sits *inside* the box it has to leave to disappear,
 * and the gap between them is dead space where nothing changes.
 *
 * Driven by IntersectionObserver rather than ScrollTrigger on purpose. Sections
 * carry their own scroll-scrubbed transform (see `useSectionTransitions`), which
 * moves their children continuously — and a ScrollTrigger start position, once
 * computed, does not know about that. The result was elements sitting at
 * opacity 0 inside the viewport until something forced a refresh.
 * IntersectionObserver reports real rendered geometry every time, so the two
 * effects can no longer disagree.
 *
 * Under `prefers-reduced-motion` the lift collapses to zero and the timings
 * tighten, so this becomes a cross-fade rather than disappearing altogether —
 * see `motionBudget`.
 */
export function useReveal(
  scope: RefObject<HTMLElement | null>,
  options: { stagger?: number; y?: number; duration?: number } = {},
) {
  /**
   * Seconds for one element's entrance, and between two siblings'.
   *
   * These were 0.3 and 0.2, and 0.3s is eighteen frames — long enough to see,
   * too short to read as movement, so a heading arriving as you scrolled past
   * it registered as a pop rather than as something coming in. Nearly a second
   * on `power2.inOut` gives the fade a slow start and a slow end, which is the
   * part that was missing: the first tenth of the curve now moves 2% of the
   * way instead of a fifth of it.
   *
   * The stagger comes down as the duration goes up. Held at 0.2 a five-element
   * group would take 1.7s end to end and the last of them would still be
   * arriving after the reader had scrolled past; at 0.16 the entrances overlap
   * generously, which is what makes a group read as one movement rather than
   * as a queue.
   */
  const { stagger = 0.16, y = 22, duration = 0.9 } = options

  useGSAP(
    () => {
      const budget = motionBudget()
      const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]')
      if (targets.length === 0) return

      const lift = budget.travel(y)
      gsap.set(targets, { opacity: 0, y: lift })

      // Elements crossing a line within the same tick animate as one staggered
      // group; a later arrival starts its own group.
      let entering: HTMLElement[] = []
      let leaving: { el: HTMLElement; above: boolean }[] = []
      let flush: ReturnType<typeof setTimeout> | undefined

      const play = () => {
        const shown = entering
        const hidden = leaving
        entering = []
        leaving = []

        if (shown.length > 0) {
          gsap.to(shown, {
            opacity: 1,
            y: 0,
            duration: budget.duration(duration),
            ease: 'power2.inOut',
            stagger: budget.stagger(stagger),
            overwrite: 'auto',
          })
        }

        for (const { el, above } of hidden) {
          gsap.to(el, {
            opacity: 0,
            // Back the way it came: something that left over the top lifts
            // away upwards, not down into the viewport it just left.
            y: above ? -lift : lift,
            // Quicker going than coming. An exit only starts once the element
            // is 15% of a viewport clear of the edge, so nobody is watching it
            // — matching the entrance's length there would only mean an
            // element scrolled back to while still fading out, which arrives
            // mid-fade and has to fight its own tween.
            duration: budget.duration(duration * 0.6),
            ease: 'power2.inOut',
            overwrite: 'auto',
          })
        }
      }

      const schedule = () => {
        clearTimeout(flush)
        flush = setTimeout(play, 60)
      }

      // Inner box: an element appears once it is properly inside the viewport.
      const show = new IntersectionObserver(
        (entries) => {
          let queued = false
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            entering.push(entry.target as HTMLElement)
            queued = true
          }
          if (queued) schedule()
        },
        { rootMargin: REVEAL_BAND.show, threshold: 0.01 },
      )

      // Outer box: it only disappears once it is clear of the viewport, well
      // past the line that brought it in.
      const hide = new IntersectionObserver(
        (entries) => {
          let queued = false
          for (const entry of entries) {
            if (entry.isIntersecting) continue
            leaving.push({
              el: entry.target as HTMLElement,
              above: entry.boundingClientRect.top < 0,
            })
            queued = true
          }
          if (queued) schedule()
        },
        { rootMargin: REVEAL_BAND.hide, threshold: 0 },
      )

      targets.forEach((target) => {
        show.observe(target)
        hide.observe(target)
      })

      // The floor, applied to every target at once. Raising the show line to
      // 75% brought it within reach of the real page: the deepest element
      // measures 73% of the viewport on a 1440px-tall window, four percent of
      // clearance. It is a floor and not a second entrance — it only ever
      // brings elements in, only where the page has run out, and skips
      // everything already here.
      let sweep = 0
      const onScroll = () => {
        if (sweep) return
        sweep = requestAnimationFrame(() => {
          sweep = 0
          if (!atDocumentEnd()) return
          let queued = false
          for (const target of targets) {
            if (gsap.getProperty(target, 'opacity') === 1) continue
            const rect = target.getBoundingClientRect()
            if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue
            entering.push(target)
            queued = true
          }
          if (queued) schedule()
        })
      }
      // Once up front too: a page short enough to arrive already at its end
      // never fires a scroll event to ask.
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)

      return () => {
        show.disconnect()
        hide.disconnect()
        clearTimeout(flush)
        if (sweep) cancelAnimationFrame(sweep)
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
      }
    },
    { scope, dependencies: [stagger, y, duration] },
  )
}
