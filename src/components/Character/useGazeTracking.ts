import { useEffect, useRef, type RefObject } from 'react'
import { DEAD_ZONE, MAX_GAZE, SENSITIVITY, SMOOTHING } from './characterConfig'

export interface Gaze {
  x: number
  y: number
}

/**
 * Turns pointer movement into a smoothed gaze vector in -1…1.
 *
 * Nothing here touches React state: the pointer writes a target, an animation
 * frame eases the current value towards it, and the caller reads that value in
 * the same frame. A `mousemove` handler that re-rendered would both stutter and
 * do far more work than the job needs.
 *
 * -1…1 is measured from the centre of the character, not the viewport, so the
 * gaze answers "where is the cursor relative to me". Each side is scaled by the
 * room actually available on that side: the character sits right of centre in
 * the hero, so a shared viewport-width divisor would let it look fully left but
 * only ~70% right. Measuring towards the nearer edge keeps the two symmetric.
 */
export function useGazeTracking(
  anchor: RefObject<HTMLElement | null>,
  onFrame: (gaze: Gaze, delta: number) => void,
) {
  const target = useRef<Gaze>({ x: 0, y: 0 })
  const current = useRef<Gaze>({ x: 0, y: 0 })
  const enabled = useRef(false)

  useEffect(() => {
    // A touch screen has no cursor to follow; the character simply rests.
    const fine = window.matchMedia('(pointer: fine)')
    const syncPointerKind = () => {
      enabled.current = fine.matches
      if (!fine.matches) target.current = { x: 0, y: 0 }
    }
    syncPointerKind()
    fine.addEventListener('change', syncPointerKind)

    const onPointerMove = (event: PointerEvent) => {
      if (!enabled.current) return
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
      const node = anchor.current
      if (!node) return

      const rect = node.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const toX = event.clientX - cx
      const toY = event.clientY - cy
      const roomX = toX < 0 ? cx : window.innerWidth - cx
      const roomY = toY < 0 ? cy : window.innerHeight - cy
      const dx = toX / (Math.max(roomX, 1) * SENSITIVITY.x)
      const dy = toY / (Math.max(roomY, 1) * SENSITIVITY.y)

      // Radial dead zone, then rescale what is left so the response still
      // reaches the extremes — a plain cut would waste the first tenth of travel.
      //
      // The dead zone is radial so that a parked cursor cannot drift the head
      // in any direction, but the RESCALE must not be: capping the vector's
      // length at 1 turns a square reach into a unit circle, and a circle has
      // no corners. With that cap the pointer in the top-left of the window
      // asked for (-0.64, +0.77) rather than (-1, +1), so the four diagonal
      // frames could not be chosen at all — measured, the corners settled 9 to
      // 14 frames short of the ones they should reach.
      //
      // Only the dead zone comes out here. Each axis is capped on its own by
      // the MAX_GAZE clamp below, which is where that job belonged all along.
      const len = Math.hypot(dx, dy)
      let scale = 0
      if (len > DEAD_ZONE) scale = (len - DEAD_ZONE) / len / (1 - DEAD_ZONE)
      target.current = {
        x: clamp(dx * scale, -MAX_GAZE, MAX_GAZE),
        y: clamp(-dy * scale, -MAX_GAZE, MAX_GAZE), // screen y grows downward
      }
    }

    const rest = () => {
      target.current = { x: 0, y: 0 }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('blur', rest)
    document.addEventListener('pointerleave', rest)

    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1)
      last = now
      // Exponential smoothing: identical feel at 60Hz and at 144Hz.
      const k = 1 - Math.exp(-SMOOTHING * delta)
      current.current.x += (target.current.x - current.current.x) * k
      current.current.y += (target.current.y - current.current.y) * k
      onFrame(current.current, delta)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      fine.removeEventListener('change', syncPointerKind)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('blur', rest)
      document.removeEventListener('pointerleave', rest)
      cancelAnimationFrame(frame)
    }
  }, [anchor, onFrame])
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}
