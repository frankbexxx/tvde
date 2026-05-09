import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import {
  getAdminPhase0,
  getMetrics,
  getSystemHealth,
  getUsageSummary,
  runOfferExpiry,
  runTimeouts,
  type AdminMetricsResponse,
  type AdminPhase0Response,
  type AdminUsageSummaryResponse,
  type SystemHealthResponse,
} from '../../api/admin'
import { adminErrDetail, promptGovernanceReason } from './adminDashboardHelpers'

/**
 * Métricas, resumo de uso, saúde do sistema e operações SP-F de timeouts / offer-expiry / phase0 (P5).
 * Comportamento espelha o bloco original em `AdminDashboard.tsx`.
 */
export function useAdminSystemPanels(opts: {
  token: string | null
  setError: Dispatch<SetStateAction<string | null>>
  setOpsLoading: Dispatch<SetStateAction<string | null>>
  fetchActiveTrips: () => Promise<void>
}): {
  metrics: AdminMetricsResponse | null
  usage: AdminUsageSummaryResponse | null
  health: SystemHealthResponse | null
  phase0: AdminPhase0Response | null
  fetchMetrics: () => Promise<void>
  fetchUsage: () => Promise<void>
  fetchHealth: () => Promise<void>
  handleFetchPhase0: () => Promise<void>
  handleRunTimeouts: () => Promise<void>
  handleRunOfferExpiry: () => Promise<void>
} {
  const { token, setError, setOpsLoading, fetchActiveTrips } = opts

  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null)
  const [usage, setUsage] = useState<AdminUsageSummaryResponse | null>(null)
  const [health, setHealth] = useState<SystemHealthResponse | null>(null)
  const [phase0, setPhase0] = useState<AdminPhase0Response | null>(null)

  const fetchMetrics = useCallback(async () => {
    if (!token) return
    try {
      const m = await getMetrics(token)
      setMetrics(m)
    } catch {
      setMetrics(null)
    }
  }, [token])

  const fetchUsage = useCallback(async () => {
    if (!token) return
    try {
      const u = await getUsageSummary(token)
      setUsage(u)
    } catch {
      setUsage(null)
    }
  }, [token])

  const fetchHealth = useCallback(async () => {
    if (!token) return
    try {
      const h = await getSystemHealth(token)
      setHealth(h)
    } catch {
      setHealth(null)
    }
  }, [token])

  const handleRunTimeouts = useCallback(async () => {
    if (!token) return
    const gr = promptGovernanceReason(
      'Motivo para correr timeouts (SP-F). Requer sessão super_admin; mín. 10 caracteres.'
    )
    if (!gr) return
    setOpsLoading('timeouts')
    try {
      await runTimeouts(token, gr)
      setError(null)
      await fetchActiveTrips()
      await fetchMetrics()
    } catch (err) {
      setError(adminErrDetail(err, 'Erro timeouts'))
    } finally {
      setOpsLoading(null)
    }
  }, [token, setError, setOpsLoading, fetchActiveTrips, fetchMetrics])

  const handleRunOfferExpiry = useCallback(async () => {
    if (!token) return
    const gr = promptGovernanceReason(
      'Motivo para expirar ofertas / redispatch (SP-F). Requer super_admin; mín. 10 caracteres.'
    )
    if (!gr) return
    setOpsLoading('offer-expiry')
    try {
      await runOfferExpiry(token, gr)
      setError(null)
      await fetchActiveTrips()
      await fetchMetrics()
    } catch (err) {
      setError(adminErrDetail(err, 'Erro offer-expiry'))
    } finally {
      setOpsLoading(null)
    }
  }, [token, setError, setOpsLoading, fetchActiveTrips, fetchMetrics])

  const handleFetchPhase0 = useCallback(async () => {
    if (!token) return
    setOpsLoading('phase0')
    try {
      const d = await getAdminPhase0(token)
      setPhase0(d)
      setError(null)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro fase0'))
    } finally {
      setOpsLoading(null)
    }
  }, [token, setError, setOpsLoading])

  return {
    metrics,
    usage,
    health,
    phase0,
    fetchMetrics,
    fetchUsage,
    fetchHealth,
    handleFetchPhase0,
    handleRunTimeouts,
    handleRunOfferExpiry,
  }
}
