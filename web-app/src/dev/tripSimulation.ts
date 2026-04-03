import type { LatLng } from '../services/routingService'

export type TripSimulationOptions = {
  route: LatLng[]
  intervalMs: number
  onUpdate: (pos: LatLng) => void
}

/**
 * Percorre `route` em sequência; não emite o primeiro ponto (o motorista já está parado nele).
 * Para no último ponto e devolve função de cancelamento.
 */
export function startTripSimulation(options: TripSimulationOptions): () => void {
  const { route, intervalMs, onUpdate } = options
  if (route.length < 2) {
    return () => {}
  }

  let index = 1
  const id = window.setInterval(() => {
    if (index >= route.length) {
      window.clearInterval(id)
      return
    }
    onUpdate(route[index])
    index += 1
    if (index >= route.length) {
      window.clearInterval(id)
    }
  }, intervalMs)

  return () => window.clearInterval(id)
}
