import { ArrowLeft, Download } from 'lucide-react'
import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { SITE } from '../../config/site'
import { useDialogTransition } from '../../hooks/useDialogTransition'
import { useLanguage } from '../../hooks/useLanguage'

interface Props {
  /** Where the button sat when it was clicked, so the panel grows out of it. */
  origin: DOMRect | null
  onClose: () => void
}

/**
 * The CV, read in place.
 *
 * Same panel, same growing-out-of-the-control opening and same blurred page
 * behind it as a project — it is the one dialog pattern the site has, so it
 * shares the hook and the stylesheet rather than inventing a second one.
 *
 * The PDF itself goes in an <object>, which hands rendering to whatever the
 * browser already uses for PDFs. Where there is no viewer — most phones — the
 * fallback inside it offers the download instead of showing an empty frame.
 */
export function CvDialog({ origin, onClose }: Props) {
  const { t } = useLanguage()
  const panel = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  const dismiss = useDialogTransition({
    panel,
    scrim,
    origin,
    initialFocus: closeButton,
    onClose,
  })

  return createPortal(
    <div className="dialog">
      <div className="dialog__scrim" ref={scrim} onClick={dismiss} />

      <div
        className="dialog__panel dialog__panel--cv"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t.about.cvTitle}
      >
        <div className="dialog__body dialog__body--cv">
          <div className="cv__bar">
            <button
              type="button"
              className="dialog__back"
              ref={closeButton}
              onClick={dismiss}
            >
              <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
              {t.projects.back}
            </button>

            {/* Icon only in the bar. The label is what made this wrap onto a
                second line on a phone — measured, the bar was 90px there
                against 39 on a desktop, and every one of those 51px came off
                the viewer. `aria-label` carries the words the button no longer
                shows, and `title` puts them back on hover for a pointer. */}
            <a
              className="dialog__back dialog__back--icon"
              href={SITE.cv}
              download
              aria-label={t.about.cv}
              title={t.about.cv}
            >
              <Download size={15} strokeWidth={2} aria-hidden="true" />
            </a>
          </div>

          <object className="cv__doc" data={SITE.cv} type="application/pdf">
            <div className="cv__fallback">
              <p>{t.about.cvIntro}</p>
              <a className="btn" href={SITE.cv} download>
                <Download size={16} strokeWidth={1.9} aria-hidden="true" />
                {t.about.cv}
              </a>
            </div>
          </object>
        </div>
      </div>
    </div>,
    document.body,
  )
}
