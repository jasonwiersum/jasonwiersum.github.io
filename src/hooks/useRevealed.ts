import { useEffect, useState } from 'react'
import { REVEAL_BAND } from './useReveal'

/**
 * The same entrance and exit as `data-reveal`, reported as a boolean.
 *
 * `useReveal` animates whatever it finds and tells nobody, which is right for
 * a paragraph and wrong for a block that has a condition attached to it. This
 * crosses the identical lines — `REVEAL_BAND`, one hook so there is one answer
 * — and hands back whether the element is on, leaving the animating to CSS.
 *
 * `gate` is a fact that has to be true before the first appearance, and only
 * before that. The CV block below the timeline is the case it exists for: it
 * must not arrive before the line has drawn to its last point, but once it has
 * arrived, its leaving is the reader's business and not the timeline's. So the
 * gate is read on the way in and ignored on the way out — an element already on
 * screen stays until it leaves the band, even if the gate falls back to false
 * underneath it.
 *
 * Returns a ref callback rather than taking a ref object because the elements
 * that use it can mount late (the CV block waits on a HEAD request for the
 * PDF), and a `useRef` handed to a hook never tells that hook it was filled in.
 */
export function useRevealed(gate = true) {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [inBand, setInBand] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!node) return

    // Two observers with a gap between them, exactly as in useReveal: the box
    // an element enters to appear sits inside the box it leaves to disappear,
    // so the boundary cannot be straddled.
    const show = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInBand(true)
      },
      { rootMargin: REVEAL_BAND.show, threshold: 0.01 },
    )
    const hide = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) setInBand(false)
      },
      { rootMargin: REVEAL_BAND.hide, threshold: 0 },
    )
    show.observe(node)
    hide.observe(node)
    return () => {
      show.disconnect()
      hide.disconnect()
    }
  }, [node])

  useEffect(() => {
    if (!inBand) setShown(false)
    else if (gate) setShown(true)
  }, [inBand, gate])

  return [setNode, shown] as const
}
