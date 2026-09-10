import { describe, expect, it } from 'vitest'
import {
  buildDriverPetSummary,
  driverFareCategoryForDisplay,
} from './driverTripPetDisplay'

describe('driverTripPetDisplay', () => {
  it('GO + Pet comercial com detalhes e surcharge da API', () => {
    const s = buildDriverPetSummary({
      vehicle_category: 'x',
      has_pet: true,
      pet_size: 'small',
      pet_transport: 'carrier',
      pet_occupies_seat: false,
      pet_surcharge: 1.5,
    })
    expect(s).toEqual({
      mode: 'commercial',
      size: 'small',
      transport: 'carrier',
      occupiesSeat: false,
      surcharge: 1.5,
    })
  })

  it('assistance: copy mode sem Pet comercial', () => {
    const s = buildDriverPetSummary({
      vehicle_category: 'comfort',
      has_pet: false,
      is_assistance_animal: true,
      pet_surcharge: 0,
    })
    expect(s).toEqual({ mode: 'assistance', surcharge: 0 })
  })

  it('legacy vehicle_category=pet sem attrs', () => {
    const s = buildDriverPetSummary({
      vehicle_category: 'pet',
      has_pet: false,
    })
    expect(s.mode).toBe('legacy')
    expect(driverFareCategoryForDisplay('pet')).toBe('x')
  })

  it('sem animal → none', () => {
    expect(buildDriverPetSummary({ vehicle_category: 'xl' }).mode).toBe('none')
  })

  it('surcharge from price_breakdown when pet_surcharge absent', () => {
    const s = buildDriverPetSummary({
      has_pet: true,
      pet_size: 'large',
      pet_transport: 'harness',
      pet_occupies_seat: true,
      price_breakdown: { pet_surcharge: 1.5 },
    })
    expect(s.mode).toBe('commercial')
    if (s.mode === 'commercial') {
      expect(s.surcharge).toBe(1.5)
      expect(s.occupiesSeat).toBe(true)
    }
  })
})
