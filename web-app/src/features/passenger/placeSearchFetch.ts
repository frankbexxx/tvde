/**
 * Whether a place-search query should trigger forward geocoding.
 * A committed suggestion (candidate/location) must block re-fetch of the
 * same selected label until the user edits the input again.
 */
export function placeSearchShouldFetch(opts: {
  query: string
  selectionCommitted: boolean
  /** Extra gate (e.g. destination search needs pickup). Default true. */
  enabled?: boolean
  minLen?: number
}): boolean {
  if (opts.selectionCommitted) return false
  if (opts.enabled === false) return false
  return opts.query.trim().length >= (opts.minLen ?? 2)
}
