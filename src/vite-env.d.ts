/// <reference types="vite/client" />

/**
 * The repository snapshots, generated during the build.
 *
 * There is no file behind this import: the `repo-status` plugin in
 * `vite.config.ts` reads GitHub once per build and serves the result as a
 * module. Keys are `owner/name`, lowercased.
 */
declare module 'virtual:repo-status' {
  export const repoStatuses: Record<
    string,
    import('./data/repoStatus').RepoStatus
  >
}
