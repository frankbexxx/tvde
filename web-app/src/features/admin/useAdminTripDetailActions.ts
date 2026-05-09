import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  getTripDetailAdmin,
  getTripDebug,
  assignTripAdmin,
  adminTripTransition,
  cancelTripAdmin,
  postAdminTripReconcilePaymentStripe,
  postAdminTripPaymentOpsNote,
  type TripDetailAdmin,
} from '../../api/admin'
import { adminErrDetail, promptGovernanceReason } from './adminDashboardHelpers'
import type { AdminDashboardUrlUpdate } from './useAdminDashboardNavigation'

/** Detalhe de viagem, debug e acções admin (P4); comportamento espelha o bloco original no dashboard. */
export function useAdminTripDetailActions(opts: {
  token: string | null
  selectedTripId: string | null
  syncAdminUrl: (next: AdminDashboardUrlUpdate) => void
  fetchActiveTrips: () => void | Promise<void>
  fetchHealth: () => void | Promise<void>
  setError: Dispatch<SetStateAction<string | null>>
}) {
  const { token, selectedTripId, syncAdminUrl, fetchActiveTrips, fetchHealth, setError } = opts

  const selectedTripForDetailRef = useRef<string | null>(selectedTripId)
  selectedTripForDetailRef.current = selectedTripId

  const [tripDetail, setTripDetail] = useState<TripDetailAdmin | null>(null)
  const [tripDetailLoading, setTripDetailLoading] = useState(false)
  const [tripDebug, setTripDebug] = useState<Record<string, unknown> | null>(null)
  const [tripDebugId, setTripDebugId] = useState<string | null>(null)
  const [tripActionLoading, setTripActionLoading] = useState<string | null>(null)
  const [paymentOpsNoteText, setPaymentOpsNoteText] = useState('')

  useEffect(() => {
    setPaymentOpsNoteText('')
  }, [selectedTripId])

  const fetchTripDetail = useCallback(
    async (tripId: string) => {
      if (!token) return
      setTripDetailLoading(true)
      setTripDetail(null)
      try {
        const d = await getTripDetailAdmin(tripId, token)
        if (selectedTripForDetailRef.current !== tripId) return
        setTripDetail(d)
      } catch {
        if (selectedTripForDetailRef.current !== tripId) return
        setTripDetail(null)
      } finally {
        if (selectedTripForDetailRef.current === tripId) {
          setTripDetailLoading(false)
        }
      }
    },
    [token]
  )

  const fetchTripDebug = useCallback(
    async (tripId: string) => {
      if (!token) return
      try {
        const d = await getTripDebug(tripId, token)
        setTripDebug(d)
        setTripDebugId(tripId)
      } catch {
        setTripDebug(null)
        setTripDebugId(null)
      }
    },
    [token]
  )

  const handleReconcileSingleTripPayment = async (tripId: string) => {
    if (!token) return
    if (
      !window.confirm(
        'Alinhar este pagamento ao PaymentIntent na Stripe? Se o PI estiver cancelado, o pagamento passa a failed; viagem cancelada ou failed mantém-se; viagem completed pode passar a failed.'
      )
    ) {
      return
    }
    const gr = promptGovernanceReason('Motivo SP-F para alinhar pagamento desta viagem com Stripe:')
    if (!gr) return
    setTripActionLoading(`${tripId}-reconcile-pay`)
    try {
      const out = await postAdminTripReconcilePaymentStripe(token, tripId, {
        governance_reason: gr,
        dry_run: false,
      })
      if (out.skipped) {
        window.alert(`Operação não aplicada: ${String(out.reason ?? '—')}\n\n${JSON.stringify(out, null, 2)}`)
      } else if (out.error) {
        window.alert(String(out.detail ?? JSON.stringify(out)))
      } else {
        window.alert(`OK — action=${String(out.action)}\ntrip_status=${String(out.trip_status_after ?? '—')}`)
      }
      setError(null)
      await fetchTripDetail(tripId)
      await fetchHealth()
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao alinhar pagamento com Stripe'))
    } finally {
      setTripActionLoading(null)
    }
  }

  const handlePaymentOpsNote = async (tripId: string) => {
    if (!token) return
    const note = paymentOpsNoteText.trim()
    if (note.length < 3) {
      window.alert('A nota precisa de pelo menos 3 caracteres.')
      return
    }
    if (
      !window.confirm(
        'Registar esta nota no audit trail? Não altera o Stripe nem o estado do pagamento — fica apenas registado para suporte e operações.'
      )
    ) {
      return
    }
    setTripActionLoading(`${tripId}-payment-ops-note`)
    try {
      const out = await postAdminTripPaymentOpsNote(token, tripId, { note })
      window.alert(`Nota registada. payment_id=${out.payment_id}`)
      setPaymentOpsNoteText('')
      setError(null)
      await fetchTripDetail(tripId)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao registar nota operacional'))
    } finally {
      setTripActionLoading(null)
    }
  }

  const handleAssignTrip = async (tripId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo para atribuir a viagem (SP-F, mín. 10 caracteres):')
    if (!gr) return
    setTripActionLoading(tripId)
    try {
      await assignTripAdmin(tripId, token, gr)
      setError(null)
      void fetchActiveTrips()
      setTripDetail(null)
      syncAdminUrl({ tab: 'trips', tripId: null })
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao atribuir'))
    } finally {
      setTripActionLoading(null)
    }
  }

  const handleCancelTrip = async (tripId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo do cancelamento admin (mín. 10; fica na viagem):')
    if (!gr) return
    setTripActionLoading(tripId)
    try {
      await cancelTripAdmin(tripId, token, gr)
      setError(null)
      void fetchActiveTrips()
      setTripDetail(null)
      syncAdminUrl({ tab: 'trips', tripId: null })
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao cancelar'))
    } finally {
      setTripActionLoading(null)
    }
  }

  const handleAdminTripTransition = async (
    tripId: string,
    toStatus: 'arriving' | 'ongoing',
    fromStatus?: string,
  ) => {
    if (!token) return
    const shortId = tripId.slice(0, 8)
    const header = `Viagem ${shortId}…${fromStatus ? ` (${fromStatus} → ${toStatus})` : ` → ${toStatus}`}`
    const body =
      toStatus === 'arriving'
        ? 'Forçar estado «arriving» (a caminho do passageiro)?'
        : 'Forçar «ongoing» (viagem iniciada)? Isto contorna a exigência de proximidade (~50 m) ao pickup.'
    if (!window.confirm(`${header}\n\n${body}`)) return
    const reason = window.prompt(
      'Motivo da intervenção (mínimo 10 caracteres; fica em auditoria):',
      'Correção operacional: motorista no local, app sem GPS preciso'
    )
    if (reason === null) return
    const trimmed = reason.trim()
    if (trimmed.length < 10) {
      window.alert('O motivo precisa de pelo menos 10 caracteres.')
      return
    }
    setTripActionLoading(tripId)
    try {
      await adminTripTransition(tripId, token, { to_status: toStatus, reason: trimmed })
      setError(null)
      await fetchActiveTrips()
      if (selectedTripId === tripId) {
        const d = await getTripDetailAdmin(tripId, token)
        setTripDetail(d)
      }
    } catch (err) {
      setError(adminErrDetail(err, 'Erro na transição admin'))
    } finally {
      setTripActionLoading(null)
    }
  }

  useEffect(() => {
    if (selectedTripId && token) {
      void fetchTripDetail(selectedTripId)
    } else {
      setTripDetailLoading(false)
      setTripDetail(null)
      setTripDebug(null)
      setTripDebugId(null)
    }
  }, [selectedTripId, token, fetchTripDetail])

  return {
    tripDetail,
    tripDetailLoading,
    tripDebug,
    tripDebugId,
    tripActionLoading,
    paymentOpsNoteText,
    setPaymentOpsNoteText,
    fetchTripDetail,
    fetchTripDebug,
    handleReconcileSingleTripPayment,
    handlePaymentOpsNote,
    handleAssignTrip,
    handleCancelTrip,
    handleAdminTripTransition,
  }
}
