/**
 * PET-2 — Passenger pet booking helpers (validation + payload).
 * Surcharge amount comes from API after create; FE only validates rules.
 */

export type PassengerFareCategory = 'x' | 'comfort' | 'xl'
export type PetSize = 'small' | 'medium' | 'large'
export type PetTransport = 'carrier' | 'harness'

export type PassengerPetBookingState = {
  fareCategory: PassengerFareCategory
  /** Passengers excluding driver (PET-4). */
  passengerCount: number
  /** Commercial pet (not assistance). */
  withAnimal: boolean
  isAssistanceAnimal: boolean
  petSize: PetSize | null
  petTransport: PetTransport | null
  petOccupiesSeat: boolean
}

export const DEFAULT_PET_BOOKING: PassengerPetBookingState = {
  fareCategory: 'x',
  passengerCount: 1,
  withAnimal: false,
  isAssistanceAnimal: false,
  petSize: null,
  petTransport: null,
  petOccupiesSeat: false,
}

export const PASSENGER_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6] as const

/** Product disclosure only — authoritative amount is always server `pet_surcharge`. */
export const PET_SURCHARGE_EUR_DISCLOSURE = 1.5

export function fareCategoryLabelKey(cat: PassengerFareCategory): string {
  switch (cat) {
    case 'x':
      return 'pet.categoryGo'
    case 'comfort':
      return 'pet.categoryComfort'
    case 'xl':
      return 'pet.categoryXl'
  }
}

export function defaultOccupiesSeat(transport: PetTransport | null): boolean {
  if (transport === 'harness') return true
  if (transport === 'carrier') return false
  return false
}

export type PetBookingValidation =
  | { ok: true }
  | { ok: false; messageKey: string }

/**
 * Client-side rules aligned with backend PET-0/1.
 * Large requires harness; size+transport required for commercial pet.
 */
export function validatePetBooking(state: PassengerPetBookingState): PetBookingValidation {
  if (state.isAssistanceAnimal) {
    return { ok: true }
  }
  if (!state.withAnimal) {
    return { ok: true }
  }
  if (!state.petSize) {
    return { ok: false, messageKey: 'pet.errSizeRequired' }
  }
  if (!state.petTransport) {
    return { ok: false, messageKey: 'pet.errTransportRequired' }
  }
  if (state.petSize === 'large' && state.petTransport !== 'harness') {
    return { ok: false, messageKey: 'pet.errLargeNeedsHarness' }
  }
  return { ok: true }
}

export type TripPetCreateFields = {
  vehicle_category: PassengerFareCategory
  passenger_count: number
  has_pet?: boolean
  pet_size?: PetSize
  pet_transport?: PetTransport
  is_assistance_animal?: boolean
  pet_occupies_seat?: boolean
}

/** Build create-trip pet fields; omit empties (null → field absent). */
export function buildPetCreatePayload(state: PassengerPetBookingState): TripPetCreateFields {
  const base: TripPetCreateFields = {
    vehicle_category: state.fareCategory,
    passenger_count: state.passengerCount >= 1 ? state.passengerCount : 1,
  }

  if (state.isAssistanceAnimal) {
    base.is_assistance_animal = true
    base.has_pet = false
    base.pet_occupies_seat = state.petOccupiesSeat
    return base
  }

  if (!state.withAnimal) {
    return base
  }

  base.has_pet = true
  if (state.petSize) base.pet_size = state.petSize
  if (state.petTransport) base.pet_transport = state.petTransport
  base.pet_occupies_seat = state.petOccupiesSeat
  return base
}

export function applyWithAnimal(
  prev: PassengerPetBookingState,
  withAnimal: boolean,
): PassengerPetBookingState {
  if (!withAnimal) {
    return {
      ...prev,
      withAnimal: false,
      isAssistanceAnimal: false,
      petSize: null,
      petTransport: null,
      petOccupiesSeat: false,
    }
  }
  return {
    ...prev,
    withAnimal: true,
    isAssistanceAnimal: false,
    petSize: prev.petSize ?? 'small',
    petTransport: prev.petTransport ?? 'carrier',
    petOccupiesSeat: defaultOccupiesSeat(prev.petTransport ?? 'carrier'),
  }
}

export function applyAssistance(
  prev: PassengerPetBookingState,
  assistance: boolean,
): PassengerPetBookingState {
  if (!assistance) {
    return { ...prev, isAssistanceAnimal: false }
  }
  return {
    ...prev,
    isAssistanceAnimal: true,
    withAnimal: false,
    petSize: null,
    petTransport: null,
    /* PET-4: keep seat flag editable for assistance. */
    petOccupiesSeat: prev.petOccupiesSeat,
  }
}

export function applyPetTransport(
  prev: PassengerPetBookingState,
  transport: PetTransport,
): PassengerPetBookingState {
  return {
    ...prev,
    petTransport: transport,
    petOccupiesSeat: defaultOccupiesSeat(transport),
  }
}

/** Large requires harness — coerce carrier → harness when size becomes large. */
export function applyPetSize(
  prev: PassengerPetBookingState,
  size: PetSize,
): PassengerPetBookingState {
  if (size === 'large' && prev.petTransport === 'carrier') {
    return {
      ...prev,
      petSize: size,
      petTransport: 'harness',
      petOccupiesSeat: defaultOccupiesSeat('harness'),
    }
  }
  return { ...prev, petSize: size }
}
