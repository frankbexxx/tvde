import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { isBackofficeStaffRole } from '../../../context/AuthContext'
import type { AdminAuditTrailItem } from '../../../api/admin'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import type { AdminUser } from '../useAdminUsersDirectory'

export type AdminTabUsersProps = {
  blockConfirmId: string | null
  bulkSelectedIds: Record<string, boolean>
  cancelEdit: () => void
  deleteConfirmId: string | null
  editName: string
  editOriginalName: string
  editOriginalPhone: string
  editPhone: string
  editingId: string | null
  fetchUsersMore: () => void | Promise<void>
  filteredSortedUsers: AdminUser[]
  handleBlockUser: (userId: string) => void | Promise<void>
  handleBulkBlock: () => void | Promise<void>
  handleClearUserPassword: (userId: string, governanceReason: string) => Promise<true | string> | true | string
  handleDelete: (userId: string, governanceReason: string) => Promise<true | string> | true | string
  handleDemote: (userId: string) => void | Promise<void>
  handlePromote: (userId: string) => void | Promise<void>
  handleSaveUserName: () => void | Promise<void>
  handleSaveUserPhone: () => void | Promise<void>
  handleUnblockUser: (userId: string) => void | Promise<void>
  isSuperAdminSession: boolean
  loadUserAuditTrailIfNeeded: (userId: string) => void | Promise<void>
  setBlockConfirmId: Dispatch<SetStateAction<string | null>>
  setBulkSelectedIds: Dispatch<SetStateAction<Record<string, boolean>>>
  setDeleteConfirmId: Dispatch<SetStateAction<string | null>>
  setEditName: Dispatch<SetStateAction<string>>
  setEditPhone: Dispatch<SetStateAction<string>>
  setUnblockConfirmId: Dispatch<SetStateAction<string | null>>
  setUsersFilter: Dispatch<SetStateAction<string>>
  setUsersSort: Dispatch<SetStateAction<'name' | 'role' | 'status'>>
  startEdit: (u: AdminUser) => void
  token: string | null
  unblockConfirmId: string | null
  userAuditError: Record<string, string>
  userAuditLoading: string | null
  userAuditRows: Record<string, AdminAuditTrailItem[]>
  users: AdminUser[]
  usersFilter: string
  usersHasMore: boolean
  usersLoadingMore: boolean
  usersSort: 'name' | 'role' | 'status'
}

const KNOWN_ROLES = new Set(['passenger', 'driver', 'partner', 'admin'])

function accountWho(user: AdminUser): string {
  const name = user.name.trim()
  if (name && name !== user.phone) return `${name} (${user.phone})`
  return user.phone
}

function AccountActionDialog(props: {
  open: boolean
  title: string
  body: string
  reason: string
  reasonLabel: string
  reasonHint: string
  error: string | null
  busy: boolean
  cancelLabel: string
  confirmLabel: string
  confirmingLabel: string
  testId: string
  onReason: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog open={props.open} onOpenChange={(open) => { if (!open) props.onCancel() }}>
      <DialogContent
        data-testid={props.testId}
        className="max-w-[min(100vw-1.5rem,28rem)]"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          cancelRef.current?.focus()
        }}
        onEscapeKeyDown={(event) => {
          if (props.busy) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (props.busy) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription className="text-foreground break-words">{props.body}</DialogDescription>
        </DialogHeader>
        <label className="block text-sm font-medium text-foreground">
          {props.reasonLabel}
          <textarea
            value={props.reason}
            onChange={(event) => props.onReason(event.target.value)}
            data-testid={`${props.testId}-reason`}
            disabled={props.busy}
            className="mt-1 w-full min-h-11 px-3 py-2 border border-border rounded-lg text-base bg-background text-foreground"
          />
        </label>
        <p className="text-sm text-foreground/80">{props.reasonHint}</p>
        {props.error ? (
          <p className="text-sm text-destructive" role="alert" data-testid={`${props.testId}-error`}>
            {props.error}
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            ref={cancelRef}
            type="button"
            data-testid={`${props.testId}-cancel`}
            disabled={props.busy}
            onClick={props.onCancel}
            className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted/40 disabled:opacity-60"
          >
            {props.cancelLabel}
          </button>
          <button
            type="button"
            data-testid={`${props.testId}-confirm`}
            disabled={props.busy}
            aria-busy={props.busy}
            onClick={props.onConfirm}
            className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-destructive text-destructive-foreground text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60"
          >
            {props.busy ? props.confirmingLabel : props.confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdminTabUsers(props: AdminTabUsersProps) {
  const { t } = useTranslation('admin')
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const deleteBusyRef = useRef(false)
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null)
  const [passwordReason, setPasswordReason] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const passwordBusyRef = useRef(false)
  const {
    blockConfirmId,
    bulkSelectedIds,
    cancelEdit,
    deleteConfirmId,
    editName,
    editOriginalName,
    editOriginalPhone,
    editPhone,
    editingId,
    fetchUsersMore,
    filteredSortedUsers,
    handleBlockUser,
    handleBulkBlock,
    handleClearUserPassword,
    handleDelete,
    handleDemote,
    handlePromote,
    handleSaveUserName,
    handleSaveUserPhone,
    handleUnblockUser,
    isSuperAdminSession,
    loadUserAuditTrailIfNeeded,
    setBlockConfirmId,
    setBulkSelectedIds,
    setDeleteConfirmId,
    setEditName,
    setEditPhone,
    setUnblockConfirmId,
    setUsersFilter,
    setUsersSort,
    startEdit,
    token,
    unblockConfirmId,
    userAuditError,
    userAuditLoading,
    userAuditRows,
    users,
    usersFilter,
    usersHasMore,
    usersLoadingMore,
    usersSort,
  } = props

  const roleLabel = (role: string) =>
    KNOWN_ROLES.has(role) ? t(`pendingApprove.roles.${role}`) : role

  const deleteUser = users.find((user) => user.id === deleteConfirmId) ?? null
  const passwordUser = users.find((user) => user.id === passwordUserId) ?? null

  const openDelete = (userId: string) => {
    setDeleteError(null)
    setDeleteReason('')
    setDeleteConfirmId(userId)
  }

  const closeDelete = () => {
    if (deleteBusyRef.current) return
    setDeleteConfirmId(null)
    setDeleteError(null)
  }

  const submitDelete = async () => {
    if (!deleteUser || deleteBusyRef.current) return
    const reason = deleteReason.trim()
    if (reason.length < 10) {
      setDeleteError(t('accountDelete.reasonShort'))
      return
    }
    deleteBusyRef.current = true
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      const result = await handleDelete(deleteUser.id, reason)
      if (result !== true) {
        setDeleteError(typeof result === 'string' ? result : t('accountDelete.error'))
        return
      }
      setDeleteConfirmId(null)
      setDeleteReason('')
    } finally {
      deleteBusyRef.current = false
      setDeleteBusy(false)
    }
  }

  const openPassword = (userId: string) => {
    setPasswordError(null)
    setPasswordReason('')
    setPasswordUserId(userId)
  }

  const closePassword = () => {
    if (passwordBusyRef.current) return
    setPasswordUserId(null)
    setPasswordError(null)
  }

  const submitPassword = async () => {
    if (!passwordUser || passwordBusyRef.current) return
    const reason = passwordReason.trim()
    if (reason.length < 10) {
      setPasswordError(t('passwordClear.reasonShort'))
      return
    }
    passwordBusyRef.current = true
    setPasswordBusy(true)
    setPasswordError(null)
    try {
      const result = await handleClearUserPassword(passwordUser.id, reason)
      if (result !== true) {
        setPasswordError(typeof result === 'string' ? result : t('passwordClear.error'))
        return
      }
      setPasswordUserId(null)
      setPasswordReason('')
    } finally {
      passwordBusyRef.current = false
      setPasswordBusy(false)
    }
  }

  return (
    <>
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('headings.users')}</h2>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            SP-F: <strong className="text-foreground/90">Eliminar conta</strong> e{' '}
            <strong className="text-foreground/90">Bloquear seleccionados</strong> exigem utilizador com papel{' '}
            <code className="text-foreground/90">super_admin</code> na BD e motivo de auditoria (prompt ao confirmar).
          </p>
          {users.length === 0 ? (
            <p className="text-muted-foreground">Nenhum utilizador.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[12rem]">
                    <label className="text-xs text-muted-foreground">Filtrar</label>
                    <input
                      type="search"
                      value={usersFilter}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setUsersFilter(e.target.value)}
                      placeholder="Nome, telefone, papel…"
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Ordenar</label>
                    <select
                      value={usersSort}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setUsersSort(e.target.value as 'name' | 'role' | 'status')
                      }
                      className="block mt-1 px-3 py-2 border rounded-lg text-sm bg-background"
                    >
                      <option value="name">Nome</option>
                      <option value="role">Papel</option>
                      <option value="status">Estado</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
                  <span>
                    A mostrar {filteredSortedUsers.length} de {users.length} carregados
                    {usersHasMore ? ' (há mais na BD)' : ''}.
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchUsersMore()}
                    disabled={!usersHasMore || usersLoadingMore}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground text-xs rounded-lg hover:bg-muted/40 disabled:opacity-50"
                  >
                    {usersLoadingMore ? 'A carregar…' : 'Carregar mais 50'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const selectable = filteredSortedUsers.filter((u) => !isBackofficeStaffRole(u.role))
                      const next: Record<string, boolean> = { ...bulkSelectedIds }
                      for (const u of selectable) next[u.id] = true
                      setBulkSelectedIds(next)
                    }}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-muted text-foreground text-xs rounded-lg hover:opacity-90"
                  >
                    Seleccionar filtrados (sem admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkSelectedIds({})}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-muted text-foreground text-xs rounded-lg hover:opacity-90"
                  >
                    Limpar selecção
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkBlock()}
                    disabled={Object.keys(bulkSelectedIds).filter((id) => bulkSelectedIds[id]).length === 0}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-warning text-warning-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                  >
                    Bloquear seleccionados (reversível)
                  </button>
                </div>
              </div>
              <ul className="space-y-3">
                {filteredSortedUsers.map((u) => (
                  <li
                    key={u.id}
                    className="bg-card border border-border rounded-2xl px-4 py-3 shadow-card hover:bg-muted/30 transition-colors"
                  >
                    {editingId === u.id ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-background/60 p-3 space-y-2">
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                            Nome (alcunha)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Valor quando abriste a edição:{' '}
                            <span className="font-mono text-foreground/90">{editOriginalName || '—'}</span>
                          </p>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                            placeholder="Nome ou alcunha"
                            className="w-full px-3 py-2 border rounded-lg text-base bg-background"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveUserName()}
                            className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90"
                          >
                            Guardar só o nome
                          </button>
                        </div>
                        <div className="rounded-xl border border-border bg-background/60 p-3 space-y-2">
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Telefone</p>
                          <p className="text-xs text-muted-foreground">
                            Valor quando abriste a edição:{' '}
                            <span className="font-mono text-foreground/90">{editOriginalPhone}</span>
                          </p>
                          <p className="text-xs text-warning">
                            Mudar o telefone afecta o login (OTP / BETA). Confirma com a palavra indicada no aviso.
                          </p>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditPhone(e.target.value)}
                            placeholder="+351912345678"
                            className="w-full px-3 py-2 border rounded-lg text-base bg-background"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveUserPhone()}
                            className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-warning text-warning-foreground text-sm font-medium rounded-lg hover:opacity-90"
                          >
                            Guardar só o telefone
                          </button>
                        </div>
                        <div className="rounded-xl border border-border bg-background/60 p-3 space-y-2">
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                            Palavra-passe
                          </p>
                          {isSuperAdminSession ? (
                            <>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {t('passwordClear.help')}
                              </p>
                              <button
                                type="button"
                                data-testid="admin-user-password-clear"
                                onClick={() => openPassword(editingId)}
                                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-muted text-foreground text-sm rounded-lg border border-border hover:bg-muted/80"
                              >
                                {t('passwordClear.button')}
                              </button>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {t('passwordClear.unavailable')}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-lg"
                        >
                          Fechar edição
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex gap-3 min-w-0">
                            {!isBackofficeStaffRole(u.role) ? (
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 shrink-0"
                                checked={!!bulkSelectedIds[u.id]}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                  setBulkSelectedIds((m) => ({
                                    ...m,
                                    [u.id]: e.target.checked,
                                  }))
                                }
                                aria-label={`Seleccionar ${u.name || u.phone}`}
                              />
                            ) : (
                              <span className="w-4 shrink-0" aria-hidden />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">
                                {u.name || u.phone}
                                {u.name && u.name !== u.phone && (
                                  <span className="text-muted-foreground text-sm ml-1">({u.phone})</span>
                                )}
                                {!u.name && <span className="text-muted-foreground text-sm ml-1">—</span>}
                              </p>
                              <p className="text-sm text-muted-foreground">{u.phone}</p>
                              <p className="text-xs text-muted-foreground">
                                {u.role} · {u.status}
                                {u.has_driver_profile && ' · motorista'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {u.role === 'passenger' && (
                              <button
                                type="button"
                                onClick={() => handlePromote(u.id)}
                                className="px-2 py-1 bg-success text-success-foreground text-xs rounded hover:opacity-90"
                              >
                                Motorista
                              </button>
                            )}
                            {u.role === 'driver' && (
                              <button
                                type="button"
                                onClick={() => handleDemote(u.id)}
                                className="px-2 py-1 bg-warning text-warning-foreground text-xs rounded hover:opacity-90"
                              >
                                Passageiro
                              </button>
                            )}
                            {!isBackofficeStaffRole(u.role) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(u)}
                                  className="px-2 py-1 bg-info text-info-foreground text-xs rounded hover:opacity-90"
                                >
                                  Editar
                                </button>
                                {u.status === 'blocked' ? (
                                  unblockConfirmId === u.id ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void handleUnblockUser(u.id)}
                                        className="px-2 py-1 bg-success text-success-foreground text-xs rounded"
                                      >
                                        Confirmar desbloqueio
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setUnblockConfirmId(null)}
                                        className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                                      >
                                        Cancelar
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBlockConfirmId(null)
                                        setUnblockConfirmId(u.id)
                                      }}
                                      className="px-2 py-1 bg-success/90 text-success-foreground text-xs rounded hover:opacity-90"
                                    >
                                      Desbloquear
                                    </button>
                                  )
                                ) : blockConfirmId === u.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => void handleBlockUser(u.id)}
                                      className="px-2 py-1 bg-warning text-warning-foreground text-xs rounded"
                                    >
                                      Confirmar bloqueio
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setBlockConfirmId(null)}
                                      className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUnblockConfirmId(null)
                                      setBlockConfirmId(u.id)
                                    }}
                                    className="px-2 py-1 bg-warning/80 text-foreground text-xs rounded hover:opacity-90"
                                  >
                                    Bloquear
                                  </button>
                                )}
                                <button
                                  type="button"
                                  data-testid={`admin-user-delete-${u.id}`}
                                  onClick={() => openDelete(u.id)}
                                  className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-destructive text-destructive-foreground text-xs rounded-lg hover:opacity-90"
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    {!isBackofficeStaffRole(u.role) && (
                      <details
                        className="mt-3 rounded-xl border border-border/80 bg-background/40 px-3 py-2"
                        onToggle={async (e: SyntheticEvent<HTMLDetailsElement>) => {
                          const el = e.currentTarget
                          if (!el.open || !token) return
                          await loadUserAuditTrailIfNeeded(u.id)
                        }}
                      >
                        <summary className="cursor-pointer text-xs font-medium text-foreground select-none">
                          Trilho admin (identidade · SP-E)
                        </summary>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                          Eventos <code className="text-foreground/90">admin.*</code> em que este utilizador é a entidade
                          (últimos 50). Útil para rever alterações de nome, telefone ou bloqueio.
                        </p>
                        {userAuditLoading === u.id ? (
                          <p className="mt-2 text-xs text-muted-foreground">A carregar…</p>
                        ) : null}
                        {userAuditError[u.id] ? (
                          <p className="mt-2 text-xs text-destructive">{userAuditError[u.id]}</p>
                        ) : null}
                        {userAuditRows[u.id] !== undefined && userAuditLoading !== u.id ? (
                          userAuditRows[u.id].length === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">Sem eventos registados.</p>
                          ) : (
                            <ul className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                              {userAuditRows[u.id].map((row) => (
                                <li
                                  key={row.id}
                                  className="rounded-lg border border-border/70 bg-card/50 p-2 text-xs space-y-1"
                                >
                                  <p className="font-medium text-foreground">{row.event_type}</p>
                                  <p className="text-muted-foreground">{row.occurred_at}</p>
                                  <pre className="text-[11px] text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                                    {JSON.stringify(row.payload, null, 2)}
                                  </pre>
                                </li>
                              ))}
                            </ul>
                          )
                        ) : null}
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <AccountActionDialog
          open={deleteUser !== null}
          title={t('accountDelete.title')}
          body={
            deleteUser
              ? t('accountDelete.body', {
                  who: accountWho(deleteUser),
                  role: roleLabel(deleteUser.role),
                })
              : ''
          }
          reason={deleteReason}
          reasonLabel={t('accountDelete.reason')}
          reasonHint={t('accountDelete.reasonHint')}
          error={deleteError}
          busy={deleteBusy}
          cancelLabel={t('accountDelete.cancel')}
          confirmLabel={t('accountDelete.confirm')}
          confirmingLabel={t('accountDelete.confirming')}
          testId="admin-user-delete-dialog"
          onReason={setDeleteReason}
          onCancel={closeDelete}
          onConfirm={() => { void submitDelete() }}
        />
        <AccountActionDialog
          open={passwordUser !== null}
          title={t('passwordClear.title')}
          body={passwordUser ? t('passwordClear.body', { who: accountWho(passwordUser) }) : ''}
          reason={passwordReason}
          reasonLabel={t('passwordClear.reason')}
          reasonHint={t('passwordClear.reasonHint')}
          error={passwordError}
          busy={passwordBusy}
          cancelLabel={t('passwordClear.cancel')}
          confirmLabel={t('passwordClear.confirm')}
          confirmingLabel={t('passwordClear.confirming')}
          testId="admin-user-password-dialog"
          onReason={setPasswordReason}
          onCancel={closePassword}
          onConfirm={() => { void submitPassword() }}
        />
    </>
  )
}
