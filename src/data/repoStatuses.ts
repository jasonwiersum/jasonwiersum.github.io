import { repoStatuses } from 'virtual:repo-status'
import type { RepoStatus } from './repoStatus'

/**
 * The snapshot for a project's repository, or `null`.
 *
 * `null` is a normal outcome, not an error: the build asks GitHub for this and
 * a request that fails leaves the entry out rather than failing the deploy or
 * shipping whatever was true last week. Everything that renders a snapshot
 * therefore has to render without one too — the project keeps its description,
 * its stack and its link either way.
 */
export function repoStatusFor(repo: { owner: string; name: string } | undefined): RepoStatus | null {
  if (!repo) return null
  return repoStatuses[`${repo.owner}/${repo.name}`.toLowerCase()] ?? null
}
