import { useEffect } from 'react'
import type { RefObject } from 'react'
import { atDocumentEnd } from './useReveal'
import { motionBudget } from './usePrefersReducedMotion'

/**
 * Where on the screen a line of prose arrives, as a fraction of the viewport
 * height measured from the top.
 *
 * The same idea as the timeline's REACH, and deliberately a little lower than
 * `useReveal`'s 75% entrance: whole blocks arrive as the reader gets to them,
 * whereas a line of text should already be there by the time the eye lands on
 * it. 0.82 puts the arriving line just below the middle-lower third, so the
 * paragraph is always a couple of lines ahead of where anyone is reading.
 */
const REACH = 0.82

/**
 * How far past the reach line a paragraph's first line arrives, in line
 * heights.
 *
 * Zero would start the paragraph exactly as its top edge crosses, which reads
 * as the block waiting to be asked. A line of lead-in means the first line is
 * already on its way as the paragraph comes up.
 */
const LEAD = 1

/** The soft edge under the last arrived line, in line heights. Wide enough that
 *  the next line is visibly on its way in rather than switched on. */
const FEATHER = 0.85

/**
 * Prose that arrives one line at a time as the page scrolls.
 *
 * Every element carrying `data-lines` inside `scope` gets a mask whose edge
 * steps down it in whole line boxes, so what is on screen is the paragraph as
 * far as the reader has got and no further.
 *
 * A mask rather than one element per line, and that is the whole design
 * decision here. The obvious implementation — split the text into a span per
 * line and hand those to `useReveal` — cannot survive this page's own
 * typography: `.about__prose p` is `text-align: justify` with `hyphens: auto`,
 * and a line that becomes its own block is a block whose last line is its only
 * line, so nothing justifies and the column goes ragged. Hyphenation breaks it
 * outright — a word the browser split across two lines has no word boundary to
 * group on, so the halves would be reassembled into the wrong line and the
 * wrapping would change under the measurement that produced it.
 *
 * Masking touches none of that. The text is laid out exactly once, by the
 * browser, justified and hyphenated as written, and all that moves is where it
 * is painted from. It also costs no re-measure when the language changes or the
 * window resizes: line height and the element's own height are read fresh on
 * every frame that matters.
 *
 * Under `prefers-reduced-motion` the mask is removed entirely rather than
 * softened. A line-by-line reveal is motion tied to scrolling and there is no
 * gentler version of it that is still the same idea; the paragraph is simply
 * there.
 */
export function useLineReveal(scope: RefObject<HTMLElement | null>, revision?: unknown) {
  useEffect(() => {
    const root = scope.current
    if (!root) return
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-lines]'))
    if (targets.length === 0) return

    if (motionBudget().reduced) {
      for (const el of targets) el.style.removeProperty('--seen')
      root.dataset.lineReveal = 'off'
      return () => {
        delete root.dataset.lineReveal
      }
    }
    root.dataset.lineReveal = 'on'

    /** The resolved line box of an element, in px. `line-height: normal`
     *  computes to the string rather than a length in some browsers, so the
     *  font size carries the fallback. */
    const lineBox = (el: HTMLElement) => {
      const style = getComputedStyle(el)
      const resolved = Number.parseFloat(style.lineHeight)
      if (Number.isFinite(resolved) && resolved > 0) return resolved
      return Number.parseFloat(style.fontSize) * 1.6
    }

    let frame = 0
    const draw = () => {
      frame = 0
      const floor = atDocumentEnd()
      const reach = window.innerHeight * REACH
      for (const el of targets) {
        const rect = el.getBoundingClientRect()
        const line = lineBox(el)
        // Whole lines only: a fractional edge creeping down a line of text is a
        // wipe across the letters, which is a different effect and a worse one.
        // Stepping in line boxes is what makes this read as lines arriving.
        const lines = Math.floor((reach - rect.top) / line) + LEAD
        // Where the page has run out there is no more scroll to earn the rest
        // with — the same floor `useReveal` puts under its own entrance line.
        const seen = floor ? rect.height : Math.max(0, lines) * line
        el.style.setProperty('--seen', `${Math.min(seen, rect.height)}px`)
        el.style.setProperty('--feather', `${line * FEATHER}px`)
      }
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(draw)
    }

    draw()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    // The text reflowing changes how many lines there are and where they sit —
    // a font landing, or the language switching to longer sentences.
    const resize = new ResizeObserver(onScroll)
    for (const el of targets) resize.observe(el)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      delete root.dataset.lineReveal
    }
  }, [scope, revision])
}
