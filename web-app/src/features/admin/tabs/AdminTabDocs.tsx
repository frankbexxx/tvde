import type { Dispatch, SetStateAction } from 'react'
import type { DriverDocumentStatus, DriverDocumentsState, DriverRequiredDocument } from '../../../services/driverDocuments'
import type { AdminDashboardUrlUpdate } from '../useAdminDashboardNavigation'
import type { AdminUser } from '../useAdminUsersDirectory'

type DocsRegistry = Record<string, DriverDocumentsState['docs']>

type AdminDocsRow = {
  user: AdminUser
  docs: DriverDocumentsState['docs']
  approved: number
  missing: DriverRequiredDocument[]
}

export type AdminTabDocsProps = {
  DRIVER_DOC_STATUSES: readonly DriverDocumentStatus[]
  REQUIRED_DRIVER_DOCUMENTS: readonly DriverRequiredDocument[]
  approvedDriverDocs: () => DriverDocumentsState['docs']
  docsRowsData: { rows: AdminDocsRow[]; totals: Record<DriverDocumentStatus, number> }
  docsStatusFilter: 'all' | DriverDocumentStatus
  driverDocumentLabel: (doc: DriverRequiredDocument) => string
  driverDocumentStatusLabel: (st: DriverDocumentStatus) => string
  driverUsers: AdminUser[]
  emptyDriverDocs: () => DriverDocumentsState['docs']
  setDocsStatusFilter: Dispatch<SetStateAction<'all' | DriverDocumentStatus>>
  setDriverDocsRegistry: Dispatch<SetStateAction<DocsRegistry>>
  syncAdminUrl: (next: AdminDashboardUrlUpdate) => void
}

export function AdminTabDocs(props: AdminTabDocsProps) {
  const {
    DRIVER_DOC_STATUSES,
    REQUIRED_DRIVER_DOCUMENTS,
    approvedDriverDocs,
    docsRowsData,
    docsStatusFilter,
    driverDocumentLabel,
    driverDocumentStatusLabel,
    driverUsers,
    emptyDriverDocs,
    setDocsStatusFilter,
    setDriverDocsRegistry,
    syncAdminUrl,
  } = props

  return (
    <>
        <section className="space-y-4 mb-6" aria-labelledby="admin-docs-heading">
          <h2 id="admin-docs-heading" className="text-lg font-semibold text-foreground">
            Documentos e licenças
          </h2>
          <div className="rounded-2xl border border-border bg-card px-4 py-4 space-y-3 shadow-card">
            <p className="text-sm text-foreground/85">
              Esta secção centraliza documentos operacionais (motorista e viatura) e validações.
            </p>
            <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-foreground">
              Módulo em implementação. Nesta fase, a validação continua via operação/admin.
            </div>
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Documentos obrigatórios (v1)</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/80">
                {REQUIRED_DRIVER_DOCUMENTS.map((doc) => (
                  <li key={doc}>{driverDocumentLabel(doc)}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Estados esperados</p>
              <div className="flex flex-wrap gap-2">
                {DRIVER_DOC_STATUSES.map((st) => (
                  <span
                    key={st}
                    className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-foreground/85"
                  >
                    {driverDocumentStatusLabel(st)}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Motoristas (controle rápido v1)</p>
                <p className="text-xs text-muted-foreground">{driverUsers.length} com perfil motorista</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-3 py-2 space-y-2">
                <p className="text-xs text-foreground/85">Totais por estado (20 motoristas visíveis)</p>
                <div className="flex flex-wrap gap-1.5">
                  {DRIVER_DOC_STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setDocsStatusFilter((prev) => (prev === st ? 'all' : st))
                      }
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${docsStatusFilter === st
                        ? 'border-info/60 bg-info/15 text-foreground'
                        : 'border-border bg-card text-foreground/85'
                        }`}
                    >
                      {driverDocumentStatusLabel(st)}: {docsRowsData.totals[st]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDocsStatusFilter('all')}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${docsStatusFilter === 'all'
                      ? 'border-info/60 bg-info/15 text-foreground'
                      : 'border-border bg-card text-foreground/85'
                      }`}
                  >
                    Todos
                  </button>
                </div>
              </div>
              {driverUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem motoristas carregados nesta página.</p>
              ) : (
                <ul className="space-y-2 max-h-[min(46vh,20rem)] overflow-y-auto pr-0.5">
                  {docsRowsData.rows.map(({ user: u, docs, approved, missing }) => {
                    return (
                      <li key={u.id} className="rounded-lg border border-border/70 bg-background px-3 py-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{u.name || u.phone}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{u.phone}</p>
                          </div>
                          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-foreground/85">
                            {approved}/{REQUIRED_DRIVER_DOCUMENTS.length} aprovados
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground/80">
                          {missing.length === 0
                            ? 'Checklist completo.'
                            : `Em falta: ${missing.map((k) => driverDocumentLabel(k)).join(', ')}`}
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {REQUIRED_DRIVER_DOCUMENTS.filter((doc) =>
                            docsStatusFilter === 'all' ? true : docs[doc] === docsStatusFilter
                          ).map((doc) => (
                            <div
                              key={doc}
                              className="rounded-md border border-border/70 bg-card px-2 py-1.5 flex flex-wrap items-center justify-between gap-1"
                            >
                              <p className="text-[11px] text-foreground/85">{driverDocumentLabel(doc)}</p>
                              <div className="flex flex-wrap gap-1">
                                {DRIVER_DOC_STATUSES.map((st) => (
                                  <button
                                    key={`${u.id}-${doc}-${st}`}
                                    type="button"
                                    onClick={() =>
                                      setDriverDocsRegistry((prev) => ({
                                        ...prev,
                                        [u.id]: {
                                          ...(prev[u.id] ?? emptyDriverDocs()),
                                          [doc]: st,
                                        },
                                      }))
                                    }
                                    className={`rounded border px-1.5 py-0.5 text-[10px] ${docs[doc] === st
                                      ? 'border-info/60 bg-info/15 text-foreground'
                                      : 'border-border bg-background text-foreground/75 hover:bg-muted/40'
                                      }`}
                                  >
                                    {driverDocumentStatusLabel(st)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                          {REQUIRED_DRIVER_DOCUMENTS.every((doc) =>
                            docsStatusFilter === 'all' ? false : docs[doc] !== docsStatusFilter
                          ) ? (
                            <p className="text-[11px] text-muted-foreground">
                              Sem documentos deste estado para este motorista.
                            </p>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDriverDocsRegistry((prev) => ({
                                ...prev,
                                [u.id]: approvedDriverDocs(),
                              }))
                            }
                            className="min-h-[32px] flex-1 rounded-md border border-success/50 bg-success/10 px-2 text-xs font-medium text-foreground hover:bg-success/20"
                          >
                            Aprovar tudo
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDriverDocsRegistry((prev) => ({
                                ...prev,
                                [u.id]: emptyDriverDocs(),
                              }))
                            }
                            className="min-h-[32px] flex-1 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted/50"
                          >
                            Limpar
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => syncAdminUrl({ tab: 'frota', tripId: null })}
                className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
              >
                Ir para Frota
              </button>
              <button
                type="button"
                onClick={() => syncAdminUrl({ tab: 'users', tripId: null })}
                className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
              >
                Ir para Utilizadores
              </button>
              <button
                type="button"
                onClick={() => syncAdminUrl({ tab: 'ops', tripId: null })}
                className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
              >
                Ir para Operações
              </button>
            </div>
          </div>
        </section>
    </>
  )
}
