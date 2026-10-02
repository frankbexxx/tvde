import { describe, expect, it } from 'vitest'
import {
  ADMIN_ASSIGN_RECOVERY_LABEL,
  ADMIN_ASSIGN_RECOVERY_TITLE,
  adminAuditEventLabel,
  adminCancelledByLabel,
  adminTripStatusLabel,
  sanitizeAdminAuditPayload,
} from './adminTripSupportLabels'

describe('adminTripSupportLabels', () => {
  it('assign copy indica recuperação, não dispatch normal', () => {
    expect(ADMIN_ASSIGN_RECOVERY_LABEL.toLowerCase()).toContain('recupera')
    expect(ADMIN_ASSIGN_RECOVERY_TITLE.toLowerCase()).toMatch(/excepcional|recupera/)
    expect(ADMIN_ASSIGN_RECOVERY_TITLE.toLowerCase()).toMatch(/partner|fleet|automático/)
  })

  it('traduz os estados reais da viagem e não devolve o enum como label', () => {
    expect(adminTripStatusLabel('requested')).toBe('Pedido')
    expect(adminTripStatusLabel('assigned')).toBe('Motorista atribuído')
    expect(adminTripStatusLabel('accepted')).toBe('Aceite')
    expect(adminTripStatusLabel('arriving')).toBe('Motorista a chegar')
    expect(adminTripStatusLabel('ongoing')).toBe('Em viagem')
    expect(adminTripStatusLabel('completed')).toBe('Concluída')
    expect(adminTripStatusLabel('cancelled')).toBe('Cancelada')
    expect(adminTripStatusLabel('failed')).toBe('Falhou')
    expect(adminTripStatusLabel('queued')).toBe('Em fila')
    for (const status of [
      'requested',
      'assigned',
      'accepted',
      'arriving',
      'ongoing',
      'completed',
      'cancelled',
      'failed',
      'queued',
    ]) {
      expect(adminTripStatusLabel(status)).not.toBe(status)
    }
  })

  it('estado desconhecido não rebenta e não esconde o valor em branco', () => {
    expect(adminTripStatusLabel('mystery')).toBe('Estado desconhecido')
    expect(adminTripStatusLabel(null)).toBe('—')
    expect(adminTripStatusLabel('')).toBe('—')
  })

  it('labels PT para cancelled_by e eventos audit', () => {
    expect(adminCancelledByLabel('passenger')).toBe('Passageiro')
    expect(adminAuditEventLabel('admin.trip_transition_admin')).toMatch(/transição/i)
  })

  it('redige segredos e PII no payload de audit', () => {
    const safe = sanitizeAdminAuditPayload({
      to_status: 'arriving',
      client_secret: 'sk_live_x',
      phone: '+351900000000',
      note: 'ok',
    })
    expect(safe.client_secret).toBe('[redacted]')
    expect(safe.phone).toBe('[redacted]')
    expect(safe.to_status).toBe('arriving')
    expect(safe.note).toBe('ok')
  })
})
