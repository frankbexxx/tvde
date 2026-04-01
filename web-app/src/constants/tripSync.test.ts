import { describe, expect, it } from 'vitest'
import { mergeDriverPolledWithOverride } from './tripStatus'

/**
 * T3: optimistic merge (motorista) — override à frente do poll até o servidor alinhar;
 * estados terminais do servidor prevalecem.
 */
describe('mergeDriverPolledWithOverride (sync semantics)', () => {
  it('keeps local ACCEPTED when poll is still REQUESTED (stale poll)', () => {
    expect(mergeDriverPolledWithOverride('requested', 'accepted', 'accepted')).toBe('accepted')
  })

  it('uses COMPLETED from server over local ACCEPTED', () => {
    expect(mergeDriverPolledWithOverride('completed', 'accepted', 'accepted')).toBe('completed')
  })

  it('uses CANCELLED from server over local ONGOING override', () => {
    expect(mergeDriverPolledWithOverride('cancelled', 'ongoing', 'accepted')).toBe('cancelled')
  })
})
