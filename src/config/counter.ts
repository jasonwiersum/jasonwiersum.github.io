/**
 * Where the visit count is kept.
 *
 * The site is static — GitHub Pages serves files and runs nothing — so a number
 * that grows across visitors cannot live in the page. It lives in Abacus, a
 * free counter that needs no account: `hit` adds one and answers with the new
 * total, `read` answers without adding.
 *
 * The whole of that choice is in this file. To move the count to a Cloudflare
 * Worker of your own, or anywhere else, change these two URLs and the one line
 * in `useVisitCount` that reads `value` out of the reply. Nothing else in the
 * app knows where the number comes from.
 *
 * Two things to know about the service as it stands:
 *
 *   - Every visitor's browser calls it, so it sees their IP address. That is
 *     the price of counting visitors at all without a server of your own.
 *   - A key it has not been asked about for about 168 days expires, and the
 *     count would start again from zero. A site with visitors never reaches
 *     that; a site with none has nothing to lose.
 */
const HOST = 'https://abacus.jasoncameron.dev'
const NAMESPACE = 'jasonwiersum-github-io'
const KEY = 'visits'

export const COUNTER = {
  /** Adds one, and answers with the new total. */
  hit: `${HOST}/hit/${NAMESPACE}/${KEY}`,
  /** Answers with the total, without touching it. */
  read: `${HOST}/info/${NAMESPACE}/${KEY}`,
} as const
