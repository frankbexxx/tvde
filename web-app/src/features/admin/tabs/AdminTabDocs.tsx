import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getAdminKycSupervision,
  type AdminKycDriverRow,
  type AdminKycSupervisionResponse,
  type AdminKycVehicleRow,
} from '../../../api/admin'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { useAuth } from '../../../context/AuthContext'
import { adminErrDetail } from '../adminDashboardHelpers'

type SubjectFilter = 'all' | 'driver' | 'vehicle'
type DocStateFilter =
  | 'all'
  | 'expired'
  | 'expiring_soon'
  | 'pending_review'
  | 'rejected'
  | 'missing'
  | 'approved'

function docMatchesStateFilter(
  docs: AdminKycDriverRow['documents'],
  filter: DocStateFilter
): boolean {
  if (filter === 'all') return true
  return docs.some((d) => {
    if (filter === 'expired') return d.is_expired || d.stored_status === 'expired'
    if (filter === 'expiring_soon') return d.is_expiring_soon
    if (filter === 'pending_review')
      return d.stored_status === 'pending_review' || d.stored_status === 'pending'
    if (filter === 'rejected') return d.stored_status === 'rejected'
    if (filter === 'missing') return d.stored_status === 'missing'
    if (filter === 'approved')
      return d.stored_status === 'approved' || d.computed_status === 'valid'
    return false
  })
}

function formatExpires(iso: string | null): string {
  if (!iso) return '—'
  const d = iso.slice(0, 10)
  return d || iso
}

export function AdminTabDocs() {
  const { t } = useTranslation('admin')
  const { token } = useAuth()
  const [data, setData] = useState<AdminKycSupervisionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('all')
  const [docStateFilter, setDocStateFilter] = useState<DocStateFilter>('all')
  const [partnerFilter, setPartnerFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const snap = await getAdminKycSupervision(token)
      setData(snap)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao carregar supervisão KYC'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const q = search.trim().toLowerCase()

  const driversFiltered = useMemo(() => {
    if (!data) return []
    if (subjectFilter === 'vehicle') return []
    return data.drivers.filter((d) => {
      if (partnerFilter !== 'all' && d.partner_id !== partnerFilter) return false
      if (!docMatchesStateFilter(d.documents, docStateFilter)) return false
      if (!q) return true
      return (
        (d.driver_name ?? '').toLowerCase().includes(q) ||
        (d.driver_phone ?? '').toLowerCase().includes(q) ||
        d.user_id.toLowerCase().includes(q) ||
        (d.partner_name ?? '').toLowerCase().includes(q)
      )
    })
  }, [data, subjectFilter, partnerFilter, docStateFilter, q])

  const vehiclesFiltered = useMemo(() => {
    if (!data) return []
    if (subjectFilter === 'driver') return []
    return data.vehicles.filter((v) => {
      if (partnerFilter !== 'all' && v.partner_id !== partnerFilter) return false
      if (!docMatchesStateFilter(v.documents, docStateFilter)) return false
      if (!q) return true
      return (
        v.plate.toLowerCase().includes(q) ||
        v.vehicle_id.toLowerCase().includes(q) ||
        (v.partner_name ?? '').toLowerCase().includes(q) ||
        (v.assigned_driver_name ?? '').toLowerCase().includes(q)
      )
    })
  }, [data, subjectFilter, partnerFilter, docStateFilter, q])

  return (
    <section className="space-y-4 mb-6" aria-labelledby="admin-docs-heading" data-testid="admin-kyc-supervision">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="admin-docs-heading" className="text-lg font-semibold text-foreground">
          {t('headings.docs')}
        </h2>
        <button
          type="button"
          data-testid="admin-kyc-refresh"
          onClick={() => void load()}
          disabled={loading || !token}
          className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40 disabled:opacity-50"
        >
          {loading ? 'A carregar…' : 'Atualizar'}
        </button>
      </div>

      <p className="text-sm text-foreground/80">
        Supervisão read-only dos documentos canónicos (Partner gere KYC). Sem aprovação,
        upload ou edição neste ecrã.
      </p>

      {error ? (
        <p
          data-testid="admin-kyc-error"
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-lg"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {data ? (
        <div
          data-testid="admin-kyc-alerts"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
        >
          <AlertCard
            label="Drivers docs expirados"
            value={data.alerts.drivers_with_expired_docs}
            tone="crit"
          />
          <AlertCard
            label="Drivers pending/rejected"
            value={data.alerts.drivers_with_pending_or_rejected_docs}
            tone="warn"
          />
          <AlertCard
            label="Vehicles docs expirados"
            value={data.alerts.vehicles_with_expired_docs}
            tone="crit"
          />
          <AlertCard
            label="Vehicles a expirar"
            value={data.alerts.vehicles_with_expiring_soon_docs}
            tone="warn"
          />
          <AlertCard
            label="Vehicles inactive"
            value={data.alerts.vehicles_inactive}
            tone="info"
          />
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-3 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <label className="block text-xs text-foreground/80">
            Tipo
            <select
              data-testid="admin-kyc-filter-subject"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value as SubjectFilter)}
              className="mt-1 w-full px-2 py-2 rounded-xl border border-border bg-background text-sm"
            >
              <option value="all">Drivers + Vehicles</option>
              <option value="driver">Só Drivers</option>
              <option value="vehicle">Só Vehicles</option>
            </select>
          </label>
          <label className="block text-xs text-foreground/80">
            Estado documento
            <select
              data-testid="admin-kyc-filter-doc-state"
              value={docStateFilter}
              onChange={(e) => setDocStateFilter(e.target.value as DocStateFilter)}
              className="mt-1 w-full px-2 py-2 rounded-xl border border-border bg-background text-sm"
            >
              <option value="all">Todos</option>
              <option value="expired">Expirado</option>
              <option value="expiring_soon">A expirar</option>
              <option value="pending_review">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="missing">Missing</option>
              <option value="approved">Approved/valid</option>
            </select>
          </label>
          <label className="block text-xs text-foreground/80">
            Partner
            <select
              data-testid="admin-kyc-filter-partner"
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="mt-1 w-full px-2 py-2 rounded-xl border border-border bg-background text-sm"
            >
              <option value="all">Todas as frotas</option>
              {(data?.partners ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-foreground/80">
            Pesquisa (nome / matrícula)
            <input
              data-testid="admin-kyc-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar…"
              className="mt-1 w-full px-2 py-2 rounded-xl border border-border bg-background text-sm"
            />
          </label>
        </div>
      </div>

      {subjectFilter !== 'vehicle' ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-card space-y-3">
          <h3 className="font-medium text-foreground">Drivers ({driversFiltered.length})</h3>
          {driversFiltered.length === 0 ? (
            <EmptyState title="Sem motoristas neste filtro." />
          ) : (
            <ul className="space-y-3" data-testid="admin-kyc-drivers-list">
              {driversFiltered.slice(0, 200).map((d) => (
                <DriverKycCard key={d.user_id} row={d} />
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {subjectFilter !== 'driver' ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-card space-y-3">
          <h3 className="font-medium text-foreground">Vehicles ({vehiclesFiltered.length})</h3>
          {vehiclesFiltered.length === 0 ? (
            <EmptyState title="Sem veículos neste filtro." />
          ) : (
            <ul className="space-y-3" data-testid="admin-kyc-vehicles-list">
              {vehiclesFiltered.slice(0, 200).map((v) => (
                <VehicleKycCard key={v.vehicle_id} row={v} />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}

function AlertCard(props: {
  label: string
  value: number
  tone: 'crit' | 'warn' | 'info'
}) {
  const toneClass =
    props.tone === 'crit'
      ? 'border-destructive/40 bg-destructive/10'
      : props.tone === 'warn'
        ? 'border-warning/40 bg-warning/10'
        : 'border-border bg-background/40'
  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-xs text-foreground/75">{props.label}</p>
      <p className="text-lg font-semibold text-foreground" data-testid={`admin-kyc-alert-${props.label}`}>
        {props.value}
      </p>
    </div>
  )
}

function DocBadges({ docs }: { docs: AdminKycDriverRow['documents'] }) {
  return (
    <ul className="mt-2 space-y-1">
      {docs.map((doc) => (
        <li
          key={doc.doc_key}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] text-foreground/85"
          data-testid={`admin-kyc-doc-${doc.doc_key}`}
        >
          <span className="font-mono">{doc.doc_key}</span>
          <span>· {doc.stored_status}</span>
          {doc.expires_at ? <span>· expira {formatExpires(doc.expires_at)}</span> : null}
          {doc.is_expired ? (
            <span className="rounded border border-destructive/40 bg-destructive/15 px-1 text-destructive">
              expirado
            </span>
          ) : null}
          {doc.is_expiring_soon ? (
            <span className="rounded border border-warning/40 bg-warning/15 px-1">
              a expirar
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function DriverKycCard({ row }: { row: AdminKycDriverRow }) {
  return (
    <li
      className="rounded-xl border border-border bg-background/30 p-3 text-sm"
      data-testid={`admin-kyc-driver-${row.user_id}`}
    >
      <p className="font-medium text-foreground">{row.driver_name || row.driver_phone || row.user_id}</p>
      <p className="text-xs text-muted-foreground">
        {row.driver_phone ?? '—'} · status driver: {row.driver_status}
      </p>
      <p className="text-xs text-muted-foreground">
        Partner: {row.partner_name ?? row.partner_id}
      </p>
      <DocBadges docs={row.documents} />
    </li>
  )
}

function VehicleKycCard({ row }: { row: AdminKycVehicleRow }) {
  return (
    <li
      className="rounded-xl border border-border bg-background/30 p-3 text-sm"
      data-testid={`admin-kyc-vehicle-${row.vehicle_id}`}
    >
      <p className="font-medium text-foreground">{row.plate}</p>
      <p className="text-xs text-muted-foreground">
        status: {row.status}
        {row.worst_document_status ? ` · worst docs: ${row.worst_document_status}` : ''}
      </p>
      <p className="text-xs text-muted-foreground" data-testid="admin-kyc-vehicle-max-passengers">
        Lugares: {row.max_passengers != null ? row.max_passengers : '—'}
      </p>
      <p className="text-xs text-muted-foreground">
        Partner: {row.partner_name ?? row.partner_id}
      </p>
      <p className="text-xs text-muted-foreground">
        Driver: {row.assigned_driver_name ?? row.assigned_driver_user_id ?? '—'}
      </p>
      <DocBadges docs={row.documents} />
    </li>
  )
}
