import { ArrowUp } from 'lucide-react'
import { useState } from 'react'
import { SITE } from '../../config/site'
import { useLanguage } from '../../hooks/useLanguage'
import { useScrollTo } from '../../hooks/useScrollTo'
import { useVisitCount } from '../../hooks/useVisitCount'
import './footer.css'

export function Footer() {
  const { t } = useLanguage()
  const scrollTo = useScrollTo()
  const year = new Date().getFullYear()

  /**
   * How many times the site has been opened, hidden behind the name in the
   * colophon and dressed as a build number — `v1.2317` reads as a version, not
   * as a tally, which is the point.
   *
   * Until the count arrives the name is plain text, not a button that does
   * nothing: if the counter is unreachable there is no dead control to press,
   * and the line is the line it always was.
   */
  const visits = useVisitCount()
  const [stamped, setStamped] = useState(false)

  return (
    <>
      {/* Above the rule, not inside the footer: it is a way back up, not a
          piece of the colophon. */}
      <div className="container back-to-top">
        <button type="button" className="back-to-top__btn" onClick={() => scrollTo('top')}>
          {t.footer.backToTop}
          <ArrowUp size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <footer className="footer">
        <div className="container footer__inner">
          <div className="footer__meta">
            <p className="footer__name">{SITE.name}</p>
            <p className="footer__tagline">{t.footer.tagline}</p>
          </div>

          <p className="footer__legal">
            ©{' '}
            {year}{' '}
            {visits === null ? (
              SITE.name
            ) : (
              <button
                type="button"
                className="footer__stamp-toggle"
                aria-expanded={stamped}
                onClick={() => setStamped((on) => !on)}
              >
                {SITE.name}
              </button>
            )}{' '}
            · {t.footer.location} · {t.footer.rights}
            {stamped && visits !== null && (
              <span className="footer__stamp"> · v1.{visits}</span>
            )}
          </p>
        </div>
      </footer>
    </>
  )
}
