import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { motionBudget } from '../../hooks/usePrefersReducedMotion'

/** The sprite sheet is the single heaviest asset on the page, so the character
 *  arrives in its own chunk and the copy paints first. */
const CharacterStage = lazy(() =>
  import('../Character/CharacterStage').then((module) => ({
    default: module.CharacterStage,
  })),
)
import './hero.css'

/** Where the hero stacks and the two lines start arriving on their own
 *  schedule. Matches the breakpoint in hero.css. */
const PHONE = 720

export function Hero() {
  const { t, language } = useLanguage()
  const root = useRef<HTMLElement>(null)

  // Which line greets you is drawn once per load, not per render — picking it
  // inline would hand you a different one on every re-render, including the
  // one that happens when you switch language.
  const [pick] = useState(() => Math.floor(Math.random() * 1000))
  const taglines = t.hero.taglines
  const tagline = taglines[pick % taglines.length]

  useGSAP(
    () => {
      const budget = motionBudget()
      const greeting = root.current?.querySelector('.hero__greeting')
      const targets = gsap.utils.toArray<HTMLElement>('[data-hero-item]')
      const stage = root.current?.querySelector('.hero__stage')

      // Both lines are staged rather than arriving together, on a phone and now
      // on a desktop too: the greeting first, the line under it a second later.
      //
      // The desktop used to open the greeting at 0.08s and start the tagline
      // 0.16s after it, which is not a stagger anyone can see — the two landed
      // together and the greeting read as having been there all along. A phone
      // waits longer than this because the two lines are the whole of its first
      // screen and the wave is playing beside them; a desktop has the character
      // arriving at the same time, so it does not need as much.
      //
      // These are timeline positions, not durations, so they are not the motion
      // budget's to cut: under `prefers-reduced-motion` the travel goes and the
      // fades shorten, but the order and the pacing survive.
      //
      // Both still animate FROM an offset, so where they finish is where the
      // layout puts them — nothing here decides their position.
      const phone = window.matchMedia(`(max-width: ${PHONE}px)`).matches
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      })

      // The greeting arrives on its own, and quickly — it is the first thing
      // read, so it should be there almost at once rather than easing in over
      // most of a second like the copy that follows it.
      if (greeting) {
        tl.from(
          greeting,
          {
            opacity: 0,
            y: budget.travel(phone ? 22 : 14),
            duration: budget.duration(phone ? 0.6 : 0.55),
          },
          phone ? 1 : 0.55,
        )
      }

      tl.from(
        targets,
        {
          opacity: 0,
          y: budget.travel(phone ? 22 : 18),
          duration: budget.duration(phone ? 0.6 : 0.72),
          stagger: budget.stagger(0.075),
        },
        phone ? 2.5 : 1.55,
      )

      if (stage) {
        tl.from(
          stage,
          {
            opacity: 0,
            scale: budget.reduced ? 1 : 0.94,
            duration: budget.duration(1.05),
            ease: 'power2.out',
          },
          budget.reduced ? 0 : 0.35,
        )
      }
    },
    { scope: root, dependencies: [language] },
  )

  return (
    <section id="home" className="section hero" ref={root}>
      <div className="container hero__grid">
        <div className="hero__copy">
          <Greeting text={t.hero.greeting} />

          <p className="hero__tagline" data-hero-item>
            {tagline}
          </p>

        </div>

        <div className="hero__stage">
          <Suspense fallback={<div className="hero__stage-fallback" aria-hidden="true" />}>
            <CharacterStage />
          </Suspense>
        </div>
      </div>

    </section>
  )
}

/**
 * The greeting, lit by the accent colour.
 *
 * With a cursor the light follows it: a small accent-coloured pool clipped to
 * the glyphs, written to CSS custom properties from the pointer handler so it
 * costs a style write and no React render. Without one there is nothing to
 * follow, so a tap lights the whole line for two seconds and it fades back.
 */
function Greeting({ text }: { text: string }) {
  const node = useRef<HTMLHeadingElement>(null)
  const [lit, setLit] = useState(false)

  const fine =
    typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches

  /** Put the light where the pointer is. Shared by the cursor, which moves it
   *  continuously, and by a tap, which sets it once and leaves it there. */
  const aim = useCallback((event: React.PointerEvent<HTMLHeadingElement>) => {
    const el = node.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--lx', `${((event.clientX - rect.left) / rect.width) * 100}%`)
    // Down the page in px, not per cent: the box this lands in is taller than
    // the heading by `--bleed` at each end, and a percentage would be read
    // against that taller box and put the light above where you touched.
    el.style.setProperty('--ly', `${event.clientY - rect.top}px`)
  }, [])

  const track = useCallback(
    (event: React.PointerEvent<HTMLHeadingElement>) => {
      if (!fine) return
      aim(event)
    },
    [aim, fine],
  )

  // Touch: hold the tint, then let it go.
  useEffect(() => {
    if (!lit) return
    const timer = setTimeout(() => setLit(false), 2000)
    return () => clearTimeout(timer)
  }, [lit])

  return (
    <h1
      className="hero__greeting"
      ref={node}
      data-text={text}
      data-follow={fine || undefined}
      data-lit={lit || undefined}
      onPointerMove={track}
      onPointerDown={(event) => {
        if (fine) return
        // Where you touched, before it lights: the light is anchored here and
        // this is the point it draws back to when it goes.
        aim(event)
        setLit(true)
      }}
    >
      {text}
    </h1>
  )
}
