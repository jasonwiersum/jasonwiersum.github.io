import { ArrowLeft, ChevronRight, Download, FileText } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DOC_GROUPS, docUrl, type Doc, type DocGroup } from '../../data/documents'
import { useDialogTransition } from '../../hooks/useDialogTransition'
import { useLanguage } from '../../hooks/useLanguage'

interface Props {
  /** Where the button sat when it was clicked, so the panel grows out of it. */
  origin: DOMRect | null
  onClose: () => void
}

/**
 * The certificates and certifications, read in place.
 *
 * The same panel, the same growing-out-of-the-control opening and the same
 * blurred page behind it as the CV and a project — one dialog pattern, one
 * hook, one stylesheet.
 *
 * Three steps rather than one list, because there are two kinds of document
 * here and they answer different questions: which sort, then which one, then
 * the document. The back control walks that stack rather than closing, so a
 * reader who opened the wrong group is one click from the other.
 *
 * The PDF goes in an <object>, which hands rendering to whatever the browser
 * already uses for PDFs. Where there is no viewer — most phones — the fallback
 * inside it offers the file instead of showing an empty frame.
 */
export function DocsDialog({ origin, onClose }: Props) {
  const { t } = useLanguage()
  const panel = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const backButton = useRef<HTMLButtonElement>(null)

  /** Nothing chosen, a group chosen, or a document open. One piece of state:
   *  `doc` without `group` cannot happen, so the two are set together. */
  const [group, setGroup] = useState<DocGroup | null>(null)
  const [doc, setDoc] = useState<Doc | null>(null)

  const dismiss = useDialogTransition({
    panel,
    scrim,
    origin,
    initialFocus: backButton,
    onClose,
  })

  /** One step back, and out of the dialog only from the first step. */
  const back = () => {
    if (doc) setDoc(null)
    else if (group) setGroup(null)
    else dismiss()
  }

  const heading = doc?.label ?? (group ? t.about.docs[group.id] : t.about.docsTitle)

  return createPortal(
    <div className="dialog">
      <div className="dialog__scrim" ref={scrim} onClick={dismiss} />

      <div
        className="dialog__panel dialog__panel--cv"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <div className="dialog__body dialog__body--cv">
          <div className="cv__bar">
            <button type="button" className="dialog__back" ref={backButton} onClick={back}>
              <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
              {t.projects.back}
            </button>

            {/* Only where there is a file to offer. On the two list steps the
                bar would otherwise carry a download button for nothing. */}
            {doc && group ? (
              <a
                className="dialog__back dialog__back--icon"
                href={docUrl(group, doc)}
                download
                aria-label={`${t.about.docsDownload}: ${doc.label}`}
                title={t.about.docsDownload}
              >
                <Download size={15} strokeWidth={2} aria-hidden="true" />
              </a>
            ) : null}
          </div>

          {doc && group ? (
            <object className="cv__doc" data={docUrl(group, doc)} type="application/pdf">
              <div className="cv__fallback">
                <p>{doc.label}</p>
                <a className="btn" href={docUrl(group, doc)} download>
                  <Download size={16} strokeWidth={1.9} aria-hidden="true" />
                  {t.about.docsDownload}
                </a>
              </div>
            </object>
          ) : (
            <div className="docs">
              <h3 className="docs__title">
                {group ? t.about.docs[group.id] : t.about.docsPrompt}
              </h3>

              <ul className="docs__list">
                {group
                  ? group.docs.map((entry) => (
                      <li key={entry.file}>
                        <button
                          type="button"
                          className="docs__row"
                          onClick={() => setDoc(entry)}
                        >
                          <FileText size={18} strokeWidth={1.8} aria-hidden="true" />
                          <span className="docs__row-label">{entry.label}</span>
                          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                        </button>
                      </li>
                    ))
                  : DOC_GROUPS.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          className="docs__row"
                          onClick={() => setGroup(entry)}
                        >
                          <FileText size={18} strokeWidth={1.8} aria-hidden="true" />
                          <span className="docs__row-label">
                            {t.about.docs[entry.id]}
                            <span className="docs__row-count">
                              {entry.docs.length}
                            </span>
                          </span>
                          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
