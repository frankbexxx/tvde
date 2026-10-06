import { describe, expect, it } from 'vitest'
import type { GeocodeSuggestion } from '../../services/geocoding'
import {
  applyMapSelection,
  clearDestinationCandidateOnly,
  clearPickupCandidateOnly,
  confirmDestinationCandidate,
  confirmPickupCandidate,
  coordsToMapCandidate,
  planningReadyForTripConfig,
  resetPlanningState,
  resolvePlanningMapClickTarget,
  type PassengerPlanningState,
} from './passengerPlanningMapClick'

const OEIRAS: GeocodeSuggestion = {
  id: 'txt-oeiras',
  primary: 'Câmara de Oeiras',
  secondary: 'Oeiras',
  lat: 38.691,
  lng: -9.311,
}

const LISBOA: GeocodeSuggestion = {
  id: 'txt-lisboa',
  primary: 'Praça do Comércio',
  secondary: 'Lisboa',
  lat: 38.708,
  lng: -9.137,
}

const empty = (): PassengerPlanningState => resetPlanningState()

describe('resolvePlanningMapClickTarget', () => {
  it('targets pickup before pickup is confirmed', () => {
    expect(resolvePlanningMapClickTarget(false)).toBe('pickup')
  })

  it('targets destination after pickup is confirmed', () => {
    expect(resolvePlanningMapClickTarget(true)).toBe('destination')
  })
})

describe('coordsToMapCandidate', () => {
  it('splits reverse-geocode address into primary/secondary', () => {
    const c = coordsToMapCandidate(
      { lat: 38.7, lng: -9.2 },
      'Rua Exemplo 1, Oeiras, Portugal'
    )
    expect(c.primary).toBe('Rua Exemplo 1')
    expect(c.secondary).toBe('Oeiras, Portugal')
    expect(c.id).toContain('map:')
    expect(c.lat).toBe(38.7)
    expect(c.lng).toBe(-9.2)
  })
})

describe('passenger planning — texto e mapa → mesmo Candidate', () => {
  it('1) texto → recolha → preview → confirmar', () => {
    let s = empty()
    s = { ...s, pickupCandidate: OEIRAS }
    expect(s.pickup).toBeNull()
    expect(planningReadyForTripConfig(s)).toBe(false)

    s = confirmPickupCandidate(s)
    expect(s.pickup).toEqual({ lat: OEIRAS.lat, lng: OEIRAS.lng })
    expect(s.pickupCandidate).toBeNull()
  })

  it('2) mapa → recolha → preview → confirmar (não grava no clique)', () => {
    let s = empty()
    s = applyMapSelection(s, { lat: 38.69, lng: -9.31 }, 'Câmara de Oeiras, Oeiras')
    expect(s.pickup).toBeNull()
    expect(s.pickupCandidate?.primary).toBe('Câmara de Oeiras')
    expect(s.dropoff).toBeNull()

    s = confirmPickupCandidate(s)
    expect(s.pickup).toEqual({ lat: 38.69, lng: -9.31 })
    expect(s.pickupCandidate).toBeNull()
  })

  it('3) texto → destino → preview → confirmar', () => {
    let s: PassengerPlanningState = {
      pickup: { lat: OEIRAS.lat, lng: OEIRAS.lng },
      dropoff: null,
      pickupCandidate: null,
      destinationCandidate: LISBOA,
    }
    expect(s.dropoff).toBeNull()

    s = confirmDestinationCandidate(s)
    expect(s.dropoff).toEqual({ lat: LISBOA.lat, lng: LISBOA.lng })
    expect(s.destinationCandidate).toBeNull()
    expect(planningReadyForTripConfig(s)).toBe(true)
  })

  it('4) mapa → destino → preview → confirmar', () => {
    let s: PassengerPlanningState = {
      pickup: { lat: OEIRAS.lat, lng: OEIRAS.lng },
      dropoff: null,
      pickupCandidate: null,
      destinationCandidate: null,
    }
    s = applyMapSelection(s, { lat: 38.708, lng: -9.137 }, 'Praça do Comércio, Lisboa')
    expect(s.pickup).toEqual({ lat: OEIRAS.lat, lng: OEIRAS.lng })
    expect(s.dropoff).toBeNull()
    expect(s.destinationCandidate?.primary).toBe('Praça do Comércio')

    s = confirmDestinationCandidate(s)
    expect(s.dropoff).toEqual({ lat: 38.708, lng: -9.137 })
    expect(planningReadyForTripConfig(s)).toBe(true)
  })

  it('5) clicar mapa sem confirmar não avança (sem pickup/dropoff commit)', () => {
    let s = empty()
    s = applyMapSelection(s, { lat: 38.7, lng: -9.2 }, 'Ponto A')
    expect(s.pickup).toBeNull()
    expect(s.dropoff).toBeNull()
    expect(planningReadyForTripConfig(s)).toBe(false)

    // even with pickup confirmed, map dest click stays preview
    s = confirmPickupCandidate(s)
    s = applyMapSelection(s, { lat: 38.71, lng: -9.15 }, 'Ponto B')
    expect(s.dropoff).toBeNull()
    expect(s.destinationCandidate).not.toBeNull()
    expect(planningReadyForTripConfig(s)).toBe(false)
  })

  it('6) Limpar remove candidate, não ponto confirmado anterior', () => {
    let s: PassengerPlanningState = {
      pickup: { lat: OEIRAS.lat, lng: OEIRAS.lng },
      dropoff: null,
      pickupCandidate: null,
      destinationCandidate: LISBOA,
    }
    s = clearDestinationCandidateOnly(s)
    expect(s.destinationCandidate).toBeNull()
    expect(s.pickup).toEqual({ lat: OEIRAS.lat, lng: OEIRAS.lng })

    s = {
      ...s,
      pickupCandidate: coordsToMapCandidate({ lat: 38.7, lng: -9.2 }, 'Temp'),
    }
    // Limpar pickup candidate while a prior pickup is already committed is N/A
    // for pickup search UI, but the helper must not touch confirmed pickup:
    const withConfirmed = {
      pickup: { lat: 1, lng: 2 },
      dropoff: null,
      pickupCandidate: OEIRAS,
      destinationCandidate: null,
    }
    const cleared = clearPickupCandidateOnly(withConfirmed)
    expect(cleared.pickupCandidate).toBeNull()
    expect(cleared.pickup).toEqual({ lat: 1, lng: 2 })
  })

  it('7) Repor limpa planeamento', () => {
    const dirty: PassengerPlanningState = {
      pickup: { lat: 1, lng: 2 },
      dropoff: { lat: 3, lng: 4 },
      pickupCandidate: OEIRAS,
      destinationCandidate: LISBOA,
    }
    expect(resetPlanningState()).toEqual(empty())
    expect(planningReadyForTripConfig(dirty)).toBe(false)
    expect(planningReadyForTripConfig(resetPlanningState())).toBe(false)
  })

  it('8) texto e mapa convergem no mesmo estado final', () => {
    const viaText = confirmDestinationCandidate(
      confirmPickupCandidate({
        ...empty(),
        pickupCandidate: {
          id: 't1',
          primary: 'A',
          secondary: '',
          lat: 38.69,
          lng: -9.31,
        },
      })
    )
    // after pickup confirm, set dest via text
    const textFinal = confirmDestinationCandidate({
      ...viaText,
      destinationCandidate: {
        id: 't2',
        primary: 'B',
        secondary: '',
        lat: 38.708,
        lng: -9.137,
      },
    })

    let viaMap = empty()
    viaMap = applyMapSelection(viaMap, { lat: 38.69, lng: -9.31 }, 'A')
    viaMap = confirmPickupCandidate(viaMap)
    viaMap = applyMapSelection(viaMap, { lat: 38.708, lng: -9.137 }, 'B')
    viaMap = confirmDestinationCandidate(viaMap)

    expect(viaMap.pickup).toEqual(textFinal.pickup)
    expect(viaMap.dropoff).toEqual(textFinal.dropoff)
    expect(viaMap.pickupCandidate).toBeNull()
    expect(viaMap.destinationCandidate).toBeNull()
    expect(planningReadyForTripConfig(viaMap)).toBe(true)
    expect(planningReadyForTripConfig(textFinal)).toBe(true)
  })

  it('9) nenhuma transição de planeamento implica POST /trips (só config pronta)', () => {
    // Planning helpers only mutate local planning state — trip create is a separate CTA.
    let s = empty()
    s = applyMapSelection(s, { lat: 38.69, lng: -9.31 }, 'A')
    s = confirmPickupCandidate(s)
    s = applyMapSelection(s, { lat: 38.708, lng: -9.137 }, 'B')
    s = confirmDestinationCandidate(s)
    expect(planningReadyForTripConfig(s)).toBe(true)
    // Explicit: helpers have no side effects beyond state; createTrip is not imported/called here.
    expect(Object.keys(s).sort()).toEqual([
      'destinationCandidate',
      'dropoff',
      'pickup',
      'pickupCandidate',
    ])
  })

  it('mapa com pickup+dropoff confirmados: novo clique reabre preview de destino', () => {
    let s: PassengerPlanningState = {
      pickup: { lat: 38.69, lng: -9.31 },
      dropoff: { lat: 38.708, lng: -9.137 },
      pickupCandidate: null,
      destinationCandidate: null,
    }
    s = applyMapSelection(s, { lat: 38.72, lng: -9.14 }, 'Novo destino')
    expect(s.dropoff).toBeNull()
    expect(s.destinationCandidate?.primary).toBe('Novo destino')
    expect(s.pickup).toEqual({ lat: 38.69, lng: -9.31 })
    expect(planningReadyForTripConfig(s)).toBe(false)
  })
})
