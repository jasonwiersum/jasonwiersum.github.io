import { ArrowLeft, ArrowUpRight, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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

              {detail.video ? <Demo key={language} video={detail.video[language]} title={project.title[language]} label={t.projects.video} /> : null}

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

/** A short demo clip. Only the poster is fetched up front (`preload="none"`),
 *  so opening the dialog does not cost the video's weight; it drops out if the
 *  file is missing. */
function Demo({ video, title, label }: { video: { src: string; poster: string }; title: string; label: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) return null
  const base = import.meta.env.BASE_URL
  return (
    <section className="dialog__section">
      <h3 className="dialog__section-title">{label}</h3>
      <figure className="dialog__video">
        <video
          controls
          playsInline
          preload="none"
          poster={`${base}${video.poster.replace(/^\//, '')}`}
          src={`${base}${video.src.replace(/^\//, '')}`}
          aria-label={title}
          onError={() => setBroken(true)}
        />
      </figure>
    </section>
  )
}

/** Screenshots that quietly drop out if the file is not there yet.
 *
 *  These are dense interface captures shown a good deal smaller than they were
 *  taken, so a click zooms in — around the point clicked, which is the part
 *  being squinted at. Once in, the picture can be dragged around; clicking
 *  without dragging puts it back. Only one is ever open at a time. */
function Shots({ images, title }: { images: string[]; title: string }) {
  const [broken, setBroken] = useState<string[]>([])
  const [zoomed, setZoomed] = useState<string | null>(null)
  const usable = images.filter((src) => !broken.includes(src))
  if (usable.length === 0) return null

  return (
    <div className="dialog__shots">
      {usable.map((src) => (
        <Shot
          key={src}
          src={`${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`}
          alt={title}
          zoomed={zoomed === src}
          onZoom={(on) => setZoomed(on ? src : null)}
          onBroken={() => setBroken((current) => [...current, src])}
        />
      ))}
    </div>
  )
}

/** Anything shorter than this is a click; anything longer is a drag. Without
 *  it the pointer wobble of an ordinary tap would read as a pan and the
 *  picture would never close. */
const CLICK_SLOP = 5

interface ShotProps {
  src: string
  alt: string
  zoomed: boolean
  onZoom: (on: boolean) => void
  onBroken: () => void
}

/**
 * One screenshot: click to zoom around the point, then drag to look around.
 *
 * The offset is written straight to the element as two custom properties
 * rather than held in React state — a pan updates on every pointer move, and
 * that is a job for a style write, not a re-render.
 *
 * Pointer events rather than separate mouse and touch handlers, so a finger, a
 * mouse and a pen all arrive the same way. The gesture is claimed with
 * `setPointerCapture` so the drag survives the pointer leaving the frame, and
 * the stylesheet turns off `touch-action` while zoomed — otherwise the browser
 * reads the drag as a page scroll and the picture never moves.
 *
 * The maths. With `transform-origin` at the top left, the picture covers
 * `offset` to `offset + size * zoom`. For the frame to stay covered, the offset
 * lives between `-size * (zoom - 1)` and `0`, which is the whole of the
 * clamping below. Zooming in around a point p keeps that point still, which
 * wants `offset = p * (1 - zoom)` — and that already lands inside the range.
 */
function Shot({ src, alt, zoomed, onZoom, onBroken }: ShotProps) {
  const image = useRef<HTMLImageElement>(null)
  const offset = useRef({ x: 0, y: 0 })
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null)

  /** The zoom factor, read from the stylesheet so one value drives both. */
  const zoomFactor = (el: HTMLElement) =>
    Number.parseFloat(getComputedStyle(el).getPropertyValue('--shot-zoom')) || 1

  const place = (el: HTMLImageElement) => {
    const limitX = -el.clientWidth * (zoomFactor(el) - 1)
    const limitY = -el.clientHeight * (zoomFactor(el) - 1)
    offset.current.x = Math.min(0, Math.max(limitX, offset.current.x))
    offset.current.y = Math.min(0, Math.max(limitY, offset.current.y))
    el.style.setProperty('--sx', `${offset.current.x}px`)
    el.style.setProperty('--sy', `${offset.current.y}px`)
  }

  useEffect(() => {
    const el = image.current
    if (!el) return
    if (!zoomed) {
      offset.current = { x: 0, y: 0 }
      place(el)
      return
    }
    // A window that changes width while a picture is open leaves the offset
    // pointing somewhere that no longer exists, so it is brought back in range.
    const onResize = () => place(el)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [zoomed])

  const start = (event: React.PointerEvent<HTMLImageElement>) => {
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
    if (!zoomed) return
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.dataset.panning = ''
  }

  const move = (event: React.PointerEvent<HTMLImageElement>) => {
    const held = drag.current
    if (!held || held.id !== event.pointerId) return
    const dx = event.clientX - held.x
    const dy = event.clientY - held.y
    if (!held.moved && Math.hypot(dx, dy) > CLICK_SLOP) held.moved = true
    if (!zoomed || !held.moved) return
    held.x = event.clientX
    held.y = event.clientY
    offset.current.x += dx
    offset.current.y += dy
    place(event.currentTarget)
  }

  const finish = (event: React.PointerEvent<HTMLImageElement>) => {
    const held = drag.current
    drag.current = null
    const el = event.currentTarget
    delete el.dataset.panning
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
    if (!held || held.id !== event.pointerId || held.moved) return

    if (zoomed) {
      onZoom(false)
      return
    }
    // Zoom in around the point under the pointer, so what was being squinted
    // at is what fills the frame.
    const rect = el.getBoundingClientRect()
    const scale = zoomFactor(el)
    offset.current.x = (event.clientX - rect.left) * (1 - scale)
    offset.current.y = (event.clientY - rect.top) * (1 - scale)
    el.style.setProperty('--sx', `${offset.current.x}px`)
    el.style.setProperty('--sy', `${offset.current.y}px`)
    onZoom(true)
  }

  /** A scroll the browser decided to take, or a pointer lost: not a click. */
  const cancel = (event: React.PointerEvent<HTMLImageElement>) => {
    drag.current = null
    delete event.currentTarget.dataset.panning
  }

  return (
    <figure data-zoomed={zoomed ? '' : undefined}>
      <img
        ref={image}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        // The browser's own picture-drag would fight the pan on a desktop.
        draggable={false}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={cancel}
        onError={onBroken}
      />
    </figure>
  )
}
