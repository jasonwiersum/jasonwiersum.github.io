import { useEffect, useState } from 'react'
import { Ambience } from './Ambience'
import Grainient from './Grainient'
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
 * It scrolls, at a quarter of the page's own speed, so the sheet reads as
 * something travelling over a ground that is further away — four times as much
 * travel in the front layer as in the back. The same rate whatever the
 * reader's motion preference: a ground moving slower than the page is not the
 * kind of movement that preference exists for, and a branch there only made it
 * impossible to say what anyone was actually looking at.
 *
 * It does not react to the pointer any more. The swell was built from a
 * displacement along `normalize(cursor - pixel)`, and that direction is
 * undefined where the two meet: every pixel around the cursor was pushed
 * directly away from a single point, which draws a cone with a pinch at its
 * tip rather than a soft lens. The shader keeps the capability — see
 * `enableMouseInteraction` in Grainient — but nothing switches it on.
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
        /* A fifth slower than the 0.390625 it had been run up to. */
        timeSpeed={0.3125}
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
        /* How fast the ground travels, as a fraction of the page's own speed.
           This is the whole parallax: the sheet moves at 1, so anything under
           1 here is the distance between the two layers, and the number IS the
           effect rather than a strength dial.

           Measured on the rendered page with the drift frozen, so the only
           thing moving was this: 800px of scroll moved the gradient 647px at
           0.9 and 240px at 0.3. Eight tenths is not a layer behind the page,
           it is the page — which is exactly how it read, everything descending
           together. A quarter puts four times as much travel in the sheet as
           in the ground, which is the gap that makes two layers legible.

           One number for everyone, and the reason is that guessing which side
           of a `prefers-reduced-motion` branch the reader is standing on has
           now cost several rounds of this. A background at a quarter speed is
           less movement than the page itself already has; there is nothing
           here for a branch to protect anyone from. */
        scrollParallax={0.25}
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
