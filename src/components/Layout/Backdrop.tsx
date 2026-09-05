import Grainient from './Grainient'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useTheme } from '../../hooks/useTheme'
import './backdrop.css'

/**
 * The page's background.
 *
 * A WebGL gradient that drifts, sitting behind everything and moving slowly
 * enough that you notice it only when you stop reading. The one it replaced —
 * a static radial wash plus a grain overlay — is still here in `Ambience.tsx`:
 * render that instead of this and the old look is back, nothing else needs
 * touching.
 *
 * The palette is the site's own. In light it runs from the page background up
 * to the accent, with the lighter accent as the tone between them; in dark it
 * runs from the near-black background to the accent that theme already uses,
 * which keeps the same three-step shape without lighting the page up.
 */

/* Light: --background, the dark theme's --accent as the middle tone, --accent.
   Dark: --background, --accent, and --background-elevated to keep the darkest
   corner from going flat black. Written out rather than read from the custom
   properties because the shader wants numbers, and a colour that has to be
   parsed out of a computed style at mount is a colour that can arrive late. */
const PALETTE = {
  light: { color1: '#d6e3ff', color2: '#0038ff', color3: '#5b84ff' },
  dark: { color1: '#111219', color2: '#0038ff', color3: '#5b84ff' },
} as const

export function Backdrop() {
  const { theme } = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  const palette = PALETTE[theme]

  return (
    <div className="backdrop" aria-hidden="true">
      <Grainient
        color1={palette.color1}
        color2={palette.color2}
        color3={palette.color3}
        timeSpeed={0.25}
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
        paused={reducedMotion}
      />
      <div className="backdrop__scrim" />
    </div>
  )
}
