import type { Language } from '../i18n/translations'

/**
 * ---------------------------------------------------------------------------
 * REPOSITORY STATUS — the shape only.
 * ---------------------------------------------------------------------------
 * A snapshot of a GitHub repository, read once per build and baked into the
 * bundle by the `repo-status` plugin in `vite.config.ts`. The plugin imports
 * these types, so the shape is written down in exactly one place; the data
 * itself arrives through `virtual:repo-status` (see `repoStatuses.ts`).
 *
 * Nothing here touches the DOM on purpose: `vite.config.ts` is checked against
 * tsconfig.node.json, whose lib has no DOM in it.
 */

/** One language of a repository, with its share of the code by volume. */
export interface RepoLanguage {
  name: string
  bytes: number
  /** 0-1. GitHub measures this in bytes, not lines — so does this. */
  share: number
}

/** The head commit of the default branch. */
export interface RepoCommit {
  sha: string
  /** Subject line only. A body would not fit the panel and is rarely read. */
  message: string
  date: string
  url: string
}

/** Everything the site shows about a repository. */
export interface RepoStatus {
  /** `owner/name`, lowercased — the key this snapshot is stored under. */
  slug: string
  name: string
  url: string
  description: string | null
  defaultBranch: string
  /** ISO 8601. When code was last pushed to any branch. */
  pushedAt: string
  createdAt: string
  /** Commits on the default branch, or `null` if GitHub would not say. */
  commits: number | null
  openIssues: number
  stars: number
  topics: string[]
  /** Largest share first. Empty for a repository GitHub has not classified. */
  languages: RepoLanguage[]
  lastCommit: RepoCommit | null
  /** When the build read all of this — i.e. how old the snapshot is. */
  fetchedAt: string
}

/**
 * "hace 3 días", "2 hours ago", "vor 2 Wochen".
 *
 * Intl does the wording in all three languages, so the only decision left here
 * is the unit: the largest one that still has a whole number in it, which is
 * how a person would say it out loud. Anything under a minute is "now" rather
 * than "in 0 seconds", which is what the raw arithmetic would produce.
 */
export function relativeTime(iso: string, language: Language): string {
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]

  for (const [unit, size] of units) {
    const value = seconds / size
    if (Math.abs(value) >= 1) return format.format(Math.round(value), unit)
  }

  return format.format(0, 'minute')
}

/** A calendar date in the reader's language, for the tooltip on a relative time. */
export function absoluteDate(iso: string, language: Language): string {
  return new Date(iso).toLocaleDateString(language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
