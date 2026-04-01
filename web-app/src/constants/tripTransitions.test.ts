import { describe, expect, it } from 'vitest'
import { isValidTripLifecycleTransition } from './tripTransitions'
import { isActiveTripStatus, isFinalTripStatus } from './tripStatus'

describe('isValidTripLifecycleTransition', () => {
  it('allows forward progress along the happy path', () => {
    expect(isValidTripLifecycleTransition('requested', 'assigned')).toBe(true)
    expect(isValidTripLifecycleTransition('assigned', 'accepted')).toBe(true)
    expect(isValidTripLifecycleTransition('accepted', 'arriving')).toBe(true)
    expect(isValidTripLifecycleTransition('arriving', 'ongoing')).toBe(true)
    expect(isValidTripLifecycleTransition('ongoing', 'completed')).toBe(true)
  })

  it('allows requested -> accepted (atribuição implícita)', () => {
    expect(isValidTripLifecycleTransition('requested', 'accepted')).toBe(true)
  })

  it('reversing from terminal states is invalid', () => {
    expect(isValidTripLifecycleTransition('completed', 'ongoing')).toBe(false)
    expect(isValidTripLifecycleTransition('completed', 'accepted')).toBe(false)
    expect(isValidTripLifecycleTransition('cancelled', 'ongoing')).toBe(false)
    expect(isValidTripLifecycleTransition('failed', 'requested')).toBe(false)
  })

  it('rejects arbitrary backwards jumps', () => {
    expect(isValidTripLifecycleTransition('ongoing', 'requested')).toBe(false)
    expect(isValidTripLifecycleTransition('accepted', 'requested')).toBe(false)
  })
})

describe('guards isActive / isFinal vs transitions', () => {
  it('terminal states are not active', () => {
    expect(isFinalTripStatus('completed')).toBe(true)
    expect(isActiveTripStatus('completed')).toBe(false)
  })
})
