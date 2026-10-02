import type { AdminCronRunResponse } from '../../api/admin'
import { adminHealthStatusLabel } from './adminCopy'

export type AdminCronRunView = AdminCronRunResponse & {
  driver_zone_sessions_expired?: number
  rotacional_external_items_stored?: number
}

function countOf(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** Visible sentence only. Does not change the cron request or the response object. */
export function adminCronResultPrimary(run: AdminCronRunView): string {
  const headline =
    run.status === 'ok' && run.error_count === 0
      ? 'Operação concluída.'
      : run.status === 'partial_error' || run.error_count > 0
        ? 'A operação terminou com problemas.'
        : 'Resultado desconhecido.'

  const changes = [
    counted(
      countOf(run.timeouts.assigned_to_requested),
      'viagem voltou à espera',
      'viagens voltaram à espera',
    ),
    counted(
      countOf(run.timeouts.accepted_to_cancelled),
      'viagem aceite foi cancelada por tempo',
      'viagens aceites foram canceladas por tempo',
    ),
    counted(
      countOf(run.timeouts.ongoing_to_failed),
      'viagem em curso falhou por tempo',
      'viagens em curso falharam por tempo',
    ),
    counted(countOf(run.offers.expired_count), 'oferta expirou', 'ofertas expiraram'),
    counted(
      countOf(run.offers.redispatch_created),
      'oferta foi reenviada',
      'ofertas foram reenviadas',
    ),
    counted(
      countOf(run.cleanup.audit_events_deleted),
      'registo antigo foi apagado',
      'registos antigos foram apagados',
    ),
  ]
  if (run.driver_zone_sessions_expired != null) {
    changes.push(
      counted(
        countOf(run.driver_zone_sessions_expired),
        'sessão de zona expirou',
        'sessões de zona expiraram',
      ),
    )
  }
  if (run.rotacional_external_items_stored != null) {
    changes.push(
      counted(
        countOf(run.rotacional_external_items_stored),
        'item externo foi guardado',
        'itens externos foram guardados',
      ),
    )
  }
  const moved = changes.filter((line) => !line.startsWith('0 '))
  const body =
    moved.length > 0
      ? moved.join(', ') + '.'
      : 'Nada mudou nas viagens, nas ofertas nem nos registos.'
  const health = adminHealthStatusLabel(run.system_health_status)
  const healthBit = `Verificação de saúde: ${health.primary}${health.technical ? ` (${health.technical})` : ''}.`
  const failBit =
    run.error_count > 0
      ? ` ${run.error_count} ${run.error_count === 1 ? 'falha' : 'falhas'}.`
      : ''
  return `${headline} ${body} ${healthBit}${failBit}`
}

export function adminCronResultTechnical(run: AdminCronRunView): string {
  return `status=${run.status} · duration_ms=${run.duration_ms} · error_count=${run.error_count} · request_id=${run.request_id || '—'}`
}
