import { useRef, useState } from 'react'
import type { Project } from '../../data/projects'
import { relativeTime, absoluteDate } from '../../data/repoStatus'
import { repoStatusFor } from '../../data/repoStatuses'
import { useLanguage } from '../../hooks/useLanguage'
import { prefersReducedMotionNow } from '../../hooks/usePrefersReducedMotion'

interface Props {
  project: Project
  index: number
  onOpen: (project: Project, origin: DOMRect) => void
}

export function ProjectCard({ project, index, onOpen }: Props) {
  const { t, language } = useLanguage()
  const cardRef = useRef<HTMLElement>(null)
  const [previewBroken, setPreviewBroken] = useState(false)
  const [logoBroken, setLogoBroken] = useState(false)

  // At rest the cover carries the client's mark; on hover it cross-fades to the
  // first screenshot, so the card previews the thing itself before you open it.
  const preview = previewBroken ? null : (project.detail?.images?.[0] ?? null)
  const client = project.detail?.client ?? null
  // A logo that will not load falls back to the client's name, so a missing or
  // renamed file never leaves a broken image on the card.
  const logo = logoBroken ? null : (project.logo ?? null)
  // Present only for a project with a repository behind it, and only when the
  // build managed to read it. It is the one piece of the card that is not the
  // same on every deploy — which is the point: a project still being worked on
  // should be able to say so without anyone editing this file.
  const status = repoStatusFor(project.repo)

  // Pointer position is written straight to CSS custom properties: no React
  // state, so moving the cursor never re-renders anything.
  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const card = cardRef.current
    if (!card || prefersReducedMotionNow()) return
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--px', `${((event.clientX - rect.left) / rect.width) * 100}%`)
    card.style.setProperty('--py', `${((event.clientY - rect.top) / rect.height) * 100}%`)
  }

  const title = project.title[language]
  const description = project.description[language]

  const content = (
    <>
      <span className="project__cover" data-index={index} data-preview={preview ? '' : undefined}>
        {logo ? (
          <img
            className="project__logo"
            src={`${import.meta.env.BASE_URL}${logo.replace(/^\//, '')}`}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setLogoBroken(true)}
          />
        ) : client ? (
          <span className="project__client">{client}</span>
        ) : (
          <span className="project__cover-mark" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}

        {status ? (
          <span
            className="project__pulse"
            title={`${t.projects.activity}: ${absoluteDate(status.pushedAt, language)}`}
          >
            <span className="project__pulse-dot" aria-hidden="true" />
            <span className="visually-hidden">{t.projects.activity}: </span>
            {relativeTime(status.pushedAt, language)}
          </span>
        ) : null}

        {preview ? (
          <img
            className="project__preview"
            src={`${import.meta.env.BASE_URL}${preview.replace(/^\//, '')}`}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setPreviewBroken(true)}
          />
        ) : null}
      </span>

      {/* Phrasing content throughout: this subtree lives inside a <button>,
          which cannot legally contain headings, paragraphs or lists. */}
      <span className="project__body">
        <span className="project__title">{title}</span>
        <span className="project__description">{description}</span>

        <span className="project__tech">
          {project.technologies.map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </span>
      </span>
    </>
  )

  return (
    <article
      ref={cardRef}
      className="project card"
      onPointerMove={handlePointerMove}
    >
      {/* The whole card is the control. Opening happens in place, so this is a
          button rather than a link — there is no other page to go to. */}
      <button
        type="button"
        className="project__link"
        onClick={() => {
          const rect = cardRef.current?.getBoundingClientRect()
          if (rect) onOpen(project, rect)
        }}
      >
        {content}
      </button>
    </article>
  )
}
