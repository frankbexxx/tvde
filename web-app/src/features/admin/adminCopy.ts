/** Visible labels only. Does not change status values, filters, or permissions. */

export function adminSessionRoleLabel(role: string | null | undefined): {
  primary: string
  technical: string | null
} {
  if (!role) return { primary: 'Sessão sem papel', technical: null }
  if (role === 'super_admin') return { primary: 'Administrador principal', technical: role }
  if (role === 'admin') return { primary: 'Administrador', technical: role }
  return { primary: 'Sessão activa', technical: role }
}

export function adminHealthStatusLabel(status: string | null | undefined): {
  primary: string
  technical: string | null
} {
  if (!status || status === '—' || status === 'unknown') {
    return { primary: 'Desconhecido', technical: status && status !== '—' ? status : null }
  }
  if (status === 'ok') return { primary: 'Operacional', technical: status }
  if (status === 'degraded') return { primary: 'Com problema', technical: status }
  if (status === 'error' || status === 'unavailable' || status === 'down') {
    return { primary: 'Indisponível', technical: status }
  }
  return { primary: 'Desconhecido', technical: status }
}

const DOC_STATUS_LABELS: Record<string, string> = {
  pending: 'Por rever',
  pending_review: 'Por rever',
  approved: 'Aprovado',
  rejected: 'Recusado',
  expired: 'Expirado',
  missing: 'Em falta',
  valid: 'Válido',
  expiring_soon: 'A expirar',
}

export function adminDocStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return DOC_STATUS_LABELS[status] ?? status
}
