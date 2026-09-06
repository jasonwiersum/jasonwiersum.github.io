import { useEffect, useState } from 'react'
import { Ambience } from './Ambience'
import Grainient from './Grainient'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useTheme } from '../../hooks/useTheme'
import './backdrop.css'

/** Where the sheet already goes edge to edge — globals.css uses the same
 *  number, and the background has to change on the same line the sheet does. */
const PHONE = '(max-width: 48rem)'

/**
 * The page's background.
 *
 * On anything wider than a phone, a WebGL gradient that drifts, sitting behind
 * everything and moving slowly enough that you notice it only when you stop
 * reading. A phone gets the static wash instead — `Ambience`, unchanged, which
 * is what the page had before this: the character is already animating there,
 * on a screen where it fills far more of the view.
 *
 * That also settles the sheet on a phone, which paints nothing and used to need
 * a veil on this layer to stand in for it. `Ambience` is fixed and covers the
 * viewport, so it is behind the content, it covers the gap a rubber-band scroll
 * opens at the edges, and it is the ground the page always had. The one it
 * replaced —
 * a static radial wash plus a grain overlay — is still here in `Ambience.tsx`:
 * render that instead of this and the old look is back, nothing else needs
 * touching.
 *
 * It scrolls, at three tenths of the page's own speed, so the sheet reads as
 * something travelling over it rather than as a window onto something pinned —
 * except under `prefers-reduced-motion`, where the scroll link is the one part
 * of this that the preference is for.
 *
 * It reacts to the pointer: the gradient swells around it and leans toward the
 * accent within half a screen, and follows on a delay rather than tracking it
 * exactly.
 *
 * The palette is the site's own. In light it runs from the page background up
 * to the accent, with the lighter accent as the tone between them; in dark it
 * runs from the near-black background to the accent that theme already uses,
 * which keeps the same three-step shape without lighting the page up.
 */

/* Light: --background, --accent, and the dark theme's --accent between them.
   Dark keeps the last two and swaps the first for --background-elevated, which
   is a step off flat black — the true --background there left the quiet corner
   looking like a hole rather than a dark end of the gradient.

   Written out rather than read from the custom properties because the shader
   wants numbers, and a colour that has to be parsed out of a computed style at
   mount is a colour that can arrive late. */
const PALETTE = {
  light: { color1: '#d6e3ff', color2: '#0038ff', color3: '#5b84ff' },
  dark: { color1: '#111219', color2: '#0038ff', color3: '#5b84ff' },
} as const

export function Backdrop() {
  const { theme } = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  const palette = PALETTE[theme]
  // Reactive rather than read once: a tablet turned on its side crosses this,
  // and a WebGL context left running behind a static wash would be a phone's
  // battery spent on something nobody can see.
  const [phone, setPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(PHONE).matches,
  )
  useEffect(() => {
    const media = window.matchMedia(PHONE)
    const onChange = (event: MediaQueryListEvent) => setPhone(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  if (phone) return <Ambience />

  return (
    <div className="backdrop" aria-hidden="true">
      <Grainient
        color1={palette.color1}
        color2={palette.color2}
        color3={palette.color3}
        /* A quarter faster again, on top of the quarter before it. */
        timeSpeed={0.390625}
        colorBalance={0}
        warpStrength={1}
        warpFrequency={5}
        warpSpeed={2}
        warpAmplitude={50}
        blendAngle={0}
        blendSoftness={0.05}
        rotationAmount={500}
        noiseScale={2}
        grainAmount={0}
        grainScale={2}
        grainAnimated={false}
        contrast={1.5}
        gamma={1}
        saturation={1}
        centerX={0}
        centerY={0}
        zoom={0.9}
        enableMouseInteraction
        mouseRadius={0.5}
        /* The one thing here that is scroll-linked travel, and the one thing
           the preference is actually about. */
        scrollParallax={reducedMotion ? 0 : 0.3}
        /* Not paused under `prefers-reduced-motion`, which is a reversal: it
           used to be, and the result was a backdrop frozen dead for anyone with
           the OS setting on — measured, 0.000 of 255 over two and a half
           seconds against 16.4 without it. The preference is about travel, as
           motionBudget says in as many words, and this is a colour drifting
           across tens of seconds with nothing moving through space. The
           parallax above is the part that does travel, and that is what stops
           instead. */
        paused={false}
      />
      <div className="backdrop__scrim" />
    </div>
  )
}
