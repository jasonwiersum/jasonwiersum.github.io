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
 * None. This was two, on the reasoning that a blank column looks like a failure
 * to load — but the gate below means the column is only ever blank once the
 * heading and the portrait are already in place, so there is nothing to
 * mistake it for. Two free lines put text on screen before the reveal had
 * started, which is the thing being fixed.
 */
const LEAD = 0

/**
 * The fastest the reveal is allowed to run, in lines per second.
 *
 * This is the fix for a reveal that was correct and still looked like nothing.
 * Anchoring the mask to the block's passage across the screen made it span
 * 500px of scroll instead of 150 — measurably line by line, and still invisible,
 * because 500px is ONE flick of a trackpad. At any real scrolling speed the
 * whole thing was over in about a third of a second, which is less than the
 * 900ms `useReveal` spends fading the section's heading in. Hence the report
 * that the text was there before the title.
 *
 * Scroll position still decides where the reveal is HEADED. What it no longer
 * decides is how fast it gets there: the drawn edge chases that target at this
 * rate, so a flick plays the reveal out over ~1.8s instead of collapsing it
 * into one frame. The timeline's rail solves the same problem the same way —
 * see GLIDE there.
 *
 * 9 keeps up with reading. A line is about 34px of scroll here, so the chase
 * only starts trailing above ~300px/s, which is faster than anyone reads.
 */
const RATE = 9

/**
 * The same, for a reader who has asked for less motion.
 *
 * The reveal is NOT switched off there, and the earlier decision to switch it
 * off was a mistake with a bad reason attached: I wrote that a line-by-line
 * reveal is motion and has no gentler version. It moves nothing. A mask only
 * decides which parts of a static column are painted, so what this actually is
 * is a cross-fade spread down a paragraph — the exact thing `motionBudget`
 * says survives the preference, because distance and duration are what provoke
 * vestibular discomfort and a fade is neither.
 *
 * What the preference does get is the shorter duration that budget already
 * applies everywhere else: at 24 lines a second the whole block cross-fades in
 * about 0.7s rather than 1.8, and nothing travels in either case.
 */
const RATE_REDUCED = 24

/**
 * The soft edge on the drawn mark, in line heights.
 *
 * 0.4, down from 1.1. At a whole line box the fade was always straddling an
 * entire line, so a line that had arrived still had most of its height part
 * painted — it read as grey rather than as text. At 0.4 the edge is still soft,
 * but a line goes solid within about 40ms of being counted at the shipping
 * rate, so what a reader sees is a line arriving and then being there.
 */
const FEATHER = 0.4

/**
 * Prose that fills in line by line as the page scrolls.
 *
 * Scroll position decides where the reveal is HEADED; the clock decides how
 * fast it gets there. Both are needed. Scroll alone made the reveal correct and
 * invisible — see RATE — because the distance a block takes to cross the screen
 * is a distance a trackpad covers in one gesture.
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
 * Under `prefers-reduced-motion` it still runs, only quicker — see
 * RATE_REDUCED. Nothing here travels, so there is nothing for the preference
 * to take away except time.
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

    const rate = motionBudget().reduced ? RATE_REDUCED : RATE
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

    // Where the reveal is headed, and where it has actually drawn to. They are
    // two numbers because scroll decides the first and the clock decides the
    // second — see RATE.
    let drawn = 0
    let frame = 0
    let clock = 0
    let primed = false

    /**
     * Whether the section has finished arriving.
     *
     * The prose waits for its own heading and the portrait beside it. Both are
     * ordinary `useReveal` targets, so asking what their opacity is now is the
     * same question as "have they arrived", and it needs no second copy of that
     * hook's timing to answer.
     *
     * A fraction of the viewport cannot express this. The heading sits about
     * 100px above the prose, so any fixed line the prose waits for is crossed
     * roughly 100px of scroll after the heading crosses its own — a tenth of a
     * second at reading speed, against the 900ms the heading takes to fade in.
     * The prose was starting while the heading was barely visible.
     *
     * A portrait that failed to load removes itself, so only the gates that
     * exist are asked.
     */
    const arrived = () =>
      ['.section__title', '.about__portrait']
        .map((selector) => root.querySelector<HTMLElement>(selector))
        .every((el) => !el || Number.parseFloat(getComputedStyle(el).opacity) > 0.98)

    /** How many lines the scroll position asks for, and how they divide up. */
    const measure = () => {
      const height = window.innerHeight
      const line = lineBox(targets[0])
      // Read fresh every frame: the language switching or a font landing
      // changes the wrapping, and nothing here caches across it.
      const counts = targets.map((el) =>
        Math.max(1, Math.round(el.getBoundingClientRect().height / line)),
      )
      const total = counts.reduce((sum, n) => sum + n, 0)
      const top = targets[0].getBoundingClientRect().top
      const progress = (height * START - top) / (height * (START - END))
      // Where the page has run out there is no scroll left to earn the rest
      // with — the same floor `useReveal` puts under its own entrance line.
      const want = !arrived() ? 0 : atDocumentEnd() ? total : progress * total + LEAD
      const rect = targets[0].getBoundingClientRect()
      const onScreen = rect.bottom > 0 && rect.top < height
      return { line, counts, total, onScreen, want: Math.min(Math.max(want, 0), total) }
    }

    const paint = (line: number, counts: number[]) => {
      let left = drawn
      targets.forEach((el, index) => {
        const give = Math.min(Math.max(left, 0), counts[index])
        left -= counts[index]
        el.style.setProperty('--seen', `${give * line}px`)
        el.style.setProperty('--feather', `${line * FEATHER}px`)
      })
    }

    // One frame of the chase: close the distance at RATE lines a second, so the
    // reveal takes the same time however violently the page was scrolled.
    const step = (now: number) => {
      const { line, counts, total, onScreen, want } = measure()
      // A backgrounded tab hands back one enormous delta on return; capping it
      // means the reveal resumes from where it was rather than completing in a
      // single frame.
      const elapsed = Math.min(now - clock, 64) / 1000
      clock = now
      const limit = rate * elapsed
      const gap = want - drawn
      drawn += Math.abs(gap) <= limit ? gap : Math.sign(gap) * limit
      paint(line, counts)
      // Settled is not the only reason to keep ticking. The gate above opens on
      // the heading finishing its fade, which is a clock the reader does not
      // touch — stop on `want === drawn` alone and a reader who stops scrolling
      // exactly as the heading lands leaves the prose hidden until they move
      // again, because no frame ever comes to notice. So the loop also runs
      // while the block is on screen with lines still owed.
      const settled = Math.abs(want - drawn) < 0.01
      const owed = drawn < total - 0.01
      frame = settled && !(onScreen && owed) ? 0 : requestAnimationFrame(step)
    }

    const onScroll = () => {
      if (frame) return
      clock = performance.now()
      frame = requestAnimationFrame(step)
    }

    /** Straight to where it belongs, no chase. For the first paint and for
     *  anything that moves the geometry rather than scrolls it: a page opened
     *  half way down should arrive with the prose already there, not play its
     *  reveal at someone who has not scrolled. */
    const snap = () => {
      const { line, counts, want } = measure()
      drawn = want
      paint(line, counts)
      primed = true
    }

    const draw = () => (primed ? onScroll() : snap())

    draw()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', snap)
    // The text reflowing changes how many lines there are — a font landing, or
    // the language switching to longer sentences.
    const resize = new ResizeObserver(snap)
    for (const el of targets) resize.observe(el)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', snap)
      clear()
    }
  }, [scope, revision])
}
