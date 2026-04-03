import type { RoutePoint } from './simulateRoute'

/** Pequeno percurso em Oeiras (volta ao ponto inicial) — adequado a GEO_RADIUS de testes. */
export const TEST_ROUTE_OEIRAS_LOOP: RoutePoint[] = [
  { lat: 38.6973, lng: -9.30836 },
  { lat: 38.698, lng: -9.309 },
  { lat: 38.6988, lng: -9.31 },
  { lat: 38.698, lng: -9.3092 },
  { lat: 38.6973, lng: -9.30836 },
]

/** Segmento curto (Lisboa centro) — útil se quiseres variar no futuro. */
export const TEST_ROUTE_1: RoutePoint[] = [
  { lat: 38.716, lng: -9.139 },
  { lat: 38.717, lng: -9.14 },
  { lat: 38.718, lng: -9.141 },
]

/** Rota mais longa com mudanças de direção visíveis (Lisboa) — legado / testes manuais. */
export const TEST_ROUTE_EXTENDED: RoutePoint[] = [
  { lat: 38.716, lng: -9.139 },
  { lat: 38.718, lng: -9.141 },
  { lat: 38.72, lng: -9.145 },
  { lat: 38.722, lng: -9.15 },
  { lat: 38.719, lng: -9.152 },
  { lat: 38.717, lng: -9.148 },
]

