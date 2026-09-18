import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PET_BOOKING,
  applyAssistance,
  applyFareCategory,
  applyPassengerCount,
  applyPetOccupiesSeat,
  applyPetSize,
  applyPetTransport,
  applyWithAnimal,
  buildPetCreatePayload,
  isFareCategoryAvailable,
  passengerCountOptionsForCategory,
  requiredSeats,
  validatePetBooking,
} from './petBooking'

describe('petBooking — GO normal (sem animal)', () => {
  it('default is GO (x) without pet fields', () => {
    expect(DEFAULT_PET_BOOKING.fareCategory).toBe('x')
    expect(validatePetBooking(DEFAULT_PET_BOOKING)).toEqual({ ok: true })
    expect(buildPetCreatePayload(DEFAULT_PET_BOOKING)).toEqual({
      vehicle_category: 'x',
      passenger_count: 1,
    })
  })
})

describe('petBooking — category capacity options', () => {
  it('GO/Comfort 1..4; XL 1..8', () => {
    expect(passengerCountOptionsForCategory('x')).toEqual([1, 2, 3, 4])
    expect(passengerCountOptionsForCategory('comfort')).toEqual([1, 2, 3, 4])
    expect(passengerCountOptionsForCategory('xl')).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('escolher 5 auto-selecciona XL', () => {
    const s = applyPassengerCount(DEFAULT_PET_BOOKING, 5)
    expect(s.fareCategory).toBe('xl')
    expect(s.passengerCount).toBe(5)
    expect(isFareCategoryAvailable('x', s)).toBe(false)
    expect(isFareCategoryAvailable('comfort', s)).toBe(false)
    expect(isFareCategoryAvailable('xl', s)).toBe(true)
  })

  it('XL 6 → GO ajusta count para 4', () => {
    const xl = { ...DEFAULT_PET_BOOKING, fareCategory: 'xl' as const, passengerCount: 6 }
    const go = applyFareCategory(xl, 'x')
    expect(go.fareCategory).toBe('x')
    expect(go.passengerCount).toBe(4)
    expect(buildPetCreatePayload(go)).toEqual({
      vehicle_category: 'x',
      passenger_count: 4,
    })
  })

  it('pet seat afecta required e validade GO', () => {
    const base = {
      ...DEFAULT_PET_BOOKING,
      passengerCount: 4,
      withAnimal: true,
      petSize: 'small' as const,
      petTransport: 'carrier' as const,
      petOccupiesSeat: true,
    }
    expect(requiredSeats(base)).toBe(5)
    expect(validatePetBooking(base).ok).toBe(false)
    const bumped = applyPetOccupiesSeat(
      { ...base, petOccupiesSeat: false, fareCategory: 'x' },
      true,
    )
    expect(bumped.fareCategory).toBe('xl')
    expect(validatePetBooking(bumped).ok).toBe(true)
  })
})

describe('petBooking — GO + Pet pequeno carrier', () => {
  it('payload correcto', () => {
    let s = applyWithAnimal(DEFAULT_PET_BOOKING, true)
    s = applyPetSize(s, 'small')
    s = applyPetTransport(s, 'carrier')
    expect(validatePetBooking(s).ok).toBe(true)
    expect(buildPetCreatePayload(s)).toEqual({
      vehicle_category: 'x',
      passenger_count: 1,
      has_pet: true,
      pet_size: 'small',
      pet_transport: 'carrier',
      pet_occupies_seat: false,
    })
  })
})

describe('petBooking — Comfort / XL + Pet', () => {
  it('Comfort + pet', () => {
    const s = {
      ...applyWithAnimal(DEFAULT_PET_BOOKING, true),
      fareCategory: 'comfort' as const,
    }
    expect(buildPetCreatePayload(s).vehicle_category).toBe('comfort')
    expect(buildPetCreatePayload(s).has_pet).toBe(true)
  })

  it('XL + pet', () => {
    const s = {
      ...applyWithAnimal(DEFAULT_PET_BOOKING, true),
      fareCategory: 'xl' as const,
    }
    expect(buildPetCreatePayload(s).vehicle_category).toBe('xl')
    expect(buildPetCreatePayload(s).has_pet).toBe(true)
  })
})

describe('petBooking — large size × transport (PET-5A.1)', () => {
  it('large + harness permitido', () => {
    let s = applyWithAnimal(DEFAULT_PET_BOOKING, true)
    s = applyPetSize(s, 'large')
    s = applyPetTransport(s, 'harness')
    expect(validatePetBooking(s)).toEqual({ ok: true })
    expect(buildPetCreatePayload(s).pet_transport).toBe('harness')
  })

  it('large + carrier permitido', () => {
    const s = {
      ...DEFAULT_PET_BOOKING,
      withAnimal: true,
      petSize: 'large' as const,
      petTransport: 'carrier' as const,
    }
    expect(validatePetBooking(s)).toEqual({ ok: true })
    expect(buildPetCreatePayload(s).pet_transport).toBe('carrier')
  })

  it('applyPetSize large does not coerce carrier', () => {
    let s = applyWithAnimal(DEFAULT_PET_BOOKING, true)
    s = applyPetTransport(s, 'carrier')
    s = applyPetSize(s, 'large')
    expect(s.petTransport).toBe('carrier')
    expect(validatePetBooking(s).ok).toBe(true)
  })
})

describe('petBooking — assistance', () => {
  it('assistance: surcharge-free payload, not commercial pet', () => {
    const s = applyAssistance(DEFAULT_PET_BOOKING, true)
    expect(s.withAnimal).toBe(false)
    expect(s.isAssistanceAnimal).toBe(true)
    expect(validatePetBooking(s).ok).toBe(true)
    expect(buildPetCreatePayload(s)).toEqual({
      vehicle_category: 'x',
      passenger_count: 1,
      is_assistance_animal: true,
      has_pet: false,
      pet_occupies_seat: false,
    })
  })

  it('withAnimal e assistance são mutuamente exclusivos', () => {
    const withPet = applyWithAnimal(DEFAULT_PET_BOOKING, true)
    const thenAssist = applyAssistance(withPet, true)
    expect(thenAssist.withAnimal).toBe(false)
    expect(thenAssist.isAssistanceAnimal).toBe(true)
  })
})

describe('petBooking — seat', () => {
  it('pet_occupies_seat no payload', () => {
    let s = applyWithAnimal(DEFAULT_PET_BOOKING, true)
    s = applyPetTransport(s, 'harness')
    expect(s.petOccupiesSeat).toBe(true)
    expect(buildPetCreatePayload(s).pet_occupies_seat).toBe(true)
    s = { ...s, petOccupiesSeat: false }
    expect(buildPetCreatePayload(s).pet_occupies_seat).toBe(false)
  })
})
