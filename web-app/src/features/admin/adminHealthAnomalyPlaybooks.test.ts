import { describe, expect, it } from 'vitest'
import { PB_TRIPS_ONGOING_LONG } from './adminHealthAnomalyPlaybooks'

describe('PB_TRIPS_ONGOING_LONG honesty', () => {
  it('não sugere cancelamento Admin impossível em ongoing', () => {
    const blob = [PB_TRIPS_ONGOING_LONG.what, ...PB_TRIPS_ONGOING_LONG.steps].join(' ').toLowerCase()
    // Frases que pediam acção Admin inexistente (versão antiga do playbook)
    expect(blob).not.toMatch(/avalia cancelamento admin/)
    expect(blob).not.toMatch(/cancela(?:r)?(?:\s+via)?\s+admin/)
    expect(blob).toMatch(/driver/)
    expect(blob).toMatch(/nota ops/)
    expect(blob).toMatch(/cron|timeouts|recover/)
    expect(blob).toMatch(/não (fecha|há cancelamento)/)
  })
})
