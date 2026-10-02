import { describe, expect, it } from 'vitest'
import { fleetCreatedMessage, rememberCreatedFleet, type AdminFleetOption } from './adminFleetSelection'

const porto: AdminFleetOption = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Frota Porto',
  created_at: '2026-10-01T10:00:00.000Z',
}

describe('rememberCreatedFleet', () => {
  it('selecciona a frota criada e junta o nome à lista', () => {
    const created: AdminFleetOption = {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Frota Lisboa Norte',
      created_at: '2026-10-02T10:00:00.000Z',
    }
    const next = rememberCreatedFleet(created, [porto])
    expect(next.partnerId).toBe(created.id)
    expect(next.partners.map((partner) => partner.name)).toEqual(['Frota Lisboa Norte', 'Frota Porto'])
  })

  it('não inventa um id quando a resposta não traz identificador', () => {
    const next = rememberCreatedFleet({ id: '  ', name: 'Sem id', created_at: '' }, [porto])
    expect(next.partnerId).toBe('')
    expect(next.partners).toEqual([porto])
  })

  it('não duplica uma frota que já está na lista', () => {
    const next = rememberCreatedFleet(porto, [porto])
    expect(next.partners).toEqual([porto])
    expect(next.partnerId).toBe(porto.id)
  })
})

describe('fleetCreatedMessage', () => {
  it('nomeia a frota sem pedir o identificador', () => {
    const message = fleetCreatedMessage('Frota Lisboa Norte')
    expect(message).toBe('Frota “Frota Lisboa Norte” criada. Já podes criar o gestor.')
    expect(message).not.toMatch(/uuid|partner_id|ID da frota/i)
  })
})
