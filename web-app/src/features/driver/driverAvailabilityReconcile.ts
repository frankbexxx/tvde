export function reconcileDriverOfflineState(
  currentOffline: boolean,
  serverIsAvailable: boolean,
  canGoOnline: boolean
): boolean {
  if (!serverIsAvailable || !canGoOnline) return true
  return currentOffline
}
