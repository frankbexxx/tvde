import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useActivityLog } from '../../context/ActivityLogContext'
import { assignTripAdmin, runTimeoutsAdmin } from '../../api/trips'
import { apiFetch, API_BASE } from '../../api/client'
import { getExportFilename, getDeviceId, getCurrentRun, resetRun } from '../../utils/exportLogs'
import {
  isMockLocationModeEnabled,
  setMockLocationModeEnabled,
} from '../../dev/mockLocation'
import {
  isDemoLocationEnabled,
  setDemoLocationEnabled,
} from '../../hooks/useGeolocation'
import { log as devLog } from '../../utils/logger'

function errMsg(err: unknown): string {
  const e = err as { detail?: string; message?: string }
  return e?.detail ?? e?.message ?? String(err ?? 'Erro')
}

/** Diagnostic response types */
interface TripMatchingDiagnostic {
  trip_id?: string
  root_cause?: string
  step_1_drivers_with_location?: { count: number }
  step_2_drivers_in_radius?: { count: number }
  step_3_offers?: { count: number }
  error?: string
}

interface DriverEligibilityDiagnostic {
  driver_id?: string
  root_cause?: string
  has_location?: boolean
  is_available?: boolean
  pending_offers_count?: number
  error?: string
}

/**
 * Dev tools: assign trip, seed, auto-trip, run timeouts, diagnostics.
 * Collapsible - minimal footprint for non-technical users.
 */
export function DevTools({
  lastCreatedTripId,
  onAssigned,
  mode = 'passenger',
}: {
  lastCreatedTripId: string | null
  onAssigned?: () => void
  mode?: 'passenger' | 'driver'
}) {
  const { t } = useTranslation('driver')
  const { tokens } = useAuth()
  const { addLog, setStatus } = useActivityLog()
  const [open, setOpen] = useState(false)
  const [, setResetKey] = useState(0) // force re-render after Reset run

  const handleAssign = async () => {
    if (!lastCreatedTripId || !tokens?.admin) return
    setStatus(t('devTools.statusAssigning'))
    addLog('Clique: Assign', 'action')
    try {
      await assignTripAdmin(lastCreatedTripId, tokens.admin)
      addLog('Assign concluído', 'success')
      setStatus(t('devTools.statusReady'))
      onAssigned?.()
    } catch (err) {
      addLog(`Erro Assign: ${errMsg(err)}`, 'error')
      setStatus(t('devTools.statusAssignError'))
    }
  }

  const handleRunTimeouts = async () => {
    if (!tokens?.admin) return
    setStatus(t('devTools.statusRunningTimeouts'))
    addLog('Clique: Timeouts', 'action')
    try {
      const res = await runTimeoutsAdmin(tokens.admin)
      const total = res.assigned_to_requested + res.accepted_to_cancelled + res.ongoing_to_failed
      addLog(`Timeouts: ${total} ações`, 'success')
      setStatus(t('devTools.statusReady'))
      onAssigned?.()
    } catch (err) {
      addLog(`Erro Timeouts: ${errMsg(err)}`, 'error')
      setStatus(t('devTools.statusError'))
    }
  }

  const handleAutoTrip = async () => {
    setStatus(t('devTools.statusAutoTrip'))
    addLog('Clique: Auto-trip', 'action')
    try {
      await apiFetch<{ trip_id: string }>('/dev/auto-trip', { method: 'POST' })
      addLog(`Auto-trip concluído`, 'success')
      setStatus(t('devTools.statusReady'))
      onAssigned?.()
    } catch (err) {
      addLog(`Erro Auto-trip: ${errMsg(err)}`, 'error')
      setStatus(t('devTools.statusError'))
    }
  }

  const handleExportLogs = async () => {
    if (!tokens?.admin) return
    setStatus(t('devTools.statusExporting'))
    addLog('Clique: Export logs', 'action')
    try {
      const res = await fetch(`${API_BASE}/admin/export-logs?format=csv`, {
        headers: { Authorization: `Bearer ${tokens.admin}` },
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = getExportFilename()
      a.click()
      URL.revokeObjectURL(url)
      addLog('Logs exportados', 'success')
      setStatus(t('devTools.statusReady'))
    } catch (err) {
      addLog(`Erro Export: ${errMsg(err)}`, 'error')
      setStatus(t('devTools.statusError'))
    }
  }

  const handleResetRun = () => {
    resetRun()
    setResetKey((k) => k + 1)
    addLog(`Run resetado (device ${getDeviceId()})`, 'info')
    setStatus(t('devTools.statusReady'))
  }

  const handleToggleDemoLocation = () => {
    const next = !isDemoLocationEnabled()
    setDemoLocationEnabled(next)
    addLog(
      next ? 'Localização demo ativada (Oeiras, sem permissão)' : 'Localização demo desativada',
      'info'
    )
    window.location.reload()
  }

  const handleToggleMockLocation = () => {
    const next = !isMockLocationModeEnabled()
    setMockLocationModeEnabled(next)
    addLog(
      next
        ? 'Simulação de rota ativada (localStorage mockLocation=true) — recarregar'
        : 'Simulação de rota desativada',
      'info'
    )
    window.location.reload()
  }

  const handleSeed = async () => {
    setStatus(t('devTools.statusSeeding'))
    addLog('Clique: Seed', 'action')
    try {
      await apiFetch('/dev/seed', { method: 'POST' })
      addLog('Seed concluído — a recarregar', 'success')
      window.location.reload()
    } catch (err) {
      addLog(`Erro Seed: ${errMsg(err)}`, 'error')
      setStatus(t('devTools.statusSeedError'))
    }
  }

  const handleTripDiagnostic = async () => {
    if (!lastCreatedTripId) return
    setStatus(t('devTools.statusTripDiagnostic'))
    addLog('Clique: Diagnóstico viagem', 'action')
    try {
      const d = await apiFetch<TripMatchingDiagnostic>(`/debug/trip-matching/${lastCreatedTripId}`)
      if (d.error) {
        addLog(`Diagnóstico: ${d.error}`, 'error')
      } else {
        const rc = d.root_cause ?? '?'
        addLog(`Diagnóstico: ${rc}`, rc.startsWith('OK') ? 'success' : 'error')
        addLog(
          `  → drivers com localização: ${d.step_1_drivers_with_location?.count ?? 0}, ` +
          `no raio: ${d.step_2_drivers_in_radius?.count ?? 0}, ` +
          `ofertas: ${d.step_3_offers?.count ?? 0}`,
          'info'
        )
        devLog('Diagnóstico viagem:', d)
      }
      setStatus(t('devTools.statusReady'))
    } catch (err) {
      addLog(`Erro Diagnóstico: ${errMsg(err)}`, 'error')
      setStatus(t('devTools.statusError'))
    }
  }

  const handleDriverDiagnostic = async () => {
    setStatus(t('devTools.statusDriverDiagnostic'))
    addLog('Clique: Diagnóstico motorista', 'action')
    try {
      const d = await apiFetch<DriverEligibilityDiagnostic>('/debug/driver-eligibility')
      if (d.error) {
        addLog(`Diagnóstico: ${d.error}`, 'error')
      } else {
        const rc = d.root_cause ?? '?'
        addLog(`Diagnóstico: ${rc}`, rc.startsWith('OK') ? 'success' : 'error')
        addLog(
          `  → localização: ${d.has_location ? 'sim' : 'não'}, ` +
          `disponível: ${d.is_available ? 'sim' : 'não'}, ` +
          `ofertas pendentes: ${d.pending_offers_count ?? 0}`,
          'info'
        )
        devLog('Diagnóstico motorista:', d)
      }
      setStatus(t('devTools.statusReady'))
    } catch (err) {
      addLog(`Erro Diagnóstico: ${errMsg(err)}`, 'error')
      setStatus(t('devTools.statusError'))
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left text-sm font-medium text-foreground/85 hover:text-foreground transition-colors"
      >
        {open ? t('devTools.toggleOpen') : t('devTools.toggleClosed')}
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-border pt-3">
          {import.meta.env.DEV && mode === 'driver' && isMockLocationModeEnabled() ? (
            <p className="w-full text-xs text-muted-foreground">
              {t('devTools.mockRouteHint')}
            </p>
          ) : null}
          <button
            onClick={handleToggleDemoLocation}
            className={`px-3 py-1.5 text-sm rounded-lg ${isDemoLocationEnabled()
                ? 'bg-success/30 text-success'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            title={t('devTools.demoOeirasTitle')}
          >
            {isDemoLocationEnabled() ? t('devTools.demoOeirasOn') : t('devTools.demoOeirasOff')}
          </button>
          <button
            type="button"
            onClick={handleToggleMockLocation}
            className={`px-3 py-1.5 text-sm rounded-lg ${isMockLocationModeEnabled()
                ? 'bg-violet-500/25 text-violet-200 border border-violet-400/40'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            title={t('devTools.mockRouteTitle')}
          >
            {isMockLocationModeEnabled() ? t('devTools.mockRouteOn') : t('devTools.mockRouteOff')}
          </button>
          <button
            onClick={handleSeed}
            className="px-3 py-1.5 text-sm bg-warning/20 text-warning rounded-lg hover:bg-warning/30"
          >
            {t('devTools.seed')}
          </button>
          {tokens && (
            <>
              <button
                onClick={handleAutoTrip}
                className="px-3 py-1.5 text-sm bg-warning/20 text-warning rounded-lg hover:bg-warning/30"
              >
                {t('devTools.autoTrip')}
              </button>
              <button
                onClick={handleRunTimeouts}
                className="px-3 py-1.5 text-sm bg-warning/20 text-warning rounded-lg hover:bg-warning/30"
              >
                {t('devTools.timeouts')}
              </button>
              <button
                onClick={handleExportLogs}
                className="px-3 py-1.5 text-sm bg-info/20 text-info rounded-lg hover:bg-info/30"
              >
                {t('devTools.exportLogs')}
              </button>
              <button
                onClick={handleResetRun}
                className="px-3 py-1.5 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                title={`Device ${getDeviceId()}, run ${getCurrentRun()}`}
              >
                {t('devTools.resetRun')}
              </button>
            </>
          )}
          {tokens && lastCreatedTripId && (
            <button
              onClick={handleAssign}
              className="px-3 py-1.5 text-sm bg-success/20 text-success rounded-lg hover:bg-success/30"
            >
              {t('devTools.assign')}
            </button>
          )}
          {mode === 'passenger' && lastCreatedTripId && (
            <button
              onClick={handleTripDiagnostic}
              className="px-3 py-1.5 text-sm bg-secondary/20 text-secondary rounded-lg hover:bg-secondary/30"
              title={t('devTools.tripDiagnosticTitle')}
            >
              {t('devTools.tripDiagnostic')}
            </button>
          )}
          {mode === 'driver' && (
            <button
              onClick={handleDriverDiagnostic}
              className="px-3 py-1.5 text-sm bg-secondary/20 text-secondary rounded-lg hover:bg-secondary/30"
              title={t('devTools.driverDiagnosticTitle')}
            >
              {t('devTools.driverDiagnostic')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
