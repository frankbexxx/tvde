import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { AdminUser } from '../useAdminUsersDirectory'

type AdminPartnerRow = { id: string; name: string; created_at: string }

export type AdminTabFrotaProps = {
  dataLoading: boolean
  frotaAssignDriverId: string
  frotaAssignMode: 'select' | 'manual'
  frotaAssignOk: string | null
  frotaAssignPartnerId: string
  frotaLoading: string | null
  frotaManagerName: string
  frotaManagerPhone: string
  frotaOk: string | null
  frotaOrgName: string
  frotaPartnerId: string
  handleAssignDriverToFrota: () => void | Promise<void>
  handleCreateFrotaManager: () => void | Promise<void>
  handleCreateFrotaOrg: () => void | Promise<void>
  handleUnassignDriverFromFrota: () => void | Promise<void>
  partners: AdminPartnerRow[]
  setFrotaAssignDriverId: Dispatch<SetStateAction<string>>
  setFrotaAssignMode: Dispatch<SetStateAction<'select' | 'manual'>>
  setFrotaAssignOk: Dispatch<SetStateAction<string | null>>
  setFrotaAssignPartnerId: Dispatch<SetStateAction<string>>
  setFrotaManagerName: Dispatch<SetStateAction<string>>
  setFrotaManagerPhone: Dispatch<SetStateAction<string>>
  setFrotaOk: Dispatch<SetStateAction<string | null>>
  setFrotaOrgName: Dispatch<SetStateAction<string>>
  setFrotaPartnerId: Dispatch<SetStateAction<string>>
  users: AdminUser[]
}

export function AdminTabFrota(props: AdminTabFrotaProps) {
  const {
    dataLoading,
    frotaAssignDriverId,
    frotaAssignMode,
    frotaAssignOk,
    frotaAssignPartnerId,
    frotaLoading,
    frotaManagerName,
    frotaManagerPhone,
    frotaOk,
    frotaOrgName,
    frotaPartnerId,
    handleAssignDriverToFrota,
    handleCreateFrotaManager,
    handleCreateFrotaOrg,
    handleUnassignDriverFromFrota,
    partners,
    setFrotaAssignDriverId,
    setFrotaAssignMode,
    setFrotaAssignOk,
    setFrotaAssignPartnerId,
    setFrotaManagerName,
    setFrotaManagerPhone,
    setFrotaOk,
    setFrotaOrgName,
    setFrotaPartnerId,
    users,
  } = props

  return (
    <>
        <p className="text-sm text-foreground bg-success/15 border border-success/30 px-3 py-2 rounded-lg mb-4">
          {frotaOk}
        </p>
      <p className="text-sm text-foreground bg-success/15 border border-success/30 px-3 py-2 rounded-lg mb-4">
          {frotaAssignOk}
        </p>
        <section className="space-y-8">
          <h2 className="text-lg font-semibold text-foreground">Frota (parceiros)</h2>
          <p className="text-sm text-foreground/75 -mt-4">
            Cria uma organização e depois o gestor que inicia sessão na app no separador Frota — tudo aqui, sem
            ferramentas externas.
          </p>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">1. Nova frota</h3>
            <label className="block text-sm text-foreground/80" htmlFor="frota-org-name">
              Nome da organização
            </label>
            <input
              id="frota-org-name"
              type="text"
              value={frotaOrgName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setFrotaOrgName(e.target.value)
                setFrotaOk(null)
                setFrotaAssignOk(null)
              }}
              placeholder="Ex.: Frota Lisboa Norte"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground"
            />
            <button
              type="button"
              disabled={!frotaOrgName.trim() || frotaLoading !== null}
              onClick={() => void handleCreateFrotaOrg()}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {frotaLoading === 'org' ? 'A criar…' : 'Criar Frota'}
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">2. Gestor Frota</h3>
            <p className="text-sm text-foreground/75">
              ID da organização (preenche automaticamente após o passo 1, ou cola um UUID existente).
            </p>
            <label className="block text-sm text-foreground/80" htmlFor="frota-partner-id">
              ID da organização (partner_id)
            </label>
            <input
              id="frota-partner-id"
              type="text"
              value={frotaPartnerId}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setFrotaPartnerId(e.target.value)
                setFrotaOk(null)
                setFrotaAssignOk(null)
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono text-sm"
            />
            <label className="block text-sm text-foreground/80" htmlFor="frota-mgr-name">
              Nome do gestor
            </label>
            <input
              id="frota-mgr-name"
              type="text"
              value={frotaManagerName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setFrotaManagerName(e.target.value)
                setFrotaOk(null)
                setFrotaAssignOk(null)
              }}
              placeholder="Nome completo"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground"
            />
            <label className="block text-sm text-foreground/80" htmlFor="frota-mgr-phone">
              Telefone (login OTP)
            </label>
            <input
              id="frota-mgr-phone"
              type="tel"
              value={frotaManagerPhone}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setFrotaManagerPhone(e.target.value)
                setFrotaOk(null)
                setFrotaAssignOk(null)
              }}
              placeholder="+351…"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground"
            />
            <button
              type="button"
              disabled={
                !frotaPartnerId.trim() ||
                !frotaManagerName.trim() ||
                !frotaManagerPhone.trim() ||
                frotaLoading !== null
              }
              onClick={() => void handleCreateFrotaManager()}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {frotaLoading === 'manager' ? 'A criar…' : 'Criar Gestor'}
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">3. Atribuir motorista à frota</h3>
            <p className="text-sm text-foreground/75">
              Seleciona o motorista e a frota (sem UUIDs manuais).
            </p>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {dataLoading ? 'A carregar listas…' : 'Listas prontas.'}
              </p>
              <button
                type="button"
                onClick={() => setFrotaAssignMode((m) => (m === 'select' ? 'manual' : 'select'))}
                className="px-2 py-1 bg-card border border-border text-foreground/80 text-xs rounded-lg hover:bg-muted/40"
              >
                {frotaAssignMode === 'select' ? 'Modo manual' : 'Modo select'}
              </button>
            </div>

            {frotaAssignMode === 'select' ? (
              <>
                <label className="block text-sm text-foreground/80" htmlFor="frota-assign-driver-select">
                  Motorista
                </label>
                <select
                  id="frota-assign-driver-select"
                  value={frotaAssignDriverId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    setFrotaAssignDriverId(e.target.value)
                    setFrotaAssignOk(null)
                    setFrotaOk(null)
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
                >
                  <option value="">— escolher —</option>
                  {users
                    .filter((u) => u.role === 'driver' || u.has_driver_profile)
                    .slice(0, 400)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {(u.name || u.phone) + ' · ' + u.phone}
                      </option>
                    ))}
                </select>

                <label className="block text-sm text-foreground/80" htmlFor="frota-assign-partner-select">
                  Frota
                </label>
                <select
                  id="frota-assign-partner-select"
                  value={frotaAssignPartnerId || frotaPartnerId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    setFrotaAssignPartnerId(e.target.value)
                    setFrotaAssignOk(null)
                    setFrotaOk(null)
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
                >
                  <option value="">— escolher —</option>
                  {partners.slice(0, 400).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="block text-sm text-foreground/80" htmlFor="frota-assign-driver-id">
                  Driver ID (driver_user_id)
                </label>
                <input
                  id="frota-assign-driver-id"
                  type="text"
                  value={frotaAssignDriverId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setFrotaAssignDriverId(e.target.value)
                    setFrotaAssignOk(null)
                    setFrotaOk(null)
                  }}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono text-sm"
                />
                <label className="block text-sm text-foreground/80" htmlFor="frota-assign-partner-id">
                  Frota ID (partner_id)
                </label>
                <input
                  id="frota-assign-partner-id"
                  type="text"
                  value={frotaAssignPartnerId || frotaPartnerId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setFrotaAssignPartnerId(e.target.value)
                    setFrotaAssignOk(null)
                    setFrotaOk(null)
                  }}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono text-sm"
                />
              </>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  !frotaAssignDriverId.trim() ||
                  !(frotaAssignPartnerId || frotaPartnerId).trim() ||
                  frotaLoading !== null
                }
                onClick={() => void handleAssignDriverToFrota()}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {frotaLoading === 'assign-driver' ? 'A atribuir…' : 'Atribuir'}
              </button>
              <button
                type="button"
                disabled={!frotaAssignDriverId.trim() || frotaLoading !== null}
                onClick={() => void handleUnassignDriverFromFrota()}
                className="flex-1 px-4 py-2 bg-card border border-border text-foreground/90 text-sm font-medium rounded-xl hover:bg-muted/40 disabled:opacity-50"
              >
                {frotaLoading === 'unassign-driver' ? 'A remover…' : 'Remover'}
              </button>
            </div>
          </div>
        </section>
    </>
  )
}
