type AdminTabDadosProps = Record<string, any>

export function AdminTabDados(props: AdminTabDadosProps) {
  const {
    copy,
    dataLoading,
    dataSearch,
    driversList,
    fetchDataVisibility,
    partners,
    setDataSearch,
    users,
  } = props

  return (
    <>
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Dados (visibilidade)</h2>
          <p className="text-sm text-foreground/75">
            IDs essenciais para operar o sistema — com botão de copiar.
          </p>
          <div className="space-y-2">
            <label className="block text-sm text-foreground/80" htmlFor="admin-data-search">
              Pesquisar (nome/telefone/UUID)
            </label>
            <input
              id="admin-data-search"
              type="search"
              value={dataSearch}
              onChange={(e: any) => setDataSearch(e.target.value)}
              placeholder="Filtrar…"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
            />
            <button
              type="button"
              onClick={() => void fetchDataVisibility()}
              disabled={dataLoading}
              className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40 disabled:opacity-50"
            >
              {dataLoading ? 'A carregar…' : 'Atualizar'}
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">Users</h3>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem utilizadores.</p>
            ) : (
              <ul className="space-y-2">
                {users
                  .filter((u: any) => {
                    const q = dataSearch.trim().toLowerCase()
                    if (!q) return true
                    return (
                      u.id.toLowerCase().includes(q) ||
                      u.phone.toLowerCase().includes(q) ||
                      (u.name ?? '').toLowerCase().includes(q) ||
                      u.role.toLowerCase().includes(q)
                    )
                  })
                  .slice(0, 200)
                  .map((u: any) => (
                    <li key={u.id} className="rounded-xl border border-border bg-background/30 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{u.name || '—'}</p>
                          <p className="text-muted-foreground">{u.phone}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.role} · {u.status}
                          </p>
                          <p className="text-xs font-mono text-foreground/90 break-all mt-1">{u.id}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void copy(u.id)}
                          className="px-2 py-1 bg-card border border-border text-foreground/80 text-xs rounded-lg hover:bg-muted/40"
                        >
                          Copiar
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">Partners</h3>
            {partners.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem frotas.</p>
            ) : (
              <ul className="space-y-2">
                {partners
                  .filter((p: any) => {
                    const q = dataSearch.trim().toLowerCase()
                    if (!q) return true
                    return p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
                  })
                  .slice(0, 200)
                  .map((p: any) => (
                    <li key={p.id} className="rounded-xl border border-border bg-background/30 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.created_at}</p>
                          <p className="text-xs font-mono text-foreground/90 break-all mt-1">{p.id}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void copy(p.id)}
                          className="px-2 py-1 bg-card border border-border text-foreground/80 text-xs rounded-lg hover:bg-muted/40"
                        >
                          Copiar
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">Drivers</h3>
            {driversList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem motoristas.</p>
            ) : (
              <ul className="space-y-2">
                {driversList
                  .filter((d: any) => {
                    const q = dataSearch.trim().toLowerCase()
                    if (!q) return true
                    return (
                      d.user_id.toLowerCase().includes(q) ||
                      d.partner_id.toLowerCase().includes(q) ||
                      d.status.toLowerCase().includes(q)
                    )
                  })
                  .slice(0, 200)
                  .map((d: any) => (
                    <li key={d.user_id} className="rounded-xl border border-border bg-background/30 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">status: {d.status}</p>
                          <p className="text-xs text-muted-foreground">partner_id</p>
                          <p className="text-xs font-mono text-foreground/90 break-all">{d.partner_id}</p>
                          <p className="text-xs text-muted-foreground mt-2">user_id</p>
                          <p className="text-xs font-mono text-foreground/90 break-all">{d.user_id}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => void copy(d.user_id)}
                            className="px-2 py-1 bg-card border border-border text-foreground/80 text-xs rounded-lg hover:bg-muted/40"
                          >
                            Copiar user
                          </button>
                          <button
                            type="button"
                            onClick={() => void copy(d.partner_id)}
                            className="px-2 py-1 bg-card border border-border text-foreground/80 text-xs rounded-lg hover:bg-muted/40"
                          >
                            Copiar frota
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </section>
    </>
  )
}
