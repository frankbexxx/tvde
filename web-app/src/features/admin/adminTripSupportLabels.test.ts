import { describe, expect, it } from 'vitest'
import {
  ADMIN_ASSIGN_RECOVERY_LABEL,
  ADMIN_ASSIGN_RECOVERY_TITLE,
  adminAuditEventLabel,
  adminCancelledByLabel,
  sanitizeAdminAuditPayload,
} from './adminTripSupportLabels'

describe('adminTripSupportLabels', () => {
  it('assign copy indica recuperação, não dispatch normal', () => {
    expect(ADMIN_ASSIGN_RECOVERY_LABEL.toLowerCase()).toContain('recupera')
    expect(ADMIN_ASSIGN_RECOVERY_TITLE.toLowerCase()).toMatch(/excepcional|recupera/)
    expect(ADMIN_ASSIGN_RECOVERY_TITLE.toLowerCase()).toMatch(/partner|fleet|automático/)
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
