import { useMemo, useState } from 'react'
import { healthRowTimestamp } from './adminDashboardHelpers'
import { tripIdFromHealthRow } from './healthTripLinks'

/** Repõe paginação interna quando os dados de saúde mudam (via remount). */
export function healthBlockKey(title: string, rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return `${title}-0`
  const top = rows.slice(0, 3).map((r) => tripIdFromHealthRow(r) ?? healthRowTimestamp(r))
  return `${title}-${rows.length}-${top.join('|')}`
}

/** SP-D: texto humano + 3 passos por classe de anomalia (Saúde). */
export type HealthAnomalyPlaybook = {
  what: string
  steps: readonly [string, string, string]
}

export const PB_TRIPS_ACCEPTED_LONG: HealthAnomalyPlaybook = {
  what: 'Viagens que ficaram em «accepted» mais tempo do que o esperado: o motorista aceitou mas o fluxo não avançou (ex.: não passou a «arriving» / início).',
  steps: [
    'Abre cada linha em Viagens, confirma o estado real e se o motorista já se deslocou — usa «Forçar arriving» ou «Forçar ongoing» no admin quando fizer sentido operacional.',
    'Se o motorista desistiu ou há erro de dados, cancela ou re-atribui conforme a vossa política; regista motivo quando usares cancelamento com motivo.',
    'Corre em Operações «Correr cron agora» (timeouts) e volta a Atualizar a Saúde; se o volume for alto, verifica agendador externo do `/cron/jobs`.',
  ],
}

export const PB_TRIPS_ONGOING_LONG: HealthAnomalyPlaybook = {
  what: 'Viagens em «ongoing» há tempo excessivo: viagem iniciada mas não concluída nem falhou pelo motor automático.',
  steps: [
    'Abre a viagem em Viagens: confirma se o motorista ainda está em serviço ou se a app perdeu o «Complete».',
    'Se a viagem já terminou no mundo real, orienta o motorista a concluir na app; se está presa por bug, avalia cancelamento admin ou suporte em campo.',
    'Operações → cron + Atualizar Saúde; investiga logs Stripe se o pagamento ficou em processing.',
  ],
}

export const PB_DRIVERS_UNAVAILABLE: HealthAnomalyPlaybook = {
  what: 'Motoristas marcados indisponíveis há muito tempo sem viagem ativa associada — podem estar «presos» após falha ou timeout.',
  steps: [
    'Vai a Operações → «Recuperar motorista» para os UUID sugeridos (só com segurança: sem viagem activa).',
    'Se o caso não aparece na lista, usa UUID manual na mesma secção após confirmar no JSON da Saúde.',
    'Depois de recuperar, confirma na tab Frota / motorista que voltaram disponíveis e re-corre Saúde.',
  ],
}

export const PB_STUCK_PAYMENTS: HealthAnomalyPlaybook = {
  what: 'Pagamentos cujo estado interno não bate com o esperado (ex.: processing prolongado, incoerência com Stripe).',
  steps: [
    'Abre a viagem em Viagens e usa os links Stripe (test/live) do PaymentIntent para ver o estado real no dashboard.',
    'Confirma que o webhook Stripe está a receber eventos (Operações / deploy); sem webhook o capture pode ficar incompleto.',
    'Se precisares de nota interna sem alterar BD de pagamento, usa nota operacional de pagamento (audit); reembolso manual continua no Stripe até haver API dedicada.',
  ],
}

export const PB_MISSING_PAYMENT: HealthAnomalyPlaybook = {
  what: 'Viagens em estado que normalmente exigem registo de pagamento mas a linha de pagamento falta na base de dados.',
  steps: [
    'Abre em Viagens o trip_id indicado; confirma se a aceitação falhou a meio ou se houve duplicação.',
    'Não inventes pagamento manual na BD — escala com contexto (logs `trip_accepted`, Stripe).',
    'Cron + re-leitura da Saúde; se for bug de corrida, regista para correção de código na próxima sessão.',
  ],
}

export const PB_INCONSISTENT_FINANCIAL: HealthAnomalyPlaybook = {
  what: 'Incoerência entre viagem concluída e valores de pagamento (totais, comissão, payout) face às regras actuais.',
  steps: [
    'Abre a viagem e o PI no Stripe; cruza com o JSON desta linha antes de qualquer ajuste manual.',
    'Documenta o caso (nota operacional / suporte); não alteres valores financeiros sem processo acordado.',
    'Se for padrão recorrente, prioriza fix no motor de preços / webhook — lista para engenharia.',
  ],
}

export function HealthAnomalyBlock(props: {
  title: string
  rows: Array<Record<string, unknown>>
  onOpenTrip: (tripId: string) => void
  pageSize?: number
  playbook?: HealthAnomalyPlaybook
}) {
  const { title, rows, onOpenTrip, pageSize = 20, playbook } = props
  const [sortRecent, setSortRecent] = useState(true)
  const [shown, setShown] = useState(pageSize)

  const sortedRows = useMemo(() => {
    if (!sortRecent) return rows
    return [...rows].sort((a, b) => healthRowTimestamp(b).localeCompare(healthRowTimestamp(a)))
  }, [rows, sortRecent])

  const slice = sortedRows.slice(0, shown)
  const canShowMore = shown < sortedRows.length

  if (!rows.length) return null
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2 touch-manipulation">
      {playbook ? (
        <details className="rounded-lg border border-info/40 bg-info/10 px-2 py-1.5 text-xs">
          <summary className="cursor-pointer font-medium text-foreground select-none min-h-10 flex items-center py-1">
            O que é · O que fazer (3 passos)
          </summary>
          <p className="mt-2 text-foreground/85 leading-relaxed">{playbook.what}</p>
          <ol className="mt-2 list-decimal pl-4 space-y-1.5 text-foreground/85">
            {playbook.steps.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ol>
        </details>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {title} ({rows.length})
        </p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={`inline-flex items-center justify-center min-h-11 touch-manipulation px-2 py-1.5 text-xs rounded-lg border ${sortRecent
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
              }`}
            onClick={() => {
              setSortRecent(true)
              setShown(pageSize)
            }}
          >
            Mais recentes
          </button>
          <button
            type="button"
            className={`inline-flex items-center justify-center min-h-11 touch-manipulation px-2 py-1.5 text-xs rounded-lg border ${!sortRecent
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
              }`}
            onClick={() => {
              setSortRecent(false)
              setShown(pageSize)
            }}
          >
            Ordem API
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {slice.map((row, i) => {
          const tid = tripIdFromHealthRow(row)
          const key = tid ? `${title}-${tid}-${i}` : `${title}-row-${i}`
          return (
            <li key={key} className="rounded-lg border border-border/80 bg-background p-2 space-y-2">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                {tid ? (
                  <button
                    type="button"
                    className="w-full min-h-10 px-3 py-2 sm:w-auto shrink-0 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90"
                    onClick={() => onOpenTrip(tid)}
                  >
                    Abrir em Viagens
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground pr-2">
                    Sem viagem nesta linha (ex.: motorista) — ver JSON ou Operações.
                  </p>
                )}
              </div>
              <pre className="text-xs text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                {JSON.stringify(row, null, 2)}
              </pre>
            </li>
          )
        })}
      </ul>
      {canShowMore ? (
        <button
          type="button"
          className="w-full min-h-10 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card text-foreground/90 hover:bg-muted/40"
          onClick={() => setShown((n) => Math.min(n + pageSize, sortedRows.length))}
        >
          Mostrar mais ({sortedRows.length - shown} restantes)
        </button>
      ) : null}
    </div>
  )
}
