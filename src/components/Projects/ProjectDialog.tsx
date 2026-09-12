import { ArrowLeft, ArrowUpRight, MapPin } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Project } from '../../data/projects'
import { repoStatusFor } from '../../data/repoStatuses'
import { RepoStatusPanel } from './RepoStatusPanel'
import { useDialogTransition } from '../../hooks/useDialogTransition'
import { useLanguage } from '../../hooks/useLanguage'

interface Props {
  project: Project
  /** Where the card sat when it was clicked, so the panel grows out of it. */
  origin: DOMRect | null
  onClose: () => void
}

export function ProjectDialog({ project, origin, onClose }: Props) {
  const { t, language } = useLanguage()
  const panel = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const detail = project.detail
  // `null` whenever the build could not reach GitHub, so every branch below
  // has to read without it.
  const status = repoStatusFor(project.repo)

  const dismiss = useDialogTransition({
    panel,
    scrim,
    origin,
    initialFocus: closeButton,
    onClose,
  })

  const titleId = `${project.id}-title`

  return createPortal(
    <div className="dialog">
      <div className="dialog__scrim" ref={scrim} onClick={dismiss} />

      <div
        className="dialog__panel"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="dialog__body">
          <button
            type="button"
            className="dialog__back"
            ref={closeButton}
            onClick={dismiss}
          >
            <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
            {t.projects.back}
          </button>

          <header className="dialog__head">
            {detail?.client ? (
              <p className="eyebrow dialog__client">
                <MapPin size={13} strokeWidth={2} aria-hidden="true" />
                {detail.client}
              </p>
            ) : null}
            <h2 className="dialog__title" id={titleId}>
              {project.title[language]}
            </h2>
            <p className="dialog__lead">{project.description[language]}</p>
          </header>

          {detail ? (
            <>
              <div className="dialog__prose">
                {detail.body[language].map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              <section className="dialog__section">
                <h3 className="dialog__section-title">
                  {detail.highlightsAs === 'scope' ? t.projects.scope : t.projects.highlights}
                </h3>
                <ul className="dialog__highlights">
                  {detail.highlights[language].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <Shots images={detail.images ?? []} title={project.title[language]} />
            </>
          ) : null}

          {status ? <RepoStatusPanel status={status} /> : null}

          <div className="dialog__meta">
            <section className="dialog__section">
              <h3 className="dialog__section-title">{t.projects.stack}</h3>
              <ul className="dialog__tags">
                {project.technologies.map((tech) => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
            </section>

            {detail?.tooling?.length ? (
              <section className="dialog__section">
                <h3 className="dialog__section-title">{t.projects.tooling}</h3>
                <ul className="dialog__tags">
                  {detail.tooling.map((tool) => (
                    <li key={tool}>{tool}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {project.url ? (
            <a
              className="btn dialog__link"
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {project.repo ? t.projects.viewRepo : t.projects.visitSite}
              <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Screenshots that quietly drop out if the file is not there yet.
 *
 *  These are dense interface captures shown a good deal smaller than they were
 *  taken, so a click zooms in — around the point clicked, which is the part
 *  being squinted at. Clicking again puts it back. */
function Shots({ images, title }: { images: string[]; title: string }) {
  const [broken, setBroken] = useState<string[]>([])
  const [zoomed, setZoomed] = useState<string | null>(null)
  const usable = images.filter((src) => !broken.includes(src))
  if (usable.length === 0) return null

  const toggle = (src: string) => (event: React.MouseEvent<HTMLImageElement>) => {
    const img = event.currentTarget
    if (zoomed === src) {
      setZoomed(null)
      return
    }
    const rect = img.getBoundingClientRect()
    img.style.transformOrigin = `${((event.clientX - rect.left) / rect.width) * 100}% ${
      ((event.clientY - rect.top) / rect.height) * 100
    }%`
    setZoomed(src)
  }

  return (
    <div className="dialog__shots">
      {usable.map((src) => (
        <figure key={src} data-zoomed={zoomed === src ? '' : undefined}>
          <img
            src={`${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`}
            alt={title}
            loading="lazy"
            decoding="async"
            onClick={toggle(src)}
            onError={() => setBroken((current) => [...current, src])}
          />
        </figure>
      ))}
    </div>
  )
}
