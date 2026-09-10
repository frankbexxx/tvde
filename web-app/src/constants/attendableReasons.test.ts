import { describe, expect, it } from 'vitest'
import {
  tripInvolvesAnimal,
  validateAttendableReasonInput,
  OTHER_ATTENDABLE_REASON,
} from './attendableReasons'

describe('attendableReasons', () => {
  it('tripInvolvesAnimal detects pet / assistance / legacy', () => {
    expect(tripInvolvesAnimal({ has_pet: true })).toBe(true)
    expect(tripInvolvesAnimal({ is_assistance_animal: true })).toBe(true)
    expect(tripInvolvesAnimal({ vehicle_category: 'pet' })).toBe(true)
    expect(tripInvolvesAnimal({ has_pet: false, vehicle_category: 'x' })).toBe(false)
  })

  it('other requires detail', () => {
    expect(validateAttendableReasonInput(OTHER_ATTENDABLE_REASON, '')).toEqual({
      ok: false,
      messageKey: 'attendableReasons.errDetailRequired',
    })
    expect(validateAttendableReasonInput(OTHER_ATTENDABLE_REASON, '  mau cheiro  ')).toEqual({
      ok: true,
      code: OTHER_ATTENDABLE_REASON,
      detail: 'mau cheiro',
    })
  })

  it('valid code without detail ok', () => {
    expect(validateAttendableReasonInput('animal_hygiene_issue', null)).toEqual({
      ok: true,
      code: 'animal_hygiene_issue',
      detail: null,
    })
  })
})
