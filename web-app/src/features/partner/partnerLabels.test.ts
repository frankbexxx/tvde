import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { partnerDriverStatusLabel, partnerTripStatusLabel } from './partnerLabels'

describe('partnerLabels', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
  })

  it('humaniza trip status conhecidos em PT', () => {
    expect(partnerTripStatusLabel('requested')).toBe('Pedido')
    expect(partnerTripStatusLabel('assigned')).toBe('Atribuída')
    expect(partnerTripStatusLabel('accepted')).toBe('Aceite')
    expect(partnerTripStatusLabel('arriving')).toBe('A chegar')
    expect(partnerTripStatusLabel('ongoing')).toBe('Em curso')
    expect(partnerTripStatusLabel('completed')).toBe('Concluída')
    expect(partnerTripStatusLabel('cancelled')).toBe('Cancelada')
    expect(partnerTripStatusLabel('failed')).toBe('Falhada')
  })

  it('humaniza driver status conhecidos em PT', () => {
    expect(partnerDriverStatusLabel('pending')).toBe('Pendente')
    expect(partnerDriverStatusLabel('approved')).toBe('Aprovado')
    expect(partnerDriverStatusLabel('rejected')).toBe('Rejeitado')
  })

  it('unknown status cai para raw fallback', () => {
    expect(partnerTripStatusLabel('weird_trip_state')).toBe('weird_trip_state')
    expect(partnerDriverStatusLabel('suspended')).toBe('suspended')
  })

  it('EN labels quando locale en', async () => {
    await i18n.changeLanguage('en')
    expect(partnerTripStatusLabel('ongoing')).toBe('Ongoing')
    expect(partnerDriverStatusLabel('approved')).toBe('Approved')
  })
})
