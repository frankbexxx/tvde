import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  fetchPartnerDrivers,
  fetchPartnerMetrics,
  partnerTripsExportUrl,
  type PartnerDriverRow,
  type PartnerMetrics,
} from '../../api/partner'

function locationLabel(d: PartnerDriverRow): string {
  const loc = d.last_location
  if (!loc) return 'Sem localização recente'
  return `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`
}

export function PartnerDashboard() {
  const { token } = useAuth()
  const [metrics, setMetrics] = useState<PartnerMetrics | null>(null)
  const [drivers, setDrivers] = useState<PartnerDriverRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [m, dr] = await Promise.all([fetchPartnerMetrics(), fetchPartnerDrivers()])
      setMetrics(m)
      setDrivers(dr)
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : 'Erro ao carregar dados da frota.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const downloadCsv = async () => {
    if (!token) return
    try {
      const res = await fetch(partnerTripsExportUrl(), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setError('Exportação CSV falhou.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'partner_trips_export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Exportação CSV falhou.')
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
      <h2 className="text-lg font-semibold text-foreground">Frota (partner)</h2>

      {loading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {metrics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Viagens hoje</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_today}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total viagens</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_total}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Concluídas</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_completed}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Canceladas</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_cancelled}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Motoristas ativos (GPS)</p>
            <p className="text-xl font-bold text-foreground">{metrics.active_drivers}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total motoristas</p>
            <p className="text-xl font-bold text-foreground">{metrics.total_drivers}</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-medium text-foreground">Motoristas</h3>
          <button
            type="button"
            onClick={() => void downloadCsv()}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            CSV viagens
          </button>
        </div>
        <ul className="space-y-2">
          {drivers.map((d) => (
            <li
              key={d.user_id}
              className="rounded-xl border border-border bg-card p-3 text-sm"
            >
              <p className="font-medium text-foreground">{d.user.name ?? '—'}</p>
              <p className="text-muted-foreground">
                Estado: {d.status}
                {d.is_available ? ' · disponível' : ' · indisponível'}
              </p>
              <p className="text-muted-foreground text-xs mt-1">{locationLabel(d)}</p>
            </li>
          ))}
        </ul>
        {!loading && drivers.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem motoristas nesta frota.</p>
        )}
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
