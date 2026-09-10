/**
 * PET-5B — compact Partner/Admin trip animal + passenger reporting labels.
 */

export type TripPetReportingFlags = {
  has_pet?: boolean | null
  is_assistance_animal?: boolean | null
  vehicle_category?: string | null
  passenger_count?: number | null
  pet_surcharge?: number | null
  pet_size?: string | null
  pet_transport?: string | null
  pet_occupies_seat?: boolean | null
}

export function tripIsAssistanceDog(t: TripPetReportingFlags | null | undefined): boolean {
  return Boolean(t?.is_assistance_animal)
}

export function tripHasCompanionPet(t: TripPetReportingFlags | null | undefined): boolean {
  if (!t) return false
  if (t.is_assistance_animal) return false
  if (t.has_pet) return true
  return (t.vehicle_category ?? '').trim().toLowerCase() === 'pet'
}

/** Compact list badge: null when no animal. */
export function tripAnimalBadgeKind(
  t: TripPetReportingFlags | null | undefined,
): 'assistance' | 'pet' | null {
  if (tripIsAssistanceDog(t)) return 'assistance'
  if (tripHasCompanionPet(t)) return 'pet'
  return null
}

export function formatPetSurchargeEuro(amount: number | null | undefined): string | null {
  if (amount == null || Number.isNaN(Number(amount))) return null
  const n = Number(amount)
  if (n <= 0) return null
  return `${n.toFixed(2)} €`
}
