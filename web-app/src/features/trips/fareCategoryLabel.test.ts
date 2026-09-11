import { describe, expect, it } from 'vitest'
import { fareCategoryCommercialLabel } from './fareCategoryLabel'

describe('fareCategoryCommercialLabel', () => {
  it('maps x / comfort / xl', () => {
    expect(fareCategoryCommercialLabel('x')).toBe('GO')
    expect(fareCategoryCommercialLabel('comfort')).toBe('Comfort')
    expect(fareCategoryCommercialLabel('xl')).toBe('XL')
  })

  it('defaults and legacy pet → GO', () => {
    expect(fareCategoryCommercialLabel(null)).toBe('GO')
    expect(fareCategoryCommercialLabel('pet')).toBe('GO')
  })
})
