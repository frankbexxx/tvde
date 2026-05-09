import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminAlerts, getAdminAuditTrail, type AdminAlertsResponse, type AdminAuditTrailItem } from '../../api/admin'

/** Alertas operacionais globais + cache do trilho de auditoria por utilizador (P6). */
export function useAdminAlertsAndAudit(token: string | null): {
  adminAlerts: AdminAlertsResponse | null
  fetchAdminAlerts: () => Promise<void>
  userAuditRows: Record<string, AdminAuditTrailItem[]>
  userAuditLoading: string | null
  userAuditError: Record<string, string>
  invalidateUserAudit: (userId: string) => void
  loadUserAuditTrailIfNeeded: (userId: string) => Promise<void>
} {
  const [adminAlerts, setAdminAlerts] = useState<AdminAlertsResponse | null>(null)
  const [userAuditRows, setUserAuditRows] = useState<Record<string, AdminAuditTrailItem[]>>({})
  const [userAuditLoading, setUserAuditLoading] = useState<string | null>(null)
  const [userAuditError, setUserAuditError] = useState<Record<string, string>>({})

  const userAuditRowsRef = useRef(userAuditRows)
  userAuditRowsRef.current = userAuditRows

  const fetchAdminAlerts = useCallback(async () => {
    if (!token) return
    try {
      const a = await getAdminAlerts(token)
      setAdminAlerts(a)
    } catch {
      setAdminAlerts(null)
    }
  }, [token])

  const invalidateUserAudit = useCallback((userId: string) => {
    setUserAuditRows((m) => {
      const next = { ...m }
      delete next[userId]
      return next
    })
    setUserAuditError((m) => {
      const next = { ...m }
      delete next[userId]
      return next
    })
  }, [])

  const loadUserAuditTrailIfNeeded = useCallback(
    async (userId: string) => {
      if (!token) return
      if (userAuditRowsRef.current[userId] !== undefined) return
      setUserAuditLoading(userId)
      setUserAuditError((m) => {
        const next = { ...m }
        delete next[userId]
        return next
      })
      try {
        const rows = await getAdminAuditTrail(token, {
          entity_type: 'user',
          entity_id: userId,
          limit: 50,
        })
        setUserAuditRows((m) => ({ ...m, [userId]: rows }))
      } catch {
        setUserAuditError((m) => ({
          ...m,
          [userId]: 'Não foi possível carregar o trilho.',
        }))
      } finally {
        setUserAuditLoading(null)
      }
    },
    [token]
  )

  useEffect(() => {
    if (!token) {
      setAdminAlerts(null)
      setUserAuditRows({})
      setUserAuditLoading(null)
      setUserAuditError({})
    }
  }, [token])

  return {
    adminAlerts,
    fetchAdminAlerts,
    userAuditRows,
    userAuditLoading,
    userAuditError,
    invalidateUserAudit,
    loadUserAuditTrailIfNeeded,
  }
}
