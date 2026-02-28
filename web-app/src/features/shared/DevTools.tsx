import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useActivityLog } from '../../context/ActivityLogContext'
import { assignTripAdmin, runTimeoutsAdmin } from '../../api/trips'
import { apiFetch } from '../../api/client'

function errMsg(err: unknown): string {
  const e = err as { detail?: string; message?: string }
  return e?.detail ?? e?.message ?? String(err ?? 'Erro')
}

/**
 * Dev tools: assign trip, seed, auto-trip, run timeouts.
 * Collapsible - minimal footprint for non-technical users.
 */
export function DevTools({
  lastCreatedTripId,
  onAssigned,
}: {
  lastCreatedTripId: string | null
  onAssigned?: () => void
}) {
  const { tokens } = useAuth()
  const { addLog, setStatus } = useActivityLog()
  const [open, setOpen] = useState(false)

  const handleAssign = async () => {
    if (!lastCreatedTripId || !tokens?.admin) return
    setStatus('A atribuir viagem...')
    addLog('Clique: Assign', 'action')
    try {
      await assignTripAdmin(lastCreatedTripId, tokens.admin)
      addLog('Assign concluído', 'success')
      setStatus('Pronto')
      onAssigned?.()
    } catch (err) {
      addLog(`Erro Assign: ${errMsg(err)}`, 'error')
      setStatus('Erro ao atribuir')
    }
  }

  const handleRunTimeouts = async () => {
    if (!tokens?.admin) return
    setStatus('A executar timeouts...')
    addLog('Clique: Timeouts', 'action')
    try {
      const res = await runTimeoutsAdmin(tokens.admin)
      const total = res.assigned_to_requested + res.accepted_to_cancelled + res.ongoing_to_failed
      addLog(`Timeouts: ${total} ações`, 'success')
      setStatus('Pronto')
      onAssigned?.()
    } catch (err) {
      addLog(`Erro Timeouts: ${errMsg(err)}`, 'error')
      setStatus('Erro')
    }
  }

  const handleAutoTrip = async () => {
    setStatus('Auto-trip em execução...')
    addLog('Clique: Auto-trip', 'action')
    try {
      await apiFetch<{ trip_id: string }>('/dev/auto-trip', { method: 'POST' })
      addLog(`Auto-trip concluído`, 'success')
      setStatus('Pronto')
      onAssigned?.()
    } catch (err) {
      addLog(`Erro Auto-trip: ${errMsg(err)}`, 'error')
      setStatus('Erro')
    }
  }

  const handleSeed = async () => {
    setStatus('A executar seed...')
    addLog('Clique: Seed', 'action')
    try {
      await apiFetch('/dev/seed', { method: 'POST' })
      addLog('Seed concluído — a recarregar', 'success')
      window.location.reload()
    } catch (err) {
      addLog(`Erro Seed: ${errMsg(err)}`, 'error')
      setStatus('Erro ao executar seed')
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:text-slate-700"
      >
        {open ? '▼ Dev' : '▶ Dev'}
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-wrap gap-2">
          <button
            onClick={handleSeed}
            className="px-3 py-1.5 text-sm bg-amber-200 rounded-lg hover:bg-amber-300"
          >
            Seed
          </button>
          {tokens && (
            <>
              <button
                onClick={handleAutoTrip}
                className="px-3 py-1.5 text-sm bg-amber-200 rounded-lg hover:bg-amber-300"
              >
                Auto-trip
              </button>
              <button
                onClick={handleRunTimeouts}
                className="px-3 py-1.5 text-sm bg-orange-200 rounded-lg hover:bg-orange-300"
              >
                Timeouts
              </button>
            </>
          )}
          {tokens && lastCreatedTripId && (
            <button
              onClick={handleAssign}
              className="px-3 py-1.5 text-sm bg-emerald-200 rounded-lg hover:bg-emerald-300"
            >
              Assign
            </button>
          )}
        </div>
      )}
    </div>
  )
}
