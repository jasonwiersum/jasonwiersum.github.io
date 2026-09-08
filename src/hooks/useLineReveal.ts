import { useEffect } from 'react'
import type { RefObject } from 'react'
import { motionBudget } from './usePrefersReducedMotion'
import { atDocumentEnd } from './useReveal'

/**
 * The stretch of screen the whole block reveals across, as fractions of the
 * viewport height measured from the top: the first line arrives as the block's
 * top passes START, the last as it passes END.
 *
 * These two numbers are the fix for a reveal that did not work at all, and the
 * reason they are a span rather than a line is worth keeping.
 *
 * The first version gave every line its own crossing: line k arrived as line k
 * reached a fixed height on screen. That is the obvious model and it is
 * unusable, because it ties the reveal's length to the block's own height — a
 * 175px paragraph reveals over exactly 175px of scroll, which is one notch of a
 * wheel. Measured on the deployed page, the first paragraph went from one line
 * to all six between scrollY 1500 and 1650 while `useReveal` was still 900ms
 * into fading the section's heading in. The text was fully there before the
 * title it sits under had arrived.
 *
 * Anchoring to the block instead breaks that coupling: the reveal now takes
 * 0.62 of a viewport whatever the prose is, which is ~570px on a laptop against
 * the 175 it had. START is also below `useReveal`'s 75% entrance on purpose —
 * the heading is a little above the prose, so it crosses its own line first and
 * the section still arrives heading-first.
 *
 * END is not 0. The reveal has to finish while the block is still comfortably
 * on screen; running it to the top edge would leave the last lines arriving
 * under the reader's eye, which is the opposite of the point.
 */
const START = 0.72
const END = 0.1

/**
 * Lines already there when the block starts arriving.
 *
 * Zero would begin every read from a blank column, which looks like a failure
 * to load rather than an effect. Two lines in means the paragraph is legibly a
 * paragraph from the first frame and what follows is it filling in.
 */
const LEAD = 2

/** The soft edge under the last arrived line, in line heights. Wide enough that
 *  the next line is visibly on its way in rather than switched on. */
const FEATHER = 0.9

/**
 * Prose that fills in line by line as the page scrolls.
 *
 * Every element carrying `data-lines` inside `scope` is masked, and the masks
 * are driven from ONE counter spanning all of them: the block reveals as a
 * single run of lines, so the second paragraph cannot start while the first is
 * unfinished. A count per paragraph is what that would give — each one starting
 * its own clock as its own top crossed — and the overlap reads as two things
 * happening rather than one column filling in.
 *
 * A mask rather than one element per line, and that is the other design
 * decision here. Splitting the text into a span per line and handing those to
 * `useReveal` cannot survive this page's typography: `.about__prose p` is
 * `text-align: justify` with `hyphens: auto`, and a line that becomes its own
 * block is a block whose last line is its only line, so nothing justifies and
 * the column goes ragged. Hyphenation breaks it outright — a word the browser
 * split across two lines has no word boundary to group on, so the halves would
 * be reassembled into the wrong line and the wrapping would change under the
 * measurement that produced it.
 *
 * Masking touches none of that. The browser lays the text out exactly once,
 * justified and hyphenated as written, and all that moves is where it is
 * painted from.
 *
 * Under `prefers-reduced-motion` the mask is removed entirely rather than
 * softened. A line-by-line reveal is motion tied to scrolling and there is no
 * gentler version of it that is still the same idea; the prose is simply there.
 */
export function useLineReveal(scope: RefObject<HTMLElement | null>, revision?: unknown) {
  useEffect(() => {
    const root = scope.current
    if (!root) return
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-lines]'))
    if (targets.length === 0) return

    const clear = () => {
      for (const el of targets) {
        el.style.removeProperty('--seen')
        el.style.removeProperty('--feather')
      }
      delete root.dataset.lineReveal
    }

    if (motionBudget().reduced) {
      clear()
      return
    }
    root.dataset.lineReveal = 'on'

    /** The resolved line box of an element, in px. `line-height: normal`
     *  computes to the keyword rather than a length, so the font size carries
     *  the fallback. */
    const lineBox = (el: HTMLElement) => {
      const style = getComputedStyle(el)
      const resolved = Number.parseFloat(style.lineHeight)
      if (Number.isFinite(resolved) && resolved > 0) return resolved
      return Number.parseFloat(style.fontSize) * 1.6
    }

    let frame = 0
    const draw = () => {
      frame = 0
      const height = window.innerHeight
      const line = lineBox(targets[0])
      // How many lines each paragraph holds, and how far the block has come.
      // Both read fresh every frame: the language switching or a font landing
      // changes the wrapping, and nothing here caches a measurement across it.
      const counts = targets.map((el) =>
        Math.max(1, Math.round(el.getBoundingClientRect().height / line)),
      )
      const total = counts.reduce((sum, n) => sum + n, 0)
      const top = targets[0].getBoundingClientRect().top
      const span = height * (START - END)
      const progress = (height * START - top) / span

      // Where the page has run out there is no scroll left to earn the rest
      // with — the same floor `useReveal` puts under its own entrance line.
      const shown = atDocumentEnd() ? total : Math.floor(progress * total) + LEAD

      let left = shown
      targets.forEach((el, index) => {
        const give = Math.min(Math.max(left, 0), counts[index])
        left -= counts[index]
        // Whole lines only. A fractional edge creeping down a line of text is a
        // wipe across the letters, which is a different effect and a worse one.
        el.style.setProperty('--seen', `${give * line}px`)
        el.style.setProperty('--feather', `${line * FEATHER}px`)
      })
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(draw)
    }

    draw()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    // The text reflowing changes how many lines there are — a font landing, or
    // the language switching to longer sentences.
    const resize = new ResizeObserver(onScroll)
    for (const el of targets) resize.observe(el)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      clear()
    }
  }, [scope, revision])
}
