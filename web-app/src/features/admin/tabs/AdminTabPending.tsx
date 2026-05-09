type AdminTabPendingProps = Record<string, any>

export function AdminTabPending(props: AdminTabPendingProps) {
  const {
    handleApprove,
    pending,
  } = props

  return (
    <>
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Utilizadores pendentes</h2>
          {pending.length === 0 ? (
            <p className="text-muted-foreground">Nenhum utilizador pendente.</p>
          ) : (
            <ul className="space-y-3">
              {pending.map((u: any) => (
                <li
                  key={u.phone}
                  className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3 shadow-card"
                >
                  <div>
                    <p className="font-medium text-foreground">{u.phone}</p>
                    <p className="text-sm text-foreground/75">{u.requested_role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApprove(u.phone)}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-success text-success-foreground text-sm font-medium rounded-lg hover:opacity-90"
                  >
                    Aprovar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
    </>
  )
}
