import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchPartnerDriver,
  patchPartnerDriverAvailability,
  patchPartnerDriverStatus,
  type PartnerDriverRow,
} from '../../api/partner'

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
  const [d, setD] = useState<PartnerDriverRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const row = await fetchPartnerDriver(userId)
      setD(row)
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : 'Erro ao carregar motorista.')
      setD(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

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
