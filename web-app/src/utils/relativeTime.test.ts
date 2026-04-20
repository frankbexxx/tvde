import { describe, it, expect } from 'vitest'
import { formatRelativeAgo, minutesSince } from './relativeTime'

describe('formatRelativeAgo', () => {
  const NOW = Date.parse('2026-04-21T10:00:00Z')

  it('devolve em segundos quando diferença < 60s', () => {
    const iso = new Date(NOW - 8_000).toISOString()
    expect(formatRelativeAgo(iso, NOW)).toBe('há 8s')
  })

  it('arredonda para minutos quando >= 60s e < 1h', () => {
    const iso = new Date(NOW - 3 * 60_000).toISOString()
    expect(formatRelativeAgo(iso, NOW)).toBe('há 3 min')
  })

  it('mostra horas quando >= 1h', () => {
    const iso = new Date(NOW - 2 * 3_600_000).toISOString()
    expect(formatRelativeAgo(iso, NOW)).toBe('há 2 h')
  })

  it('mostra dia singular para 1 dia', () => {
    const iso = new Date(NOW - 24 * 3_600_000).toISOString()
    expect(formatRelativeAgo(iso, NOW)).toBe('há 1 dia')
  })

  it('mostra dias plural para > 1 dia', () => {
    const iso = new Date(NOW - 3 * 24 * 3_600_000).toISOString()
    expect(formatRelativeAgo(iso, NOW)).toBe('há 3 dias')
  })

  it('trata null/undefined/invalid ISO como "—"', () => {
    expect(formatRelativeAgo(null, NOW)).toBe('—')
    expect(formatRelativeAgo(undefined, NOW)).toBe('—')
    expect(formatRelativeAgo('nao-iso', NOW)).toBe('—')
  })

  it('clampa diferença negativa (iso no futuro) a 0s', () => {
    const iso = new Date(NOW + 5_000).toISOString()
    expect(formatRelativeAgo(iso, NOW)).toBe('há 1s')
  })
})

describe('minutesSince', () => {
  const NOW = Date.parse('2026-04-21T10:00:00Z')

  it('devolve 0 para iso igual a now', () => {
    expect(minutesSince(new Date(NOW).toISOString(), NOW)).toBe(0)
  })

  it('calcula minutos com fracção', () => {
    const iso = new Date(NOW - 90_000).toISOString()
    expect(minutesSince(iso, NOW)).toBeCloseTo(1.5, 5)
  })

  it('devolve null para null/invalid', () => {
    expect(minutesSince(null, NOW)).toBeNull()
    expect(minutesSince('abc', NOW)).toBeNull()
  })

  it('clampa negativo a 0', () => {
    const iso = new Date(NOW + 60_000).toISOString()
    expect(minutesSince(iso, NOW)).toBe(0)
  })
})
