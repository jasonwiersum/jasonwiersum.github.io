import { useEffect, useState } from 'react'

/** Where a section has to reach to be the one being read: 45% down the screen. */
const LINE = 0.45

/** How close to the foot of the document counts as the end of it. */
const END = 40

/**
 * Which section currently owns the viewport.
 *
 * A reading line sits 45% down the screen and the active section is the one it
 * falls in — the last section that starts above it. Sections run one after the
 * other, so exactly one contains the line, and it changes the moment a new
 * section's top crosses it.
 *
 * This replaced an IntersectionObserver watching a 5%-tall band, which could
 * not see the last section at all. Two things went wrong at once and the fix
 * for either alone would have left the other:
 *
 *   - A band 5% tall has to be *reached*. The contact section is short and the
 *     footer below it is not, so on a tall window the page runs out of scroll
 *     with the band still inside the section above: measured at 1280x1300,
 *     scrolled fully to the bottom, the band sat at 585-650 while contact began
 *     at 726. No amount of scrolling could light it.
 *   - Where two sections did share the band, the tie went to whichever came
 *     first in the document — so `about`, which is nearly 2900px tall, beat
 *     `contact` for the whole overlap.
 *
 * The end of the document is the one place the line cannot answer, for the same
 * reason: a short last section under a tall footer never reaches it. So the foot
 * of the page picks the last section with anything on screen. The old code had
 * this rule too, but it lived in a scroll handler that the observer's callback
 * then overruled — which is why the island could sit on the wrong item while
 * the contact form filled the screen.
 *
 * Reading the geometry on scroll rather than through an observer is also what
 * makes the answer checkable: the same numbers a test measures are the numbers
 * this decides on.
 */
export function useSectionObserver(sectionIds: readonly string[], line = LINE): string {
  const [activeId, setActiveId] = useState<string>(sectionIds[0] ?? '')

  useEffect(() => {
    if (sectionIds.length === 0) return

    const rects = () =>
      sectionIds
        .map((id) => {
          const el = document.getElementById(id)
          return el ? { id, top: el.getBoundingClientRect().top } : null
        })
        .filter((entry): entry is { id: string; top: number } => entry !== null)

    const pick = () => {
      const found = rects()
      if (found.length === 0) return null

      const reading = window.innerHeight * line
      // The last section that starts above the line is the one the line is in.
      // Nothing above it yet means the page is still at the very top.
      let winner = found[0].id
      for (const entry of found) {
        if (entry.top <= reading) winner = entry.id
      }

      const remaining =
        document.documentElement.scrollHeight - window.innerHeight - window.scrollY
      if (remaining <= END) {
        const last = [...found].reverse().find((entry) => entry.top < window.innerHeight)
        if (last) winner = last.id
      }
      return winner
    }

    let frame = 0
    const update = () => {
      frame = 0
      const winner = pick()
      if (winner) setActiveId(winner)
    }
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [sectionIds, line])

  return activeId
}
