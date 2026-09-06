import { Moon, Sun } from 'lucide' // icon data, not components
import { MorphIcon } from 'morphicons/react'
import { useLanguage } from '../../hooks/useLanguage'
import { useTheme } from '../../hooks/useTheme'

/**
 * Light/dark switch.
 *
 * One icon that morphs between the two shapes rather than two icons crossing
 * over each other, the same as the settings gear beside it — the sun's rays
 * draw back into the moon's crescent and out again, so the two controls in the
 * island behave alike.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()

  return (
    <button
      type="button"
      className="island island--theme glass theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t.a11y.switchToLight : t.a11y.switchToDark}
      aria-pressed={theme === 'dark'}
    >
      <MorphIcon
        className="theme-toggle__icon"
        icon={theme === 'dark' ? Moon : Sun}
        size={17}
        strokeWidth={1.9}
        /* `snappy` (k 420, c 30) read as a flick rather than a change of state.
           This is the same spring slowed down: the damping ratio is kept at
           snappy's 0.73 — c / 2*sqrt(k) — so the shape still settles with the
           same faint overshoot, and only the rate changes, by sqrt(420/210),
           about 1.4x. The gear beside it keeps `snappy`: opening a panel should
           answer at once, where changing the whole page's theme can take a
           moment. */
        spring={{ stiffness: 210, damping: 21 }}
        /* A 17px glyph changing shape in place is not a vestibular trigger, so
           it keeps animating under prefers-reduced-motion — "user" made it swap
           instantly on any machine with the OS setting on. Same call as the
           gear next to it. */
        reducedMotion="never"
      />
    </button>
  )
}
