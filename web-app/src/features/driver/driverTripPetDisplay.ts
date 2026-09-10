/**
 * PET-3 — Driver-facing pet summary from trip API fields.
 * Matching stays server-side; this only shapes display.
 */

export type DriverPetTripFields = {
  vehicle_category?: string | null
  passenger_count?: number | null
  has_pet?: boolean
  pet_size?: string | null
  pet_transport?: string | null
  is_assistance_animal?: boolean
  pet_occupies_seat?: boolean
  pet_surcharge?: number | null
  price_breakdown?: { pet_surcharge?: number } | null
}

export type DriverPetSize = 'small' | 'medium' | 'large'
export type DriverPetTransport = 'carrier' | 'harness'

export type DriverPetSummary =
  | { mode: 'none' }
  | {
      mode: 'commercial'
      size: DriverPetSize | null
      transport: DriverPetTransport | null
      occupiesSeat: boolean
      /** Authoritative from API; null = omit surcharge line. */
      surcharge: number | null
    }
  | { mode: 'assistance'; surcharge: number | null }
  | {
      /** Legacy vehicle_category=pet without modern attrs. */
      mode: 'legacy'
      surcharge: number | null
    }

function asSize(raw: string | null | undefined): DriverPetSize | null {
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw
  return null
}

function asTransport(raw: string | null | undefined): DriverPetTransport | null {
  if (raw === 'carrier' || raw === 'harness') return raw
  return null
}

function resolveSurcharge(trip: DriverPetTripFields): number | null {
  if (trip.pet_surcharge != null && !Number.isNaN(Number(trip.pet_surcharge))) {
    return Number(trip.pet_surcharge)
  }
  const fromBreakdown = trip.price_breakdown?.pet_surcharge
  if (fromBreakdown != null && !Number.isNaN(Number(fromBreakdown))) {
    return Number(fromBreakdown)
  }
  return null
}

export function buildDriverPetSummary(trip: DriverPetTripFields): DriverPetSummary {
  const surcharge = resolveSurcharge(trip)

  if (trip.is_assistance_animal) {
    return { mode: 'assistance', surcharge: surcharge ?? 0 }
  }

  if (trip.has_pet) {
    return {
      mode: 'commercial',
      size: asSize(trip.pet_size),
      transport: asTransport(trip.pet_transport),
      occupiesSeat: Boolean(trip.pet_occupies_seat),
      surcharge,
    }
  }

  const cat = (trip.vehicle_category ?? '').trim().toLowerCase()
  if (cat === 'pet') {
    return { mode: 'legacy', surcharge }
  }

  return { mode: 'none' }
}

/** Fare chip: never treat legacy `pet` as a modern fare line when attrs exist. */
export function driverFareCategoryForDisplay(
  vehicleCategory: string | null | undefined,
): string | null {
  const raw = (vehicleCategory ?? '').trim().toLowerCase()
  if (!raw) return null
  if (raw === 'pet') return 'x'
  return raw
}
