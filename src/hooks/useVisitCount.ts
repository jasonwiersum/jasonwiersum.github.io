import { useEffect, useState } from 'react'
import { COUNTER } from '../config/counter'

/**
 * A visit is a tab that opened the page, not a page load: this marks the tab so
 * that refreshing, or coming back to the tab later, reads the count instead of
 * adding to it. Someone who leans on F5 does not get to run the number up.
 */
const COUNTED = 'jw-counted'

/**
 * How many times the site has been opened, or `null` while that is not known.
 *
 * The request goes out on mount rather than on the click that reveals it — the
 * number has to count visits, and a click-triggered request would count clicks.
 *
 * `null` is the answer for every failure, and the caller shows nothing at all
 * when it gets one: a counter hidden behind a name is worth no error state, no
 * placeholder and no retry. The service being down, a browser that blocks the
 * request, `sessionStorage` throwing in a private window — all of it ends the
 * same way, with a footer that simply does not have the extra.
 */
export function useVisitCount(): number | null {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const abort = new AbortController()

    // Private windows throw on sessionStorage rather than returning null, so
    // reading it is a guarded operation, not a plain lookup.
    let counted = false
    try {
      counted = sessionStorage.getItem(COUNTED) === '1'
    } catch {
      counted = false
    }

    fetch(counted ? COUNTER.read : COUNTER.hit, { signal: abort.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        const value = (body as { value?: unknown } | null)?.value
        // A key the service has never seen answers -1, which is "no count yet"
        // and not a number to put on the page.
        if (typeof value !== 'number' || value < 0) return
        if (!counted) {
          try {
            sessionStorage.setItem(COUNTED, '1')
          } catch {
            // Nothing to do: the visit still counted, this tab may count twice.
          }
        }
        setCount(value)
      })
      .catch(() => {
        // Aborted, offline, blocked, or the service is gone. All the same here.
      })

    return () => abort.abort()
  }, [])

  return count
}
