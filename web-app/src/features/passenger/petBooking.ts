/**
 * PET-2 — Passenger pet booking helpers (validation + payload).
 * Surcharge amount comes from API after create; FE only validates rules.
 * Category capacity: GO/Comfort max required seats 4; XL 1..8 (vehicle matching is SoT).
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

/** @deprecated Prefer passengerCountOptionsForCategory — kept for legacy imports. */
export const PASSENGER_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export const STANDARD_CATEGORY_MAX_REQUIRED_SEATS = 4
export const XL_PASSENGER_COUNT_MAX = 8
export const GO_COMFORT_PASSENGER_COUNTS = [1, 2, 3, 4] as const
export const XL_PASSENGER_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8] as const

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

/** required_seats = passenger_count + (1 if pet occupies seat else 0). */
export function requiredSeats(state: PassengerPetBookingState): number {
  const petExtra =
    state.petOccupiesSeat && (state.withAnimal || state.isAssistanceAnimal) ? 1 : 0
  const count = state.passengerCount >= 1 ? state.passengerCount : 1
  return count + petExtra
}

export function passengerCountOptionsForCategory(
  cat: PassengerFareCategory,
): readonly number[] {
  return cat === 'xl' ? XL_PASSENGER_COUNTS : GO_COMFORT_PASSENGER_COUNTS
}

export function isFareCategoryAvailableForRequiredSeats(
  cat: PassengerFareCategory,
  required: number,
): boolean {
  if (cat === 'xl') return required >= 1 && required <= XL_PASSENGER_COUNT_MAX
  return required >= 1 && required <= STANDARD_CATEGORY_MAX_REQUIRED_SEATS
}

export function isFareCategoryAvailable(
  cat: PassengerFareCategory,
  state: PassengerPetBookingState,
): boolean {
  return isFareCategoryAvailableForRequiredSeats(cat, requiredSeats(state))
}

export type PetBookingValidation =
  | { ok: true }
  | { ok: false; messageKey: string }

/**
 * Client-side rules (PET-5A.1): commercial pet needs size + transport;
 * category capacity mirrors backend (GO/Comfort required ≤ 4).
 */
export function validatePetBooking(state: PassengerPetBookingState): PetBookingValidation {
  if (!isFareCategoryAvailable(state.fareCategory, state)) {
    return { ok: false, messageKey: 'pet.errCapacityCategory' }
  }
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

export function applyFareCategory(
  prev: PassengerPetBookingState,
  fareCategory: PassengerFareCategory,
): PassengerPetBookingState {
  let passengerCount = prev.passengerCount
  if (fareCategory !== 'xl' && passengerCount > STANDARD_CATEGORY_MAX_REQUIRED_SEATS) {
    passengerCount = STANDARD_CATEGORY_MAX_REQUIRED_SEATS
  }
  let next: PassengerPetBookingState = { ...prev, fareCategory, passengerCount }
  // Pet seat may still push required > 4 on GO/Comfort — clamp passenger count.
  while (
    fareCategory !== 'xl' &&
    requiredSeats(next) > STANDARD_CATEGORY_MAX_REQUIRED_SEATS &&
    next.passengerCount > 1
  ) {
    next = { ...next, passengerCount: next.passengerCount - 1 }
  }
  return next
}

export function applyPassengerCount(
  prev: PassengerPetBookingState,
  passengerCount: number,
): PassengerPetBookingState {
  const n = Math.max(1, Math.min(XL_PASSENGER_COUNT_MAX, Math.floor(passengerCount)))
  let fareCategory = prev.fareCategory
  if (n > STANDARD_CATEGORY_MAX_REQUIRED_SEATS) {
    fareCategory = 'xl'
  }
  return { ...prev, passengerCount: n, fareCategory }
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
  let next: PassengerPetBookingState = {
    ...prev,
    withAnimal: true,
    isAssistanceAnimal: false,
    petSize: prev.petSize ?? 'small',
    petTransport: prev.petTransport ?? 'carrier',
    petOccupiesSeat: defaultOccupiesSeat(prev.petTransport ?? 'carrier'),
  }
  if (
    next.fareCategory !== 'xl' &&
    requiredSeats(next) > STANDARD_CATEGORY_MAX_REQUIRED_SEATS
  ) {
    next = { ...next, fareCategory: 'xl' }
  }
  return next
}

export function applyAssistance(
  prev: PassengerPetBookingState,
  assistance: boolean,
): PassengerPetBookingState {
  if (!assistance) {
    return { ...prev, isAssistanceAnimal: false }
  }
  let next: PassengerPetBookingState = {
    ...prev,
    isAssistanceAnimal: true,
    withAnimal: false,
    petSize: null,
    petTransport: null,
    /* PET-4: keep seat flag editable for assistance. */
    petOccupiesSeat: prev.petOccupiesSeat,
  }
  if (
    next.fareCategory !== 'xl' &&
    requiredSeats(next) > STANDARD_CATEGORY_MAX_REQUIRED_SEATS
  ) {
    next = { ...next, fareCategory: 'xl' }
  }
  return next
}

export function applyPetTransport(
  prev: PassengerPetBookingState,
  transport: PetTransport,
): PassengerPetBookingState {
  let next: PassengerPetBookingState = {
    ...prev,
    petTransport: transport,
    petOccupiesSeat: defaultOccupiesSeat(transport),
  }
  if (
    next.fareCategory !== 'xl' &&
    requiredSeats(next) > STANDARD_CATEGORY_MAX_REQUIRED_SEATS
  ) {
    next = { ...next, fareCategory: 'xl' }
  }
  return next
}

/** Set size without coercing transport (PET-5A.1). */
export function applyPetSize(
  prev: PassengerPetBookingState,
  size: PetSize,
): PassengerPetBookingState {
  return { ...prev, petSize: size }
}

export function applyPetOccupiesSeat(
  prev: PassengerPetBookingState,
  petOccupiesSeat: boolean,
): PassengerPetBookingState {
  let next: PassengerPetBookingState = { ...prev, petOccupiesSeat }
  if (
    next.fareCategory !== 'xl' &&
    requiredSeats(next) > STANDARD_CATEGORY_MAX_REQUIRED_SEATS
  ) {
    next = { ...next, fareCategory: 'xl' }
  }
  return next
}
