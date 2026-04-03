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

/**
 * Passageiro em modo mock: permanece na zona de Oeiras (recolha), pequeno loop — não coincide com o motorista.
 */
export const MOCK_PASSENGER_ROUTE: RoutePoint[] = TEST_ROUTE_OEIRAS_LOOP

/**
 * Motorista em mock: primeiro ponto ~3 km a norte da Câmara de Oeiras; depois corredor Oeiras → Lisboa → Cascais → regresso.
 * Mantém separação visível do passageiro (MOCK_PASSENGER_ROUTE) até aproximar à recolha.
 */
export const MOCK_DRIVER_ROUTE: RoutePoint[] = [
  { lat: 38.7242, lng: -9.3084 },
  { lat: 38.712, lng: -9.292 },
  { lat: 38.702, lng: -9.282 },
  { lat: 38.6975, lng: -9.305 },
  { lat: 38.6973, lng: -9.30836 },
  { lat: 38.704, lng: -9.22 },
  { lat: 38.718, lng: -9.145 },
  { lat: 38.715, lng: -9.16 },
  { lat: 38.706, lng: -9.28 },
  { lat: 38.698, lng: -9.38 },
  { lat: 38.697, lng: -9.418 },
  { lat: 38.6972, lng: -9.36 },
  { lat: 38.6973, lng: -9.30836 },
]
