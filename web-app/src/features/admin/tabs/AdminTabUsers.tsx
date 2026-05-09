import { isBackofficeStaffRole } from '../../../context/AuthContext'

type AdminTabUsersProps = Record<string, any>

export function AdminTabUsers(props: AdminTabUsersProps) {
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

  return (
    <>
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Gestão de Utilizadores</h2>
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
                      onChange={(e: any) => setUsersFilter(e.target.value)}
                      placeholder="Nome, telefone, papel…"
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Ordenar</label>
                    <select
                      value={usersSort}
                      onChange={(e: any) => setUsersSort(e.target.value as 'name' | 'role' | 'status')}
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
                      const selectable = filteredSortedUsers.filter((u: any) => !isBackofficeStaffRole(u.role))
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
                    disabled={Object.keys(bulkSelectedIds).filter((id: any) => bulkSelectedIds[id]).length === 0}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-warning text-warning-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                  >
                    Bloquear seleccionados (reversível)
                  </button>
                </div>
              </div>
              <ul className="space-y-3">
                {filteredSortedUsers.map((u: any) => (
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
                            onChange={(e: any) => setEditName(e.target.value)}
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
                            onChange={(e: any) => setEditPhone(e.target.value)}
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
                            Palavra-passe (login BETA)
                          </p>
                          {isSuperAdminSession ? (
                            <>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Acção dedicada: remove o hash da palavra-passe para o utilizador voltar ao fluxo por
                                defeito. Não mistura com nome nem telefone — vais confirmar com{' '}
                                <code className="rounded bg-muted px-1 py-0.5 text-foreground/90">LIMPAR_SENHA</code> e
                                um motivo de auditoria (≥10 caracteres).
                              </p>
                              <button
                                type="button"
                                onClick={() => void handleClearUserPassword(editingId)}
                                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-muted text-foreground text-sm rounded-lg border border-border hover:bg-muted/80"
                              >
                                Repor palavra-passe a pedido…
                              </button>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Só uma sessão <code className="text-foreground/90">super_admin</code> pode repor a
                              palavra-passe BETA. O teu papel actual não inclui esta acção.
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
                                onChange={(e: any) =>
                                  setBulkSelectedIds((m: any) => ({
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
                                {deleteConfirmId === u.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(u.id)}
                                      className="px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded"
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(u.id)}
                                    className="px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded hover:opacity-90"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    {!isBackofficeStaffRole(u.role) && (
                      <details
                        className="mt-3 rounded-xl border border-border/80 bg-background/40 px-3 py-2"
                        onToggle={async (e: any) => {
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
                              {userAuditRows[u.id].map((row: any) => (
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
    </>
  )
}
