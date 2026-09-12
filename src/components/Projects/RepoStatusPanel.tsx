import { GitCommitHorizontal } from 'lucide-react'
import { absoluteDate, relativeTime, type RepoStatus } from '../../data/repoStatus'
import { useLanguage } from '../../hooks/useLanguage'

interface Props {
  status: RepoStatus
}

/**
 * What the repository behind a project looks like right now.
 *
 * Every number here was read from GitHub while the site was being built — see
 * the `repo-status` plugin in `vite.config.ts` — so nothing in this panel is a
 * claim that has to be kept up to date by hand. The last line says when it was
 * read, because a live-looking number with no date on it is worse than no
 * number at all.
 */
export function RepoStatusPanel({ status }: Props) {
  const { t, language } = useLanguage()

  // Counts that are zero are left out rather than printed as "0": an empty
  // issue tracker and no stars are the normal state of a young repository, and
  // three zeroes in a row read as a project going nowhere.
  const stats: { label: string; value: string }[] = []
  if (status.commits !== null) {
    stats.push({ label: t.projects.commits, value: String(status.commits) })
  }
  stats.push({ label: t.projects.branch, value: status.defaultBranch })
  if (status.openIssues > 0) {
    stats.push({ label: t.projects.openIssues, value: String(status.openIssues) })
  }
  if (status.stars > 0) {
    stats.push({ label: t.projects.stars, value: String(status.stars) })
  }
  stats.push({ label: t.projects.created, value: absoluteDate(status.createdAt, language) })

  const percent = new Intl.NumberFormat(language, {
    style: 'percent',
    maximumFractionDigits: 1,
  })

  return (
    <section className="dialog__section repo">
      <h3 className="dialog__section-title">{t.projects.status}</h3>

      <p className="repo__pulse">
        <span className="repo__dot" aria-hidden="true" />
        {t.projects.activity}
        <time dateTime={status.pushedAt} title={absoluteDate(status.pushedAt, language)}>
          {relativeTime(status.pushedAt, language)}
        </time>
      </p>

      <dl className="repo__stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

      {status.lastCommit ? (
        <a
          className="repo__commit"
          href={status.lastCommit.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <GitCommitHorizontal size={15} strokeWidth={2} aria-hidden="true" />
          <span className="visually-hidden">{t.projects.lastCommit}: </span>
          <span className="repo__sha">{status.lastCommit.sha}</span>
          <span className="repo__subject">{status.lastCommit.message}</span>
        </a>
      ) : null}

      {status.languages.length > 0 ? (
        <div className="repo__languages">
          {/* One hue, stepped down in opacity, rather than GitHub's own colours:
              the legend names every band and gives it a percentage, so the bar
              only has to separate them — and a single hue is the one way to do
              that which does not fight the rest of the page. */}
          <span className="repo__bar" aria-hidden="true">
            {status.languages.map((language_, index) => (
              <span
                key={language_.name}
                style={{
                  width: `${language_.share * 100}%`,
                  opacity: Math.max(0.22, 1 - index * 0.34),
                }}
              />
            ))}
          </span>

          <ul className="repo__legend">
            {status.languages.map((language_, index) => (
              <li key={language_.name}>
                <span
                  className="repo__swatch"
                  style={{ opacity: Math.max(0.22, 1 - index * 0.34) }}
                  aria-hidden="true"
                />
                {language_.name}
                <span className="repo__share">{percent.format(language_.share)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="repo__source">
        {t.projects.readAt}
        {' · '}
        <time dateTime={status.fetchedAt}>{absoluteDate(status.fetchedAt, language)}</time>
      </p>
    </section>
  )
}
