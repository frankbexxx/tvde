import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { apiFetch, type ApiError } from '../../api/client'
import { adminErrDetail, formatAdminApiDetail, promptGovernanceReason } from './adminDashboardHelpers'
import type { AdminDashboardTab } from './adminDashboardQuery'

export const USERS_PAGE_SIZE = 50

export interface AdminUser {
  id: string
  phone: string
  name: string
  role: string
  status: string
  requested_role: string | null
  has_driver_profile: boolean
}

/** Listagem admin de utilizadores: filtro, ordenação, paginação, edição, bulk (P7). */
export function useAdminUsersDirectory(opts: {
  token: string | null
  tab: AdminDashboardTab
  setError: Dispatch<SetStateAction<string | null>>
  setLoading: Dispatch<SetStateAction<boolean>>
  invalidateUserAudit: (userId: string) => void
}) {
  const { token, tab, setError, setLoading, invalidateUserAudit } = opts

  const [users, setUsers] = useState<AdminUser[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editOriginalName, setEditOriginalName] = useState('')
  const [editOriginalPhone, setEditOriginalPhone] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [usersHasMore, setUsersHasMore] = useState(false)
  const [usersLoadingMore, setUsersLoadingMore] = useState(false)
  const [usersSort, setUsersSort] = useState<'name' | 'role' | 'status'>('name')
  const [usersFilter, setUsersFilter] = useState('')
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Record<string, boolean>>({})
  const [blockConfirmId, setBlockConfirmId] = useState<string | null>(null)
  const [unblockConfirmId, setUnblockConfirmId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiFetch<AdminUser[]>(
        `/admin/users?limit=${USERS_PAGE_SIZE}&offset=0`,
        { token }
      )
      setUsers(data)
      setUsersHasMore(data.length === USERS_PAGE_SIZE)
      const allowedIds = new Set(data.map((u) => u.id))
      setBulkSelectedIds((prev) => {
        const next: Record<string, boolean> = {}
        for (const [id, on] of Object.entries(prev)) {
          if (on && allowedIds.has(id)) next[id] = true
        }
        return next
      })
      setError(null)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao carregar'))
    } finally {
      setLoading(false)
    }
  }, [token, setError, setLoading])

  const fetchUsersMore = useCallback(async () => {
    if (!token || !usersHasMore || usersLoadingMore) return
    setUsersLoadingMore(true)
    try {
      const offset = users.length
      const data = await apiFetch<AdminUser[]>(
        `/admin/users?limit=${USERS_PAGE_SIZE}&offset=${offset}`,
        { token }
      )
      setUsers((prev) => {
        const seen = new Set(prev.map((u) => u.id))
        return [...prev, ...data.filter((u) => !seen.has(u.id))]
      })
      setUsersHasMore(data.length === USERS_PAGE_SIZE)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao carregar mais'))
    } finally {
      setUsersLoadingMore(false)
    }
  }, [token, users.length, usersHasMore, usersLoadingMore, setError])

  const startEdit = (u: AdminUser) => {
    setError(null)
    setEditingId(u.id)
    const n = u.name || ''
    const p = u.phone
    setEditName(n)
    setEditPhone(p)
    setEditOriginalName(n.trim())
    setEditOriginalPhone(p.trim())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPhone('')
    setEditOriginalName('')
    setEditOriginalPhone('')
  }

  /** Ao sair da tab Utilizadores, limpar selecção em massa e edição — evita estado «pendurado» nas outras tabs. */
  useEffect(() => {
    if (tab !== 'users') {
      setBulkSelectedIds({})
      setDeleteConfirmId(null)
      setBlockConfirmId(null)
      setUnblockConfirmId(null)
      setEditingId(null)
      setEditName('')
      setEditPhone('')
      setEditOriginalName('')
      setEditOriginalPhone('')
    }
  }, [tab])

  const handleSaveUserName = async () => {
    if (!token || !editingId) return
    const next = editName.trim()
    if (next === editOriginalName.trim()) {
      setError('O nome não mudou em relação ao valor actual.')
      return
    }
    const prevLabel = editOriginalName.trim() || '(sem nome, mostra telefone)'
    if (
      !window.confirm(
        `Alterar o nome?\n\nDe: ${prevLabel}\nPara: ${next || '(vazio — o servidor pode repor o telefone como nome)'}`
      )
    ) {
      return
    }
    try {
      await apiFetch(`/admin/users/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: next || undefined }),
        token,
      })
      setEditOriginalName(next)
      setError(null)
      invalidateUserAudit(editingId)
      await fetchUsers()
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleSaveUserPhone = async () => {
    if (!token || !editingId) return
    const next = editPhone.trim()
    if (next === editOriginalPhone.trim()) {
      setError('O telefone não mudou em relação ao valor actual.')
      return
    }
    const typed = window.prompt(
      `Alterar telefone de ${editOriginalPhone} para ${next}.\n\nPara confirmar, escreve exactamente: ALTERAR_TELEFONE`
    )
    if (typed?.trim() !== 'ALTERAR_TELEFONE') return
    const gr = promptGovernanceReason('Motivo de auditoria para mudança de telefone (SP-F, mín. 10 caracteres):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ phone: next, governance_reason: gr }),
        token,
      })
      setEditOriginalPhone(next)
      setEditPhone(next)
      setError(null)
      invalidateUserAudit(editingId)
      await fetchUsers()
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleDelete = async (userId: string) => {
    if (!token) return
    const reason = window.prompt(
      'Motivo da eliminação (mínimo 10 caracteres; fica em auditoria — SP-F). Só super_admin pode eliminar contas.'
    )
    if (!reason || reason.trim().length < 10) {
      setError('Eliminação cancelada: motivo com pelo menos 10 caracteres é obrigatório.')
      setDeleteConfirmId(null)
      return
    }
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: 'DELETE',
        token,
        body: JSON.stringify({ governance_reason: reason.trim() }),
      })
      setDeleteConfirmId(null)
      invalidateUserAudit(userId)
      await fetchUsers()
      setError(null)
    } catch (err) {
      const ae = err as ApiError
      const d = ae?.detail
      const msg =
        typeof d === 'string'
          ? formatAdminApiDetail(d)
          : Array.isArray(d)
            ? formatAdminApiDetail(d)
            : 'Erro ao eliminar'
      setError(msg)
    }
  }

  const handleBlockUser = async (userId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo para bloquear conta (SP-F, mín. 10 caracteres):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${userId}/block`, {
        method: 'POST',
        token,
        body: JSON.stringify({ governance_reason: gr }),
      })
      setBlockConfirmId(null)
      invalidateUserAudit(userId)
      setBulkSelectedIds((m) => {
        const next = { ...m }
        delete next[userId]
        return next
      })
      await fetchUsers()
      setError(null)
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleUnblockUser = async (userId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo para desbloquear conta (SP-F, mín. 10 caracteres):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${userId}/unblock`, {
        method: 'POST',
        token,
        body: JSON.stringify({ governance_reason: gr }),
      })
      setUnblockConfirmId(null)
      invalidateUserAudit(userId)
      await fetchUsers()
      setError(null)
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleClearUserPassword = async (userId: string) => {
    if (!token) return
    const typed = window.prompt(
      'Repor login BETA (password por defeito). Escreve exactamente: LIMPAR_SENHA'
    )
    if (typed?.trim() !== 'LIMPAR_SENHA') return
    const gr = promptGovernanceReason('Motivo para repor palavra-passe BETA (super_admin; SP-F):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${userId}/password/clear`, {
        method: 'POST',
        token,
        body: JSON.stringify({ confirmation: 'LIMPAR_SENHA', governance_reason: gr }),
      })
      setError(null)
      invalidateUserAudit(userId)
      await fetchUsers()
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleBulkBlock = async () => {
    if (!token) return
    const ids = Object.keys(bulkSelectedIds).filter((id) => bulkSelectedIds[id])
    if (ids.length === 0) return
    const expected = `BLOQUEAR_${ids.length}`
    const typed = window.prompt(
      `Para bloquear ${ids.length} conta(s) (reversível), escreve exactamente:\n${expected}`
    )
    if (typed?.trim() !== expected) return
    const reason = window.prompt(
      'Motivo do bloqueio em massa (mínimo 10 caracteres; fica em auditoria — SP-F). Só super_admin pode executar.'
    )
    if (!reason || reason.trim().length < 10) {
      setError('Bloqueio em massa cancelado: motivo com pelo menos 10 caracteres é obrigatório.')
      return
    }
    try {
      await apiFetch('/admin/users/bulk-block', {
        method: 'POST',
        token,
        body: JSON.stringify({
          user_ids: ids,
          confirmation: expected,
          governance_reason: reason.trim(),
        }),
      })
      for (const id of ids) invalidateUserAudit(id)
      setBulkSelectedIds({})
      await fetchUsers()
      setError(null)
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handlePromote = async (userId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo para promover a motorista (super_admin; SP-F):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${userId}/promote-driver`, {
        method: 'POST',
        token,
        body: JSON.stringify({ governance_reason: gr }),
      })
      invalidateUserAudit(userId)
      await fetchUsers()
      setError(null)
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleDemote = async (userId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo para repor passageiro (super_admin; SP-F):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${userId}/demote-driver`, {
        method: 'POST',
        token,
        body: JSON.stringify({ governance_reason: gr }),
      })
      invalidateUserAudit(userId)
      await fetchUsers()
      setError(null)
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const filteredSortedUsers = useMemo(() => {
    const q = usersFilter.trim().toLowerCase()
    let list = users
    if (q) {
      list = users.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.status.toLowerCase().includes(q)
      )
    }
    const sorted = [...list]
    const byPhone = (a: AdminUser, b: AdminUser) => a.phone.localeCompare(b.phone)
    if (usersSort === 'name') {
      sorted.sort((a, b) => (a.name || a.phone).localeCompare(b.name || b.phone) || byPhone(a, b))
    } else if (usersSort === 'role') {
      sorted.sort((a, b) => a.role.localeCompare(b.role) || byPhone(a, b))
    } else {
      sorted.sort((a, b) => a.status.localeCompare(b.status) || byPhone(a, b))
    }
    return sorted
  }, [users, usersFilter, usersSort])

  const driverUsers = useMemo(
    () => users.filter((u) => u.has_driver_profile || u.role === 'driver'),
    [users]
  )

  return {
    users,
    editingId,
    editName,
    editPhone,
    editOriginalName,
    editOriginalPhone,
    deleteConfirmId,
    usersHasMore,
    usersLoadingMore,
    usersSort,
    usersFilter,
    bulkSelectedIds,
    blockConfirmId,
    unblockConfirmId,
    setEditName,
    setEditPhone,
    setUsersSort,
    setUsersFilter,
    setBulkSelectedIds,
    setDeleteConfirmId,
    setBlockConfirmId,
    setUnblockConfirmId,
    fetchUsers,
    fetchUsersMore,
    filteredSortedUsers,
    driverUsers,
    startEdit,
    cancelEdit,
    handleSaveUserName,
    handleSaveUserPhone,
    handleDelete,
    handleBlockUser,
    handleUnblockUser,
    handleClearUserPassword,
    handleBulkBlock,
    handlePromote,
    handleDemote,
  }
}