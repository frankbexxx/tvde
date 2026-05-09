import type { Dispatch, SetStateAction } from 'react'
import { ADMIN_TRIP_CANCEL_STATUSES } from '../adminConstants'
import { AdminTripPaymentOpsNotePanel } from '../AdminTripPaymentOpsNotePanel'
import { CancellationReasonMuted } from '../../../components/trips/CancellationReasonMuted'
import { formatRelativeAgo, minutesSince } from '../../../utils/relativeTime'
import { stripePaymentIntentDashboardUrls } from '../../../utils/stripeDashboard'
import { tripDetailEligibleSinglePaymentReconcile } from '../adminDashboardHelpers'
import type { TripActiveItem, TripDetailAdmin } from '../../../api/admin'
import type { TripHistoryItem } from '../../../api/trips'
import type { AdminTripsListMode } from '../adminDashboardQuery'
import type { AdminDashboardUrlUpdate } from '../useAdminDashboardNavigation'

export type AdminTabTripsProps = {
  activeTrips: TripActiveItem[]
  canPostPaymentOpsNote: boolean
  fetchActiveTrips: () => void | Promise<void>
  fetchHistoryTrips: () => void | Promise<void>
  fetchTripDebug: (tripId: string) => void | Promise<void>
  handleAdminTripTransition: (
    tripId: string,
    toStatus: 'arriving' | 'ongoing',
    fromStatus?: string
  ) => void | Promise<void>
  handleAssignTrip: (tripId: string) => void | Promise<void>
  handleCancelTrip: (tripId: string) => void | Promise<void>
  handlePaymentOpsNote: (tripId: string) => void | Promise<void>
  handleReconcileSingleTripPayment: (tripId: string) => void | Promise<void>
  historyTrips: TripHistoryItem[]
  historyTripsError: string | null
  isSuperAdminSession: boolean
  paymentOpsNoteText: string
  selectTripsListMode: (mode: AdminTripsListMode) => void
  selectedTripId: string | null
  setPaymentOpsNoteText: Dispatch<SetStateAction<string>>
  syncAdminUrl: (next: AdminDashboardUrlUpdate) => void
  tripActionLoading: string | null
  tripDebug: Record<string, unknown> | null
  tripDebugId: string | null
  tripDetail: TripDetailAdmin | null
  tripDetailLoading: boolean
  tripOrphanFromDeepLink: boolean
  tripsListMode: AdminTripsListMode
}

export function AdminTabTrips(props: AdminTabTripsProps) {
  const {
    activeTrips,
    canPostPaymentOpsNote,
    fetchActiveTrips,
    fetchHistoryTrips,
    fetchTripDebug,
    handleAdminTripTransition,
    handleAssignTrip,
    handleCancelTrip,
    handlePaymentOpsNote,
    handleReconcileSingleTripPayment,
    historyTrips,
    historyTripsError,
    isSuperAdminSession,
    paymentOpsNoteText,
    selectTripsListMode,
    selectedTripId,
    setPaymentOpsNoteText,
    syncAdminUrl,
    tripActionLoading,
    tripDebug,
    tripDebugId,
    tripDetail,
    tripDetailLoading,
    tripOrphanFromDeepLink,
    tripsListMode,
  } = props

  return (
    <>
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Viagens</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Activas: pedido até em curso. Histórico: concluídas, canceladas ou falha (últimas 50 por ordem de
            actualização).
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => selectTripsListMode('active')}
              className={`inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 rounded-xl text-sm font-medium border ${tripsListMode === 'active'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
                }`}
            >
              Activas
            </button>
            <button
              type="button"
              onClick={() => selectTripsListMode('history')}
              className={`inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 rounded-xl text-sm font-medium border ${tripsListMode === 'history'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
                }`}
            >
              Histórico
            </button>
          </div>
          <div className="mb-3 flex items-center gap-2 text-xs text-foreground/60">
            <button
              type="button"
              onClick={() =>
                tripsListMode === 'active' ? void fetchActiveTrips() : void fetchHistoryTrips()
              }
              className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/85 text-sm font-medium rounded-xl hover:bg-muted/40"
              title="Força refresh imediato; polling automático continua a cada poucos segundos"
            >
              ↻ Atualizar lista
            </button>
            <span>Polling natural activo — usa o botão para refresh imediato.</span>
          </div>

          {tripOrphanFromDeepLink && selectedTripId ? (
            <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 px-4 py-4 shadow-card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Viagem aberta (fora da lista de activas)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vês isto ao vires da Saúde ou de um link — não precisas da viagem estar activa para rever ou depurar.
                  </p>
                  <p className="text-xs font-mono text-foreground/80 mt-2 break-all">{selectedTripId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'trips', tripId: null, tripsList: tripsListMode })}
                  className="shrink-0 inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground text-xs rounded-lg hover:bg-muted/40"
                >
                  Fechar viagem
                </button>
              </div>
              {tripDetailLoading ? (
                <p className="text-sm text-foreground/75">A carregar detalhe…</p>
              ) : tripDetail && tripDetail.trip_id === selectedTripId ? (
                <div className="space-y-2 rounded-xl border border-border bg-background/80 p-3">
                  <p className="text-sm text-foreground">
                    Estado: <span className="font-medium">{tripDetail.status}</span> · Estimativa:{' '}
                    {tripDetail.estimated_price} €
                    {tripDetail.final_price != null ? ` · Final: ${tripDetail.final_price} €` : null}
                  </p>
                  <CancellationReasonMuted reason={tripDetail.cancellation_reason} className="text-xs" />
                  {(() => {
                    const pi = tripDetail.stripe_payment_intent_id
                    if (typeof pi !== 'string' || !pi) return null
                    const urls = stripePaymentIntentDashboardUrls(pi)
                    return urls ? (
                      <div className="flex flex-wrap gap-2 items-center text-xs">
                        <span className="text-muted-foreground">Stripe:</span>
                        <a
                          href={urls.test}
                          target="_blank"
                          rel="noreferrer"
                          className="text-info underline font-medium"
                        >
                          Abrir PI (test)
                        </a>
                        <a
                          href={urls.live}
                          target="_blank"
                          rel="noreferrer"
                          className="text-info underline font-medium"
                        >
                          Abrir PI (live)
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Payment intent de teste/mock — sem página no Stripe Dashboard.
                      </p>
                    )
                  })()}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void fetchTripDebug(selectedTripId)}
                      className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-warning text-warning-foreground text-xs font-medium rounded-lg"
                    >
                      Debug
                    </button>
                    {isSuperAdminSession && tripDetailEligibleSinglePaymentReconcile(tripDetail) ? (
                      <button
                        type="button"
                        onClick={() => void handleReconcileSingleTripPayment(selectedTripId)}
                        disabled={tripActionLoading === `${selectedTripId}-reconcile-pay`}
                        className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-info/25 text-info text-xs font-medium rounded-lg border border-info/30 disabled:opacity-50"
                        title="Consulta Stripe e actualiza o pagamento processing (viagens completed, cancelled ou failed)."
                      >
                        {tripActionLoading === `${selectedTripId}-reconcile-pay`
                          ? 'A alinhar…'
                          : 'Alinhar pagamento (Stripe)'}
                      </button>
                    ) : null}
                    {tripDetail.status === 'requested' && (
                      <button
                        type="button"
                        onClick={() => void handleAssignTrip(selectedTripId)}
                        disabled={tripActionLoading === selectedTripId}
                        className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-success text-success-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        Atribuir
                      </button>
                    )}
                    {tripDetail.status === 'accepted' && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleAdminTripTransition(selectedTripId, 'arriving', tripDetail.status)
                        }
                        disabled={tripActionLoading === selectedTripId}
                        className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        Forçar arriving
                      </button>
                    )}
                    {tripDetail.status === 'arriving' && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleAdminTripTransition(selectedTripId, 'ongoing', tripDetail.status)
                        }
                        disabled={tripActionLoading === selectedTripId}
                        className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        Forçar ongoing
                      </button>
                    )}
                    {ADMIN_TRIP_CANCEL_STATUSES.includes(
                      tripDetail.status as (typeof ADMIN_TRIP_CANCEL_STATUSES)[number]
                    ) && (
                        <button
                          type="button"
                          onClick={() => void handleCancelTrip(selectedTripId)}
                          disabled={tripActionLoading === selectedTripId}
                          className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                        >
                          Cancelar viagem
                        </button>
                      )}
                  </div>
                  {selectedTripId ? (
                    <AdminTripPaymentOpsNotePanel
                      tripId={selectedTripId}
                      tripDetail={tripDetail}
                      enabled={canPostPaymentOpsNote}
                      draft={paymentOpsNoteText}
                      onDraftChange={setPaymentOpsNoteText}
                      onSubmit={() => void handlePaymentOpsNote(selectedTripId)}
                      submitting={tripActionLoading === `${selectedTripId}-payment-ops-note`}
                    />
                  ) : null}
                  {tripDebug && tripDebugId === selectedTripId && (
                    <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(tripDebug, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <p className="text-sm text-warning">
                  Não foi possível carregar o detalhe desta viagem (inexistente ou sem acesso).
                </p>
              )}
            </div>
          ) : null}

          {tripsListMode === 'active' && (
            <>
              {activeTrips.length === 0 && !tripOrphanFromDeepLink ? (
                <p className="text-foreground/75">Nenhuma viagem ativa.</p>
              ) : activeTrips.length > 0 ? (
                <ul className="space-y-3">
                  {activeTrips.map((t) => {
                    const ageMin = minutesSince(t.updated_at)
                    const stuckAccepted = t.status === 'accepted' && ageMin != null && ageMin >= 5
                    return (
                      <li
                        key={t.trip_id}
                        className={`bg-card border rounded-2xl px-4 py-3 shadow-card hover:bg-muted/30 transition-colors ${stuckAccepted ? 'border-warning/60' : 'border-border'
                          }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-medium text-foreground flex flex-wrap items-center gap-2">
                              <span>{t.trip_id.slice(0, 8)}… · {t.status}</span>
                              {stuckAccepted && (
                                <span
                                  className="inline-flex items-center rounded-full bg-warning/20 border border-warning/50 px-2 py-0.5 text-[11px] font-semibold text-warning"
                                  title="Potencial stuck: accepted há mais de 5 min sem progredir"
                                >
                                  stuck {Math.round(ageMin!)}′
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-foreground/75">
                              {t.origin_lat.toFixed(4)}, {t.origin_lng.toFixed(4)} →{' '}
                              {t.destination_lat.toFixed(4)}, {t.destination_lng.toFixed(4)}
                            </p>
                            <p className="text-xs text-foreground/70">
                              P: {t.passenger_id.slice(0, 8)}…
                              {t.driver_id ? <> · D: {t.driver_id.slice(0, 8)}…</> : <> · D: —</>}
                              {' · '}
                              <span title={t.updated_at ?? ''}>atualizado {formatRelativeAgo(t.updated_at)}</span>
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const nextId = selectedTripId === t.trip_id ? null : t.trip_id
                                syncAdminUrl({ tab: 'trips', tripId: nextId, tripsList: tripsListMode })
                              }}
                              className="px-2 py-1 bg-info text-info-foreground text-xs rounded"
                            >
                              {selectedTripId === t.trip_id ? 'Fechar' : 'Detalhe'}
                            </button>
                            {t.status === 'requested' && (
                              <button
                                type="button"
                                onClick={() => handleAssignTrip(t.trip_id)}
                                disabled={tripActionLoading === t.trip_id}
                                className="px-2 py-1 bg-success text-success-foreground text-xs rounded disabled:opacity-50"
                              >
                                Atribuir
                              </button>
                            )}
                            {t.status === 'accepted' && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleAdminTripTransition(t.trip_id, 'arriving', t.status)
                                }
                                disabled={tripActionLoading === t.trip_id}
                                className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded disabled:opacity-50"
                                title="Quando o motorista já está a caminho mas o estado API ficou em accepted"
                              >
                                → arriving
                              </button>
                            )}
                            {t.status === 'arriving' && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleAdminTripTransition(t.trip_id, 'ongoing', t.status)
                                }
                                disabled={tripActionLoading === t.trip_id}
                                className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded disabled:opacity-50"
                                title="Quando o pickup GPS bloqueia «Iniciar viagem» mas o motorista já está no local"
                              >
                                → ongoing
                              </button>
                            )}
                            {ADMIN_TRIP_CANCEL_STATUSES.includes(
                              t.status as (typeof ADMIN_TRIP_CANCEL_STATUSES)[number]
                            ) && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelTrip(t.trip_id)}
                                  disabled={tripActionLoading === t.trip_id}
                                  className="px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              )}
                          </div>
                        </div>
                        {selectedTripId === t.trip_id && (
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            <p className="text-xs text-foreground/85">
                              Estado (lista): <span className="font-medium text-foreground">{t.status}</span>
                            </p>
                            {tripDetailLoading ? (
                              <p className="text-xs text-foreground/70">A carregar detalhe…</p>
                            ) : tripDetail && tripDetail.trip_id === t.trip_id ? (
                              <>
                                <p className="text-xs text-foreground/75">
                                  Estimativa: {tripDetail.estimated_price} € · Status (API): {tripDetail.status}
                                  {tripDetail.final_price != null ? ` · Final: ${tripDetail.final_price} €` : null}
                                </p>
                                <CancellationReasonMuted reason={tripDetail.cancellation_reason} className="text-xs" />
                                {(() => {
                                  const pi = tripDetail.stripe_payment_intent_id
                                  if (typeof pi !== 'string' || !pi) return null
                                  const urls = stripePaymentIntentDashboardUrls(pi)
                                  return urls ? (
                                    <div className="flex flex-wrap gap-2 text-xs">
                                      <a
                                        href={urls.test}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-info underline"
                                      >
                                        Stripe (test)
                                      </a>
                                      <a
                                        href={urls.live}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-info underline"
                                      >
                                        Stripe (live)
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      PI mock/teste — sem link Stripe.
                                    </p>
                                  )
                                })()}
                              </>
                            ) : (
                              <p className="text-xs text-warning">
                                Não foi possível carregar o detalhe (rede, timeout ou viagem inexistente). Tenta
                                &quot;Atualizar&quot; na lista ou &quot;Debug&quot; abaixo.
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => fetchTripDebug(t.trip_id)}
                                className="px-2 py-1 bg-warning text-warning-foreground text-xs rounded"
                              >
                                Debug
                              </button>
                              {isSuperAdminSession && tripDetailEligibleSinglePaymentReconcile(tripDetail) ? (
                                <button
                                  type="button"
                                  onClick={() => void handleReconcileSingleTripPayment(t.trip_id)}
                                  disabled={tripActionLoading === `${t.trip_id}-reconcile-pay`}
                                  className="px-2 py-1 bg-info/25 text-info text-xs font-medium rounded border border-info/30 disabled:opacity-50"
                                  title="Consulta Stripe e actualiza o pagamento processing (viagens completed, cancelled ou failed)."
                                >
                                  {tripActionLoading === `${t.trip_id}-reconcile-pay`
                                    ? 'A alinhar…'
                                    : 'Alinhar pagamento (Stripe)'}
                                </button>
                              ) : null}
                            </div>
                            <AdminTripPaymentOpsNotePanel
                              tripId={t.trip_id}
                              tripDetail={tripDetail}
                              enabled={canPostPaymentOpsNote}
                              draft={paymentOpsNoteText}
                              onDraftChange={setPaymentOpsNoteText}
                              onSubmit={() => void handlePaymentOpsNote(t.trip_id)}
                              submitting={tripActionLoading === `${t.trip_id}-payment-ops-note`}
                            />
                            {tripDebug && tripDebugId === t.trip_id && (
                              <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                                {JSON.stringify(tripDebug, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : tripOrphanFromDeepLink ? (
                <p className="text-xs text-muted-foreground">
                  Lista de viagens activas vazia; o painel acima é a viagem que abriste por link.
                </p>
              ) : null}
            </>
          )}

          {tripsListMode === 'history' && (
            <>
              {historyTripsError ? (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/25 px-3 py-2 rounded-lg">
                  {historyTripsError}
                </p>
              ) : null}
              {!historyTripsError && historyTrips.length === 0 ? (
                <p className="text-foreground/75">
                  Nenhuma viagem no histórico recente (concluída, cancelada ou falha) nesta base de dados.
                </p>
              ) : historyTrips.length > 0 ? (
                <ul className="space-y-3">
                  {historyTrips.map((h) => (
                    <li
                      key={h.trip_id}
                      className="bg-card border border-border rounded-2xl px-4 py-3 shadow-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {h.trip_id.slice(0, 8)}… · {h.status}
                          </p>
                          <p className="text-sm text-foreground/75">
                            {h.origin_lat.toFixed(4)}, {h.origin_lng.toFixed(4)} →{' '}
                            {h.destination_lat.toFixed(4)}, {h.destination_lng.toFixed(4)}
                          </p>
                          <p className="text-xs text-foreground/70">
                            Fim:{' '}
                            {h.completed_at
                              ? new Date(h.completed_at).toLocaleString('pt-PT')
                              : '— (sem data de conclusão)'}
                            {h.final_price != null ? ` · ${h.final_price} €` : null}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextId = selectedTripId === h.trip_id ? null : h.trip_id
                            syncAdminUrl({ tab: 'trips', tripId: nextId, tripsList: tripsListMode })
                          }}
                          className="px-2 py-1 bg-info text-info-foreground text-xs rounded shrink-0"
                        >
                          {selectedTripId === h.trip_id ? 'Fechar' : 'Detalhe'}
                        </button>
                      </div>
                      {selectedTripId === h.trip_id && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          <p className="text-xs text-foreground/85">
                            Estado (lista): <span className="font-medium text-foreground">{h.status}</span>
                          </p>
                          <CancellationReasonMuted reason={h.cancellation_reason} className="text-xs" />
                          {tripDetailLoading ? (
                            <p className="text-xs text-foreground/70">A carregar detalhe…</p>
                          ) : tripDetail && tripDetail.trip_id === h.trip_id ? (
                            <>
                              <p className="text-xs text-foreground/75">
                                Estimativa: {tripDetail.estimated_price} € · Status (API): {tripDetail.status}
                                {tripDetail.final_price != null ? ` · Final: ${tripDetail.final_price} €` : null}
                              </p>
                              {(() => {
                                const pi = tripDetail.stripe_payment_intent_id
                                if (typeof pi !== 'string' || !pi) return null
                                const urls = stripePaymentIntentDashboardUrls(pi)
                                return urls ? (
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    <a
                                      href={urls.test}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-info underline"
                                    >
                                      Stripe (test)
                                    </a>
                                    <a
                                      href={urls.live}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-info underline"
                                    >
                                      Stripe (live)
                                    </a>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    PI mock/teste — sem link Stripe.
                                  </p>
                                )
                              })()}
                            </>
                          ) : (
                            <p className="text-xs text-warning">
                              Não foi possível carregar o detalhe (rede, timeout ou viagem inexistente). Tenta
                              &quot;Atualizar&quot; na lista ou &quot;Debug&quot; abaixo.
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => fetchTripDebug(h.trip_id)}
                              className="px-2 py-1 bg-warning text-warning-foreground text-xs rounded"
                            >
                              Debug
                            </button>
                            {isSuperAdminSession && tripDetailEligibleSinglePaymentReconcile(tripDetail) ? (
                              <button
                                type="button"
                                onClick={() => void handleReconcileSingleTripPayment(h.trip_id)}
                                disabled={tripActionLoading === `${h.trip_id}-reconcile-pay`}
                                className="px-2 py-1 bg-info/25 text-info text-xs font-medium rounded border border-info/30 disabled:opacity-50"
                                title="Consulta Stripe e actualiza o pagamento processing (viagens completed, cancelled ou failed)."
                              >
                                {tripActionLoading === `${h.trip_id}-reconcile-pay`
                                  ? 'A alinhar…'
                                  : 'Alinhar pagamento (Stripe)'}
                              </button>
                            ) : null}
                          </div>
                          <AdminTripPaymentOpsNotePanel
                            tripId={h.trip_id}
                            tripDetail={tripDetail}
                            enabled={canPostPaymentOpsNote}
                            draft={paymentOpsNoteText}
                            onDraftChange={setPaymentOpsNoteText}
                            onSubmit={() => void handlePaymentOpsNote(h.trip_id)}
                            submitting={tripActionLoading === `${h.trip_id}-payment-ops-note`}
                          />
                          {tripDebug && tripDebugId === h.trip_id && (
                            <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                              {JSON.stringify(tripDebug, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </section>
    </>
  )
}
