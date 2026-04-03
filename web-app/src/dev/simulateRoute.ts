export type RoutePoint = { lat: number; lng: number }

export type StopRouteSimulation = () => void

export type RouteSimulationOptions = {
  /** Repetir a rota quando chegar ao fim */
  loop?: boolean
}

/**
 * Emite uma posição por intervalo, começando pela primeira imediatamente.
 */
export function startRouteSimulation(
  points: RoutePoint[],
  intervalMs: number,
  onTick: (point: RoutePoint, index: number) => void,
  options?: RouteSimulationOptions
): StopRouteSimulation {
  if (points.length === 0) {
    return () => {}
  }

  let index = 0
  onTick(points[index], index)

  const id = window.setInterval(() => {
    index += 1
    if (index >= points.length) {
      if (options?.loop) {
        index = 0
      } else {
        window.clearInterval(id)
        return
      }
    }
    onTick(points[index], index)
  }, intervalMs)

  return () => window.clearInterval(id)
}
