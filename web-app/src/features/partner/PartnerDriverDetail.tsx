import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  fetchPartnerDriver,
  fetchPartnerDriverZoneBudgetToday,
  fetchPartnerDriverZoneSessionOpen,
  fetchPartnerTrips,
  patchPartnerDriverAvailability,
  patchPartnerDriverDocuments,
  patchPartnerDriverStatus,
  postPartnerApproveZoneExtension,
  postPartnerGrantDriverZoneBudgetExtra,
  postPartnerMessage,
  partnerDriverDocumentFileUrl,
  removeDriverFromFleet,
  type PartnerDriverRow,
  type PartnerDriverZoneBudgetToday,
  type PartnerDriverZoneSession,
} from '../../api/partner'
import {
  driverDocumentLabel,
  driverDocumentStatusLabel,
  partnerDocumentsApprovedCount,
  REQUIRED_DRIVER_DOCUMENTS,
  type DriverDocumentStatus,
  type DriverRequiredDocument,
} from '../../services/driverDocuments'

const VEHICLE_DOCUMENT_KEYS: DriverRequiredDocument[] = ['inspecao_viatura']

function locationBlock(d: PartnerDriverRow) {
  const loc = d.last_location
  if (!loc) return <p className="text-muted-foreground text-sm">Sem localização recente.</p>
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-1">
      <p className="font-medium text-foreground">Última localização</p>
      <p className="text-muted-foreground font-mono text-xs">
        {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
      </p>
      <p className="text-muted-foreground text-xs">{loc.timestamp}</p>
    </div>
  )
}

export function PartnerDriverDetail() {
  const { userId } = useParams<{ userId: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [d, setD] = useState<PartnerDriverRow | null>(null)
  const [tripStats, setTripStats] = useState<{ completed: number; cancelled: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [zoneBudget, setZoneBudget] = useState<PartnerDriverZoneBudgetToday | null>(null)
  const [zoneBudgetLoading, setZoneBudgetLoading] = useState(false)
  const [zoneSession, setZoneSession] = useState<PartnerDriverZoneSession | null>(null)
  const [zoneSessionLoading, setZoneSessionLoading] = useState(false)
  const [zoneExtensionMinutes, setZoneExtensionMinutes] = useState(30)
  const [draftExpires, setDraftExpires] = useState<Partial<Record<DriverRequiredDocument, string>>>({})
  const [draftNotes, setDraftNotes] = useState<Partial<Record<DriverRequiredDocument, string>>>({})
  const [msgTitle, setMsgTitle] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [msgPriority, setMsgPriority] = useState<'normal' | 'high'>('normal')
  const [msgOk, setMsgOk] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const [row, trips] = await Promise.all([fetchPartnerDriver(userId), fetchPartnerTrips()])
      setD(row)
      const mine = trips.filter((t) => t.driver_id === userId)
      setTripStats({
        completed: mine.filter((t) => t.status === 'completed').length,
        cancelled: mine.filter((t) => t.status === 'cancelled').length,
      })
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : 'Erro ao carregar motorista.')
      setD(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId || !d || d.status !== 'approved') {
      setZoneBudget(null)
      setZoneBudgetLoading(false)
      return
    }
    let cancelled = false
    setZoneBudgetLoading(true)
    void fetchPartnerDriverZoneBudgetToday(userId)
      .then((b) => {
        if (!cancelled) setZoneBudget(b)
      })
      .catch(() => {
        if (!cancelled) setZoneBudget(null)
      })
      .finally(() => {
        if (!cancelled) setZoneBudgetLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, d])

  useEffect(() => {
    if (!userId || !d || d.status !== 'approved') {
      setZoneSession(null)
      setZoneSessionLoading(false)
      return
    }
    let cancelled = false
    setZoneSessionLoading(true)
    void fetchPartnerDriverZoneSessionOpen(userId)
      .then((s) => {
        if (!cancelled) setZoneSession(s)
      })
      .catch(() => {
        if (!cancelled) setZoneSession(null)
      })
      .finally(() => {
        if (!cancelled) setZoneSessionLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, d])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!d?.documents) return
    const e: Partial<Record<DriverRequiredDocument, string>> = {}
    const n: Partial<Record<DriverRequiredDocument, string>> = {}
    for (const key of REQUIRED_DRIVER_DOCUMENTS) {
      const row = d.documents![key]
      const exp = row?.expires_at
      e[key] = exp && exp.length >= 10 ? exp.slice(0, 10) : ''
      n[key] = row?.partner_note ?? ''
    }
    setDraftExpires(e)
    setDraftNotes(n)
  }, [d?.documents, d?.user_id])

  const run = async (label: string, fn: () => Promise<PartnerDriverRow>) => {
    setBusy(label)
    setError(null)
    try {
      const row = await fn()
      setD(row)
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : 'Erro.')
    } finally {
      setBusy(null)
    }
  }

  const fleetRemoveErrorPt = (detail: string | undefined): string => {
    if (detail === 'driver_has_active_trip') {
      return 'Motorista com viagem activa — conclui ou cancela antes de remover da frota.'
    }
    if (detail === 'not_found' || detail === 'driver_not_found') {
      return 'Motorista não encontrado nesta frota.'
    }
    return detail ?? 'Não foi possível remover da frota.'
  }

  const removeFromFleet = async () => {
    if (!userId) return
    if (!window.confirm('Remover este motorista da frota? Volta para a frota por defeito da plataforma.')) return
    setBusy('remove')
    setError(null)
    try {
      await removeDriverFromFleet(userId)
      navigate('/partner')
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(fleetRemoveErrorPt(typeof err?.detail === 'string' ? err.detail : undefined))
    } finally {
      setBusy(null)
    }
  }

  const kpiLine = useMemo(() => {
    if (!tripStats) return null
    return (
      <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-1">
        <p className="font-medium text-foreground">Viagens (frota)</p>
        <p className="text-muted-foreground">
          Concluídas: <span className="text-foreground font-medium">{tripStats.completed}</span>
          {' · '}
          Canceladas: <span className="text-foreground font-medium">{tripStats.cancelled}</span>
        </p>
      </div>
    )
  }, [tripStats])

  const runDoc = async (docKey: DriverRequiredDocument, status: string) => {
    if (!userId) return
    setBusy('doc')
    setError(null)
    try {
      const row = await patchPartnerDriverDocuments(userId, { [docKey]: { status } })
      setD(row)
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : 'Erro ao actualizar documentos.')
    } finally {
      setBusy(null)
    }
  }

  const saveDocMeta = async (docKey: DriverRequiredDocument) => {
    if (!userId) return
    setBusy('docMeta')
    setError(null)
    const expRaw = (draftExpires[docKey] ?? '').trim()
    const expires_at = expRaw ? `${expRaw}T12:00:00.000Z` : null
    const note = (draftNotes[docKey] ?? '').trim().slice(0, 2000) || null
    try {
      const row = await patchPartnerDriverDocuments(userId, {
        [docKey]: { expires_at, partner_note: note },
      })
      setD(row)
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : 'Erro ao guardar validade/nota.')
    } finally {
      setBusy(null)
    }
  }

  const driverOnlyDocKeys = REQUIRED_DRIVER_DOCUMENTS.filter((k) => !VEHICLE_DOCUMENT_KEYS.includes(k))

  const renderDocSection = (
    driver: PartnerDriverRow,
    title: string,
    hint: string,
    keys: DriverRequiredDocument[],
  ) => (
    <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-3">
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="space-y-2">
        {keys.map((key) => {
          const row = driver.documents?.[key]
          const st = row?.status ?? 'missing'
          const filePath = (row as { file_path?: string } | undefined)?.file_path
          const hasFile = Boolean(filePath)
          return (
            <div key={key} className="rounded-lg border border-border/70 bg-background px-3 py-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">{driverDocumentLabel(key)}</span>
                <span className="text-[11px] rounded-full border border-border px-2 py-0.5">
                  {driverDocumentStatusLabel(st as DriverDocumentStatus)}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1 text-[11px] text-muted-foreground">
                  <span>Validade (data)</span>
                  <input
                    type="date"
                    value={draftExpires[key] ?? ''}
                    disabled={busy !== null}
                    onChange={(ev) =>
                      setDraftExpires((prev) => ({ ...prev, [key]: ev.target.value }))
                    }
                    className="w-full min-h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                  />
                </label>
              </div>
              <label className="block space-y-1 text-[11px] text-muted-foreground">
                <span>Nota interna (frota)</span>
                <textarea
                  value={draftNotes[key] ?? ''}
                  disabled={busy !== null}
                  maxLength={2000}
                  rows={2}
                  onChange={(ev) =>
                    setDraftNotes((prev) => ({ ...prev, [key]: ev.target.value }))
                  }
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                />
              </label>
              {hasFile && userId ? (
                <a
                  href={partnerDriverDocumentFileUrl(userId, key)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline"
                  onClick={(e) => {
                    if (!token) return
                    e.preventDefault()
                    void fetch(partnerDriverDocumentFileUrl(userId, key), {
                      headers: { Authorization: `Bearer ${token}` },
                    })
                      .then((r) => r.blob())
                      .then((blob) => {
                        const url = URL.createObjectURL(blob)
                        window.open(url, '_blank', 'noopener,noreferrer')
                      })
                  }}
                >
                  Ver documento
                </a>
              ) : (
                <p className="text-[11px] text-muted-foreground">Sem ficheiro carregado pelo motorista.</p>
              )}
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void saveDocMeta(key)}
                className="w-full min-h-9 rounded-md border border-primary/40 bg-primary/10 text-xs font-semibold text-foreground disabled:opacity-50"
              >
                {busy === 'docMeta' ? '…' : 'Guardar validade e nota'}
              </button>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ['approved', 'Aprovar'],
                    ['pending_review', 'Revisão'],
                    ['rejected', 'Rejeitar'],
                    ['expired', 'Expirado'],
                    ['missing', 'Em falta'],
                  ] as const
                ).map(([s, label]) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy !== null || (s === 'approved' && !hasFile)}
                    title={s === 'approved' && !hasFile ? 'Aguarda upload do motorista' : undefined}
                    onClick={() => void runDoc(key, s)}
                    className="min-h-8 rounded-md border border-border px-2 text-[11px] font-medium disabled:opacity-50"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  if (loading) {
    return <p className="p-4 text-sm text-muted-foreground">A carregar…</p>
  }
  if (!d || !userId) {
    return (
      <div className="p-4 space-y-2">
        <p className="text-destructive text-sm">{error ?? 'Motorista não encontrado.'}</p>
        <Link to="/partner" className="text-primary text-sm underline">
          Voltar
        </Link>
      </div>
    )
  }

  const canToggleFleet = d.status === 'approved' || d.status === 'rejected'
  const approved = d.status === 'approved'

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
      <Link to="/partner" className="text-sm text-primary hover:underline">
        ← Frota
      </Link>
      <h2 className="text-lg font-semibold text-foreground">{d.user.name ?? 'Motorista'}</h2>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Telefone:</span>{' '}
          <span className="text-foreground">{d.user.phone ?? '—'}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Estado na frota:</span>{' '}
          <span className="text-foreground">{d.status}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Disponível (app):</span>{' '}
          <span className="text-foreground">{d.is_available ? 'sim' : 'não'}</span>
        </p>
      </div>

      {locationBlock(d)}

      {kpiLine}

      <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-2">
        <p className="font-medium text-foreground">Enviar aviso</p>
        <input
          type="text"
          value={msgTitle}
          onChange={(e) => setMsgTitle(e.target.value)}
          placeholder="Título"
          className="w-full rounded-lg border border-border px-2 py-2 text-sm"
        />
        <textarea
          value={msgBody}
          onChange={(e) => setMsgBody(e.target.value)}
          placeholder="Mensagem"
          rows={3}
          className="w-full rounded-lg border border-border px-2 py-2 text-sm"
        />
        <select
          value={msgPriority}
          onChange={(e) => setMsgPriority(e.target.value as 'normal' | 'high')}
          className="w-full rounded-lg border border-border px-2 py-2 text-sm"
        >
          <option value="normal">Prioridade normal</option>
          <option value="high">Prioridade alta</option>
        </select>
        <button
          type="button"
          disabled={busy !== null || !msgTitle.trim() || !msgBody.trim()}
          onClick={() => {
            void (async () => {
              setBusy('msg')
              setMsgOk(null)
              setError(null)
              try {
                await postPartnerMessage({
                  title: msgTitle.trim(),
                  body: msgBody.trim(),
                  priority: msgPriority,
                  driver_user_id: userId ?? null,
                })
                setMsgOk('Aviso enviado.')
                setMsgTitle('')
                setMsgBody('')
              } catch (e: unknown) {
                const err = e as { detail?: string }
                setError(typeof err?.detail === 'string' ? err.detail : 'Erro ao enviar aviso.')
              } finally {
                setBusy(null)
              }
            })()
          }}
          className="w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy === 'msg' ? '…' : 'Enviar aviso a este motorista'}
        </button>
        {msgOk ? <p className="text-xs text-success">{msgOk}</p> : null}
      </div>

      <p
        className="text-sm text-foreground/90"
        data-testid="partner-driver-docs-counter"
      >
        Aprovados: {partnerDocumentsApprovedCount(d.documents)} / {REQUIRED_DRIVER_DOCUMENTS.length}
      </p>

      {renderDocSection(
        d,
        'Viatura (documentos)',
        'Inspeção e elementos ligados ao veículo associado ao motorista.',
        VEHICLE_DOCUMENT_KEYS,
      )}
      {renderDocSection(
        d,
        'Motorista (documentos)',
        'Estados partilhados com a app do motorista; validade e notas centralizadas na frota.',
        driverOnlyDocKeys,
      )}

      {approved && (
        <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-2">
          <p className="font-medium text-foreground">Mudanças de zona (hoje)</p>
          {zoneBudgetLoading && (
            <p className="text-muted-foreground text-xs">A carregar orçamento…</p>
          )}
          {!zoneBudgetLoading && zoneBudget && (
            <>
              <p>
                <span className="text-muted-foreground">Usadas / máx.:</span>{' '}
                <span className="text-foreground font-medium">
                  {zoneBudget.used_changes} / {zoneBudget.max_changes}
                </span>
                {' — '}
                <span className="text-muted-foreground">restam {zoneBudget.remaining}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Dia {zoneBudget.service_date} ({zoneBudget.timezone})
              </p>
            </>
          )}
          {!zoneBudgetLoading && !zoneBudget && (
            <p className="text-xs text-muted-foreground">Orçamento não disponível.</p>
          )}
          <button
            type="button"
            disabled={busy !== null || zoneBudgetLoading}
            onClick={() => {
              if (!window.confirm('Autorizar +1 mudança de zona para o dia civil actual (Lisboa)?')) return
              void (async () => {
                setBusy('grantZone')
                setError(null)
                try {
                  const b = await postPartnerGrantDriverZoneBudgetExtra(userId, { extra_max_changes: 1 })
                  setZoneBudget(b)
                } catch (e: unknown) {
                  const err = e as { detail?: string }
                  setError(typeof err?.detail === 'string' ? err.detail : 'Erro ao autorizar.')
                } finally {
                  setBusy(null)
                }
              })()
            }}
            className="w-full rounded-xl border border-border bg-secondary/50 py-2 text-sm font-medium text-foreground disabled:opacity-50"
          >
            {busy === 'grantZone' ? '…' : '+1 mudança autorizada (hoje)'}
          </button>
          {zoneSessionLoading ? (
            <p className="text-xs text-muted-foreground">A carregar sessão de zona…</p>
          ) : zoneSession?.extension_requested &&
            zoneSession.extension_seconds_approved == null ? (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2 text-xs">
              <p className="font-medium text-foreground">Pedido de extensão de prazo</p>
              {zoneSession.extension_reason ? (
                <p className="text-foreground/85 whitespace-pre-wrap">{zoneSession.extension_reason}</p>
              ) : null}
              <p className="text-muted-foreground">
                Zona {zoneSession.zone_id} · prazo {new Date(zoneSession.deadline_at).toLocaleString('pt-PT')}
              </p>
              <label className="block space-y-1">
                <span>Minutos extra a aprovar</span>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={zoneExtensionMinutes}
                  onChange={(e) => setZoneExtensionMinutes(Number(e.target.value) || 30)}
                  className="w-full rounded-md border border-border px-2 py-1.5"
                />
              </label>
              <button
                type="button"
                disabled={busy !== null}
                data-testid="partner-approve-zone-extension"
                onClick={() => {
                  void (async () => {
                    setBusy('zoneExt')
                    setError(null)
                    try {
                      const updated = await postPartnerApproveZoneExtension(
                        userId,
                        zoneSession.id,
                        Math.max(60, zoneExtensionMinutes * 60)
                      )
                      setZoneSession(updated)
                    } catch (e: unknown) {
                      const err = e as { detail?: string }
                      setError(
                        typeof err?.detail === 'string'
                          ? err.detail
                          : 'Erro ao aprovar extensão.'
                      )
                    } finally {
                      setBusy(null)
                    }
                  })()
                }}
                className="w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {busy === 'zoneExt' ? '…' : 'Aprovar extensão'}
              </button>
            </div>
          ) : zoneSession?.extension_seconds_approved != null &&
            zoneSession.extension_seconds_approved > 0 ? (
            <p className="text-xs text-success">
              Extensão aprovada (+{Math.round(zoneSession.extension_seconds_approved / 60)} min).
            </p>
          ) : null}
        </div>
      )}

      {canToggleFleet && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Ativar / desativar na frota</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy !== null || d.status === 'approved'}
              onClick={() =>
                void run('en', () => patchPartnerDriverStatus(userId, true))
              }
              className="flex-1 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy === 'en' ? '…' : 'Ativar'}
            </button>
            <button
              type="button"
              disabled={busy !== null || d.status === 'rejected'}
              onClick={() =>
                void run('dis', () => patchPartnerDriverStatus(userId, false))
              }
              className="flex-1 rounded-xl border border-border bg-card py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy === 'dis' ? '…' : 'Desativar'}
            </button>
          </div>
        </div>
      )}

      {approved && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Forçar online / offline</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy !== null || d.is_available}
              onClick={() =>
                void run('on', () => patchPartnerDriverAvailability(userId, true))
              }
              className="flex-1 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy === 'on' ? '…' : 'Online'}
            </button>
            <button
              type="button"
              disabled={busy !== null || !d.is_available}
              onClick={() =>
                void run('off', () => patchPartnerDriverAvailability(userId, false))
              }
              className="flex-1 rounded-xl border border-border bg-card py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy === 'off' ? '…' : 'Offline'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <p className="text-sm font-medium text-foreground">Remover da frota</p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void removeFromFleet()}
          className="w-full rounded-xl border border-destructive/50 bg-destructive/5 py-2 text-sm font-medium text-destructive disabled:opacity-50"
        >
          {busy === 'remove' ? '…' : 'Remover da frota'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => void load()}
        className="w-full rounded-xl bg-secondary py-2 text-sm font-medium text-secondary-foreground"
      >
        Atualizar
      </button>
    </div>
  )
}
