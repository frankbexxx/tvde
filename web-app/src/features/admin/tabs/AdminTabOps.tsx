import { OPS_STUCK_PAYMENTS_PAGE_SIZE } from '../adminConstants'
import { copyAdminClipboard } from '../adminDashboardHelpers'
import { driverIdFromHealthUnavailableRow, tripIdFromHealthRow } from '../healthTripLinks'
import { maskSensitiveEnvDisplay } from '../adminDashboardHelpers'
import { stripePaymentIntentDashboardUrls } from '../../../utils/stripeDashboard'

type AdminTabOpsProps = Record<string, any>

export function AdminTabOps(props: AdminTabOpsProps) {
  const {
    cronRun,
    envReveal,
    envText,
    envValidate,
    fetchHealth,
    handleExportLogs,
    handleFetchPhase0,
    handleReconcileCloseNoPi,
    handleReconcilePreview,
    handleReconcileStripeSync,
    handleRecoverDriver,
    handleRunCronNow,
    handleRunOfferExpiry,
    handleRunTimeouts,
    handleValidateEnv,
    health,
    isSuperAdminSession,
    opsLoading,
    opsStuckPaymentsPage,
    opsStuckPaymentsPageData,
    phase0,
    reconcilePreview,
    reconcileRun,
    recoverDriverId,
    runRecoverDriver,
    setEnvReveal,
    setEnvText,
    setOpsStuckPaymentsPage,
    setRecoverDriverId,
    syncAdminUrl,
  } = props

  return (
    <>
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Operações</h2>
          <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">FASE 0 — Pronto para testes</p>
              <button
                type="button"
                onClick={handleFetchPhase0}
                disabled={!!opsLoading}
                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40 disabled:opacity-50"
              >
                {opsLoading === 'phase0' ? 'A verificar…' : 'Verificar'}
              </button>
            </div>
            {phase0 ? (
              <div className="text-sm space-y-1">
                <p className="text-foreground/80">
                  ENV={phase0.env} · ENVIRONMENT={String(phase0.environment ?? '') || '—'} · request_id={phase0.request_id || '—'}
                </p>
                <ul className="list-disc pl-5 text-foreground/80">
                  <li>CRON_SECRET set: {phase0.cron_secret_set ? 'sim' : 'não'}</li>
                  <li>STRIPE_WEBHOOK_SECRET set: {phase0.stripe_webhook_secret_set ? 'sim' : 'não'}</li>
                  <li>STRIPE_MOCK: {phase0.stripe_mock ? 'sim' : 'não'}</li>
                  <li>BETA_MODE: {phase0.beta_mode ? 'sim' : 'não'}</li>
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Carrega “Verificar” para ver readiness.</p>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Cron (admin-only)</p>
              <button
                type="button"
                onClick={handleRunCronNow}
                disabled={!!opsLoading || !isSuperAdminSession}
                title={
                  !isSuperAdminSession
                    ? 'Requer sessão super_admin (mesma regra que na API).'
                    : undefined
                }
                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-warning/20 text-warning rounded-xl font-medium disabled:opacity-50"
              >
                {opsLoading === 'cron' ? 'A correr…' : 'Correr cron agora'}
              </button>
            </div>
            {cronRun ? (
              <div className="text-sm space-y-1">
                <p className="text-foreground/80">
                  status={cronRun.status} · duration_ms={cronRun.duration_ms} · error_count={cronRun.error_count} · request_id=
                  {cronRun.request_id || '—'}
                </p>
                {cronRun.error_count > 0 ? (
                  <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto">
                    {JSON.stringify(cronRun.errors, null, 2)}
                  </pre>
                ) : (
                  <p className="text-foreground/75">Sem erros.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Executa para validar timeouts/offers/cleanup/health.</p>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Validar .env (não guarda segredos)</p>
              <button
                type="button"
                onClick={() => setEnvReveal((v: any) => !v)}
                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground hover:bg-muted/40"
              >
                {envReveal ? 'Ocultar valores sensíveis' : 'Mostrar para editar'}
              </button>
            </div>
            {!envReveal ? (
              <textarea
                readOnly
                value={envText ? maskSensitiveEnvDisplay(envText) : ''}
                placeholder="Cola aqui o .env. Valores sensíveis aparecem mascarados até carregares em «Mostrar para editar»."
                className="w-full min-h-28 px-3 py-2 border rounded-lg text-sm font-mono bg-muted/20 text-foreground"
              />
            ) : (
              <textarea
                value={envText}
                onChange={(e: any) => setEnvText(e.target.value)}
                placeholder="Cola aqui o .env (key=value). Isto só valida; não guarda."
                className="w-full min-h-28 px-3 py-2 border rounded-lg text-sm font-mono"
              />
            )}
            {!envReveal ? (
              <p className="text-xs text-muted-foreground">
                Modo seguro: chaves com TOKEN/SECRET/PASSWORD/etc. mostram valor oculto no ecrã.
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleValidateEnv}
                disabled={!!opsLoading || !envText.trim() || !isSuperAdminSession}
                title={
                  !isSuperAdminSession
                    ? 'Validar .env na API exige super_admin (dados sensíveis).'
                    : undefined
                }
                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-info/20 text-info rounded-xl font-medium disabled:opacity-50"
              >
                {opsLoading === 'env-validate' ? 'A validar…' : 'Validar'}
              </button>
              {envValidate ? (
                <span className="text-xs text-foreground/70">
                  request_id={envValidate.request_id || '—'} · missing={envValidate.missing_required_keys.length} · ignored_lines=
                  {envValidate.ignored_lines}
                </span>
              ) : null}
            </div>
            {envValidate ? (
              envValidate.missing_required_keys.length > 0 ? (
                <div className="text-sm text-warning bg-warning/10 border border-warning/20 px-3 py-2 rounded-lg">
                  <p className="font-medium">Faltam chaves obrigatórias</p>
                  <ul className="list-disc pl-5">
                    {envValidate.missing_required_keys.map((k: any) => (
                      <li key={k} className="font-mono text-xs">
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-sm text-success bg-success/10 border border-success/20 px-3 py-2 rounded-lg">
                  OK — chaves obrigatórias presentes.
                </div>
              )
            ) : null}
          </div>

          <div className="space-y-3">
            {!isSuperAdminSession ? (
              <p className="text-xs text-muted-foreground rounded-xl border border-border/80 bg-muted/15 px-3 py-2 leading-relaxed">
                <span className="font-medium text-foreground/90">Operação:</span> os três botões abaixo chamam rotas{' '}
                <code className="font-mono text-[11px]">/admin/run-timeouts</code>,{' '}
                <code className="font-mono text-[11px]">/admin/run-offer-expiry</code> e{' '}
                <code className="font-mono text-[11px]">/admin/export-logs</code> — na API só{' '}
                <code className="font-mono text-[11px]">super_admin</code>. Usa sessão elevada ou pede a quem a tenha.
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleRunTimeouts}
              disabled={!!opsLoading || !isSuperAdminSession}
              title={!isSuperAdminSession ? 'Requer sessão super_admin.' : undefined}
              className="w-full min-h-11 px-4 py-3 bg-warning/20 text-warning rounded-lg font-medium disabled:opacity-50 touch-manipulation"
            >
              {opsLoading === 'timeouts' ? 'A executar...' : 'Executar timeouts'}
            </button>
            <button
              type="button"
              onClick={handleRunOfferExpiry}
              disabled={!!opsLoading || !isSuperAdminSession}
              title={!isSuperAdminSession ? 'Requer sessão super_admin.' : undefined}
              className="w-full min-h-11 px-4 py-3 bg-warning/20 text-warning rounded-lg font-medium disabled:opacity-50 touch-manipulation"
            >
              {opsLoading === 'offer-expiry' ? 'A executar...' : 'Expirar ofertas e redispatch'}
            </button>
            <button
              type="button"
              onClick={handleExportLogs}
              disabled={!!opsLoading || !isSuperAdminSession}
              title={!isSuperAdminSession ? 'Requer sessão super_admin.' : undefined}
              className="w-full min-h-11 px-4 py-3 bg-info/20 text-info rounded-lg font-medium disabled:opacity-50 touch-manipulation"
            >
              {opsLoading === 'export' ? 'A exportar...' : 'Exportar logs CSV'}
            </button>

            {isSuperAdminSession ? (
              <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-4 shadow-card space-y-3">
                <p className="text-sm font-medium text-foreground">Reconciliar pagamentos (super_admin)</p>
                <p className="text-xs text-muted-foreground">
                  Pares <span className="font-mono">trip.completed</span> + <span className="font-mono">payment.processing</span>
                  : pré-visualizar, alinhar com Stripe (se existir PI), ou fechar como failed quando não há PI. Com auditoria
                  (motivo SP-F). Em ambiente com <span className="font-mono">STRIPE_MOCK</span>, o Stripe sync não chama a API
                  externa.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleReconcilePreview()}
                    disabled={!!opsLoading}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/90 text-xs font-medium rounded-xl hover:bg-muted/40 disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-preview' ? 'A carregar…' : 'Pré-visualizar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileStripeSync(true)}
                    disabled={!!opsLoading}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-info/20 text-info text-xs font-medium rounded-xl disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-stripe-dry' ? '…' : 'Stripe sync (dry-run)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileStripeSync(false)}
                    disabled={!!opsLoading}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-warning/25 text-warning text-xs font-medium rounded-xl disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-stripe-run' ? '…' : 'Stripe sync (aplicar)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileCloseNoPi(true)}
                    disabled={!!opsLoading}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/90 text-xs font-medium rounded-xl hover:bg-muted/40 disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-close-dry' ? '…' : 'Fechar sem PI (dry-run)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileCloseNoPi(false)}
                    disabled={!!opsLoading}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-destructive/20 text-destructive text-xs font-medium rounded-xl disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-close-run' ? '…' : 'Fechar sem PI (aplicar)'}
                  </button>
                </div>
                {reconcilePreview ? (
                  <div className="space-y-2">
                    <p className="text-xs text-foreground/80">
                      candidatos={reconcilePreview.count} · request_id={reconcilePreview.request_id ?? '—'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyAdminClipboard('SQL', reconcilePreview.select_sql)}
                        className="px-2 py-1 text-xs rounded-lg border border-border bg-background hover:bg-muted/40"
                      >
                        Copiar SQL
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void copyAdminClipboard('JSON', JSON.stringify(reconcilePreview.candidates, null, 2))
                        }
                        className="px-2 py-1 text-xs rounded-lg border border-border bg-background hover:bg-muted/40"
                      >
                        Copiar candidatos (JSON)
                      </button>
                    </div>
                    <pre className="text-xs text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {reconcilePreview.select_sql}
                    </pre>
                  </div>
                ) : null}
                {reconcileRun ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                      <p className="text-xs font-medium text-foreground/90">Última execução POST</p>
                      <button
                        type="button"
                        onClick={() => void copyAdminClipboard('resposta', JSON.stringify(reconcileRun, null, 2))}
                        className="px-2 py-1 text-xs rounded-lg border border-border bg-background hover:bg-muted/40"
                      >
                        Copiar JSON
                      </button>
                    </div>
                    <pre className="text-xs text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(reconcileRun, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Pagamentos em processing (saúde)</p>
                <button
                  type="button"
                  onClick={() => void fetchHealth()}
                  disabled={!!opsLoading}
                  className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-xs rounded-xl hover:bg-muted/40 disabled:opacity-50"
                >
                  Actualizar saúde
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Dados da mesma leitura que a tab Saúde. Links Stripe só com <span className="font-mono">pi_…</span>{' '}
                (abre dashboard; não expõe segredos).
              </p>
              {health && health.stuck_payments.length > OPS_STUCK_PAYMENTS_PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-foreground/85">
                  <span>
                    A mostrar{' '}
                    <span className="font-medium tabular-nums">
                      {opsStuckPaymentsPageData.from}–{opsStuckPaymentsPageData.to}
                    </span>{' '}
                    de {opsStuckPaymentsPageData.total} · página{' '}
                    <span className="font-mono tabular-nums">
                      {opsStuckPaymentsPage + 1}/{opsStuckPaymentsPageData.maxPage + 1}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={opsStuckPaymentsPage <= 0}
                      onClick={() => setOpsStuckPaymentsPage((p: any) => Math.max(0, p - 1))}
                      className="px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={opsStuckPaymentsPage >= opsStuckPaymentsPageData.maxPage}
                      onClick={() =>
                        setOpsStuckPaymentsPage((p: any) =>
                          Math.min(opsStuckPaymentsPageData.maxPage, p + 1)
                        )
                      }
                      className="px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Seguinte
                    </button>
                  </span>
                </div>
              ) : null}
              {!health ? (
                <p className="text-xs text-muted-foreground">A carregar saúde…</p>
              ) : health.stuck_payments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum pagamento stuck nesta leitura.</p>
              ) : (
                <ul className="space-y-2">
                  {opsStuckPaymentsPageData.slice.map((row: any, i: any) => {
                    const tid = tripIdFromHealthRow(row)
                    const piRaw = row.stripe_payment_intent_id
                    const pi = typeof piRaw === 'string' && piRaw.startsWith('pi_') ? piRaw.trim() : null
                    const stripeUrls = pi ? stripePaymentIntentDashboardUrls(pi) : null
                    const rowKey = String(row.id ?? row.trip_id ?? `idx-${opsStuckPaymentsPage}-${i}`)
                    return (
                      <li
                        key={`stuck-pay-${opsStuckPaymentsPage}-${rowKey}`}
                        className="rounded-lg border border-border/80 bg-background p-3 space-y-2"
                      >
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                          {tid ? (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90"
                              onClick={() => syncAdminUrl({ tab: 'trips', tripId: tid })}
                            >
                              Abrir em Viagens
                            </button>
                          ) : null}
                          {stripeUrls ? (
                            <span className="flex flex-wrap gap-2 text-xs">
                              <a
                                href={stripeUrls.live}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-info underline underline-offset-2"
                              >
                                Stripe (live)
                              </a>
                              <a
                                href={stripeUrls.test}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-info underline underline-offset-2"
                              >
                                Stripe (test)
                              </a>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem PaymentIntent na API ainda.</span>
                          )}
                        </div>
                        <pre className="text-xs text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-28 overflow-y-auto">
                          {JSON.stringify(row, null, 2)}
                        </pre>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Recuperar motorista</p>
                <button
                  type="button"
                  onClick={() => void fetchHealth()}
                  disabled={!!opsLoading}
                  className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-xs rounded-xl hover:bg-muted/40 disabled:opacity-50"
                >
                  Actualizar saúde
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Força <span className="font-mono">is_available=true</span> para motorista bloqueado (sem viagem ativa).
                Lista a partir de <strong>saúde</strong> — motoristas offline há muito sem viagem.
              </p>
              {!health ? (
                <p className="text-xs text-muted-foreground">A carregar saúde…</p>
              ) : health.drivers_unavailable_too_long.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sem candidatos nesta leitura. Se o caso não aparecer, usa UUID manual abaixo.
                </p>
              ) : (
                <ul className="space-y-2">
                  {health.drivers_unavailable_too_long
                    .map((row: any, i: any) => {
                      const did = driverIdFromHealthUnavailableRow(row)
                      return did ? { did, i } : null
                    })
                    .filter((x: any): x is { did: string; i: number } => x !== null)
                    .map(({ did, i }: any) => (
                      <li
                        key={`recover-suggest-${did}-${i}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-background px-3 py-2"
                      >
                        <span className="font-mono text-xs text-foreground/90">{did.slice(0, 8)}…</span>
                        <button
                          type="button"
                          onClick={() => void runRecoverDriver(did)}
                          disabled={opsLoading === 'recover'}
                          className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-success text-success-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                        >
                          Recuperar
                        </button>
                      </li>
                    ))}
                </ul>
              )}
              <details className="rounded-lg border border-border/80 bg-muted/15 px-3 py-2">
                <summary className="text-xs cursor-pointer text-foreground/80 font-medium">
                  UUID manual (casos raros)
                </summary>
                <p className="text-xs text-muted-foreground mt-2 mb-2">
                  Só quando o motorista não aparece na lista de saúde.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recoverDriverId}
                    onChange={(e: any) => setRecoverDriverId(e.target.value)}
                    placeholder="driver_id (UUID)"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleRecoverDriver}
                    disabled={!!opsLoading || !recoverDriverId.trim()}
                    className="px-4 py-2 bg-success text-success-foreground rounded-lg text-sm disabled:opacity-50"
                  >
                    Recuperar
                  </button>
                </div>
              </details>
            </div>
          </div>
        </section>
    </>
  )
}
