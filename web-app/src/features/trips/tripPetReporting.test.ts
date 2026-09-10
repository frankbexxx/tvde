import { describe, expect, it } from 'vitest'
import {
  formatPetSurchargeEuro,
  tripAnimalBadgeKind,
  tripHasCompanionPet,
  tripIsAssistanceDog,
} from './tripPetReporting'

describe('tripPetReporting', () => {
  it('distinguishes assistance vs companion', () => {
    expect(tripIsAssistanceDog({ is_assistance_animal: true })).toBe(true)
    expect(tripHasCompanionPet({ is_assistance_animal: true, has_pet: true })).toBe(false)
    expect(tripAnimalBadgeKind({ has_pet: true })).toBe('pet')
    expect(tripAnimalBadgeKind({ is_assistance_animal: true })).toBe('assistance')
    expect(tripAnimalBadgeKind({ vehicle_category: 'pet' })).toBe('pet')
    expect(tripAnimalBadgeKind({})).toBeNull()
  })

  it('surcharge label only when >0', () => {
    expect(formatPetSurchargeEuro(0)).toBeNull()
    expect(formatPetSurchargeEuro(1.5)).toBe('1.50 €')
  })
})
