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
  what: 'Viagens em «ongoing» há tempo excessivo: viagem iniciada mas não concluída nem falhou pelo motor automático. O Admin não fecha «ongoing» (complete/cancel/fail ficam fora de scope).',
  steps: [
    'Abre a viagem em Viagens e confirma no Driver se a corrida ainda está activa ou se a app perdeu o fecho.',
    'Se for caso real já terminado, pede ao Driver para terminar na app; regista nota ops se precisares de rasto. Em extremo, escala manualmente — não há cancelamento Admin em ongoing.',
    'Operações → cron/timeouts/recover quando aplicável; Atualizar Saúde; se o pagamento ficou em processing, cruza Stripe / nota ops (sem inventar fecho Admin).',
  ],
}

export const PB_DRIVERS_UNAVAILABLE: HealthAnomalyPlaybook = {
  what: 'Motoristas indisponíveis há muito tempo sem viagem activa. Isto é informação operacional — offline voluntário ou conta demo é normal e não degrada o serviço.',
  steps: [
    'Confirma se é offline voluntário, fim de turno ou conta demo (badge «Conta demo») antes de qualquer acção.',
    'Só considera «Recuperar motorista» em Operações se houver evidência de bloqueio (viagem terminada mas app presa, inconsistência confirmada) — nunca só por tempo offline.',
    'Se for demo ou offline esperado, documenta e ignora; se for anomalia real, recupera com motivo e re-lê a Saúde.',
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

export const PB_WEBHOOK_ANOMALIES: HealthAnomalyPlaybook = {
  what: 'Registos persistidos de webhooks Stripe atípicos (ex.: payment not found, amount mismatch). Informação operacional — não altera o estado global de Saúde.',
  steps: [
    'Com recolha desactivada, zero linhas aqui não prova que tudo está bem — consulta logs `stripe_webhook_*` e o runbook O_STRIPE_1 §11.',
    'Abre o PaymentIntent no Stripe Dashboard; cruza com viagem/pagamento na BD por `payment_intent_id` ou `trip_id`.',
    'Se houver mismatch ou órfão, segue reconciliação manual (Operações) — não forces 5xx no webhook.',
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
