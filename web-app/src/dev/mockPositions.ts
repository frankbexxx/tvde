/**
 * Posições fixas para modo mock (DEV). O movimento de aproximação é simulado à parte (tripSimulation).
 */

export type MockLatLng = { lat: number; lng: number }

/** Passageiro mock — alinhar com recolha típica de teste (pedido de viagem neste ponto). */
export const MOCK_PASSENGER_POSITION: MockLatLng = { lat: 38.716, lng: -9.139 }

/** Motorista mock — ~3 km do ponto do passageiro; parado até aceitar viagem. */
export const MOCK_DRIVER_START: MockLatLng = { lat: 38.7242, lng: -9.3084 }
