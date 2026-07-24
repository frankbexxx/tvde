import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiError } from '../../../api/client'
import {
  assignPartnerVehicle,
  createPartnerVehicle,
  fetchPartnerDrivers,
  fetchPartnerVehicles,
  patchPartnerVehicle,
  unassignPartnerVehicle,
  type PartnerDriverRow,
  type PartnerVehicleRow,
} from '../../../api/partner'
import { PARTNER_SECTION_TITLE } from '../../../components/layout/infoBoxTemplate'
import {
  DRIVER_VEHICLE_CATEGORIES,
  driverVehicleCategoryLabel,
  type DriverVehicleCategory,
} from '../../../services/driverVehicleCategories'
import { PartnerVehicleDocumentsPanel } from './PartnerVehicleDocumentsPanel'
import {
  vehicleDocListBadgeClass,
  vehicleDocumentListBadge,
} from '../vehicleDocumentHelpers'

type VehicleFormState = {
  plate: string
  make: string
  model: string
  year: string
  color: string
  service_categories: DriverVehicleCategory[]
  status: string
}

const emptyForm = (): VehicleFormState => ({
  plate: '',
  make: '',
  model: '',
  year: '',
  color: '',
  service_categories: ['x'],
  status: 'active',
})

function formFromVehicle(v: PartnerVehicleRow): VehicleFormState {
  const cats = (v.service_categories ?? [])
    .map((c) => c.trim().toLowerCase())
    .filter((c): c is DriverVehicleCategory =>
      (DRIVER_VEHICLE_CATEGORIES as readonly string[]).includes(c)
    )
  return {
    plate: v.plate,
    make: v.make,
    model: v.model,
    year: v.year != null ? String(v.year) : '',
    color: v.color ?? '',
    service_categories: cats.length > 0 ? cats : ['x'],
    status: v.status || 'active',
  }
}

function parseYear(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t)
  if (!Number.isInteger(n) || n < 1980 || n > 2100) return NaN
  return n
}

function formatCategories(cats: string[]): string {
  return cats
    .map((c) => {
      if ((DRIVER_VEHICLE_CATEGORIES as readonly string[]).includes(c)) {
        return driverVehicleCategoryLabel(c as DriverVehicleCategory)
      }
      return c
    })
    .join(', ')
}

type PartnerVehiclesScreenProps = {
  /** After assign/unassign/create — refresh fleet drivers (plates on list). */
  onFleetChanged?: () => void
}

export function PartnerVehiclesScreen({ onFleetChanged }: PartnerVehiclesScreenProps) {
  const { t } = useTranslation('partner')
  const [vehicles, setVehicles] = useState<PartnerVehicleRow[]>([])
  const [drivers, setDrivers] = useState<PartnerDriverRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<VehicleFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<VehicleFormState>(emptyForm)
  const [assignByVehicle, setAssignByVehicle] = useState<Record<string, string>>({})
  const [docsOpenId, setDocsOpenId] = useState<string | null>(null)

  const apiErrorMessage = useCallback(
    (e: unknown, fallbackKey: string) => {
      const status = e && typeof e === 'object' && 'status' in e ? (e as ApiError).status : undefined
      const detailRaw =
        e && typeof e === 'object' && 'detail' in e ? (e as ApiError).detail : undefined
      const detail = typeof detailRaw === 'string' ? detailRaw : undefined
      if (detail === 'plate_already_exists' || (status === 409 && detail?.includes('plate'))) {
        return t('vehicles.errors.plateDuplicate')
      }
      if (detail === 'vehicle_already_assigned') {
        return t('vehicles.errors.alreadyAssigned')
      }
      if (detail === 'invalid_service_category') {
        return t('vehicles.errors.invalidCategory')
      }
      if (detail === 'service_categories_required') {
        return t('vehicles.errors.categoriesRequired')
      }
      if (detail) return detail
      return t(fallbackKey)
    },
    [t]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [vRows, dRows] = await Promise.all([fetchPartnerVehicles(), fetchPartnerDrivers()])
      setVehicles(vRows)
      setDrivers(dRows)
      const nextAssign: Record<string, string> = {}
      for (const v of vRows) {
        nextAssign[v.id] = v.assigned_driver_id ?? ''
      }
      setAssignByVehicle(nextAssign)
    } catch (e) {
      setError(apiErrorMessage(e, 'vehicles.loadError'))
    } finally {
      setLoading(false)
    }
  }, [apiErrorMessage])

  useEffect(() => {
    void load()
  }, [load])

  const driverOptions = useMemo(
    () =>
      [...drivers].sort((a, b) =>
        (a.user.name ?? a.user.phone ?? a.user_id).localeCompare(
          b.user.name ?? b.user.phone ?? b.user_id
        )
      ),
    [drivers]
  )

  const validateForm = (form: VehicleFormState, requirePlate: boolean): string | null => {
    if (requirePlate && !form.plate.trim()) return t('vehicles.errors.plateRequired')
    if (!form.make.trim()) return t('vehicles.errors.makeRequired')
    if (!form.model.trim()) return t('vehicles.errors.modelRequired')
    if (form.service_categories.length === 0) return t('vehicles.errors.categoriesRequired')
    const year = parseYear(form.year)
    if (Number.isNaN(year)) return t('vehicles.errors.yearInvalid')
    return null
  }

  const onCreate = async () => {
    setError(null)
    setSuccess(null)
    const invalid = validateForm(createForm, true)
    if (invalid) {
      setError(invalid)
      return
    }
    const year = parseYear(createForm.year)
    setBusy(true)
    try {
      await createPartnerVehicle({
        plate: createForm.plate.trim(),
        make: createForm.make.trim(),
        model: createForm.model.trim(),
        year,
        color: createForm.color.trim() || null,
        service_categories: createForm.service_categories,
        status: createForm.status || 'active',
      })
      setCreateForm(emptyForm())
      setShowCreate(false)
      setSuccess(t('vehicles.createdOk'))
      await load()
      onFleetChanged?.()
    } catch (e) {
      setError(apiErrorMessage(e, 'vehicles.createError'))
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (v: PartnerVehicleRow) => {
    setEditingId(v.id)
    setEditForm(formFromVehicle(v))
    setError(null)
    setSuccess(null)
  }

  const onSaveEdit = async (vehicleId: string) => {
    setError(null)
    setSuccess(null)
    const invalid = validateForm(editForm, true)
    if (invalid) {
      setError(invalid)
      return
    }
    const year = parseYear(editForm.year)
    setBusy(true)
    try {
      await patchPartnerVehicle(vehicleId, {
        plate: editForm.plate.trim(),
        make: editForm.make.trim(),
        model: editForm.model.trim(),
        year,
        color: editForm.color.trim() || null,
        service_categories: editForm.service_categories,
        status: editForm.status || 'active',
      })
      setEditingId(null)
      setSuccess(t('vehicles.updatedOk'))
      await load()
      onFleetChanged?.()
    } catch (e) {
      setError(apiErrorMessage(e, 'vehicles.updateError'))
    } finally {
      setBusy(false)
    }
  }

  const onAssign = async (vehicleId: string) => {
    setError(null)
    setSuccess(null)
    const driverId = (assignByVehicle[vehicleId] ?? '').trim()
    if (!driverId) {
      setError(t('vehicles.errors.driverRequired'))
      return
    }
    setBusy(true)
    try {
      await assignPartnerVehicle(vehicleId, driverId)
      setSuccess(t('vehicles.assignedOk'))
      await load()
      onFleetChanged?.()
    } catch (e) {
      setError(apiErrorMessage(e, 'vehicles.assignError'))
    } finally {
      setBusy(false)
    }
  }

  const onUnassign = async (vehicleId: string) => {
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      await unassignPartnerVehicle(vehicleId)
      setSuccess(t('vehicles.unassignedOk'))
      await load()
      onFleetChanged?.()
    } catch (e) {
      setError(apiErrorMessage(e, 'vehicles.unassignError'))
    } finally {
      setBusy(false)
    }
  }

  const fieldClass =
    'w-full min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground'

  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-vehicles-screen">
      <div className="flex items-center justify-between gap-2">
        <p className={PARTNER_SECTION_TITLE}>{t('vehicles.listTitle')}</p>
        <button
          type="button"
          data-testid="partner-vehicles-toggle-create"
          disabled={busy}
          onClick={() => {
            setShowCreate((v) => !v)
            setError(null)
            setSuccess(null)
          }}
          className="min-h-10 shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {showCreate ? t('vehicles.cancelCreate') : t('vehicles.newVehicle')}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert" data-testid="partner-vehicles-error">
          {error}
        </p>
      ) : null}
      {success && !error ? (
        <p className="text-sm text-success" role="status" data-testid="partner-vehicles-success">
          {success}
        </p>
      ) : null}

      {showCreate ? (
        <section
          className="space-y-2 rounded-xl border border-border bg-card p-3"
          data-testid="partner-vehicles-create-form"
        >
          <p className="text-sm font-semibold">{t('vehicles.createTitle')}</p>
          <VehicleFields form={createForm} onChange={setCreateForm} fieldClass={fieldClass} t={t} />
          <button
            type="button"
            data-testid="partner-vehicles-create-submit"
            disabled={busy}
            onClick={() => void onCreate()}
            className="w-full min-h-11 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? t('vehicles.saving') : t('vehicles.createSubmit')}
          </button>
        </section>
      ) : null}

      {loading ? <p className="text-muted-foreground">{t('vehicles.loading')}</p> : null}

      {!loading && vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="partner-vehicles-empty">
          {t('vehicles.empty')}
        </p>
      ) : null}

      <ul className="space-y-2">
        {vehicles.map((v) => {
          const editing = editingId === v.id
          const docBadge = vehicleDocumentListBadge(v.document_summary)
          return (
            <li
              key={v.id}
              className="rounded-xl border border-border bg-card p-3 space-y-2"
              data-testid="partner-vehicle-row"
            >
              {editing ? (
                <>
                  <VehicleFields
                    form={editForm}
                    onChange={setEditForm}
                    fieldClass={fieldClass}
                    t={t}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-testid="partner-vehicle-save"
                      disabled={busy}
                      onClick={() => void onSaveEdit(v.id)}
                      className="flex-1 min-h-10 rounded-xl bg-primary text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {busy ? t('vehicles.saving') : t('vehicles.save')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                      className="flex-1 min-h-10 rounded-xl border border-border text-xs font-semibold disabled:opacity-50"
                    >
                      {t('vehicles.cancel')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tabular-nums" data-testid="partner-vehicle-plate">
                      {v.plate}
                    </span>
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">
                      {v.status}
                    </span>
                    {docBadge ? (
                      <span
                        data-testid="partner-vehicle-docs-badge"
                        data-badge-key={docBadge.badgeKey}
                        className={`inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-tight ${vehicleDocListBadgeClass(docBadge.tone)}`}
                      >
                        {docBadge.badgeKey === 'missing'
                          ? t('vehicles.documents.badge.missing', {
                            count: docBadge.count,
                          })
                          : t(`vehicles.documents.badge.${docBadge.badgeKey}`)}
                      </span>
                    ) : null}
                  </div>
                  <p data-testid="partner-vehicle-make-model">
                    {v.make} {v.model}
                    {v.year != null ? ` · ${v.year}` : ''}
                    {v.color ? ` · ${v.color}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="partner-vehicle-categories">
                    {t('vehicles.serviceCategories')}: {formatCategories(v.service_categories ?? [])}
                  </p>
                  <p className="text-xs" data-testid="partner-vehicle-assigned">
                    {v.assigned_driver_id
                      ? t('vehicles.assignedTo', {
                        name: v.assigned_driver_name ?? v.assigned_driver_id,
                      })
                      : t('vehicles.noDriver')}
                  </p>
                  <button
                    type="button"
                    data-testid="partner-vehicle-edit"
                    disabled={busy}
                    onClick={() => startEdit(v)}
                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    {t('vehicles.edit')}
                  </button>
                </>
              )}

              <div className="flex flex-col gap-2 border-t border-border pt-2">
                <label className="text-xs text-muted-foreground" htmlFor={`assign-${v.id}`}>
                  {t('vehicles.assignLabel')}
                </label>
                <select
                  id={`assign-${v.id}`}
                  data-testid="partner-vehicle-assign-select"
                  className={fieldClass}
                  value={assignByVehicle[v.id] ?? ''}
                  disabled={busy}
                  onChange={(e) =>
                    setAssignByVehicle((prev) => ({ ...prev, [v.id]: e.target.value }))
                  }
                >
                  <option value="">{t('vehicles.selectDriver')}</option>
                  {driverOptions.map((d) => (
                    <option key={d.user_id} value={d.user_id}>
                      {d.user.name ?? d.user.phone ?? d.user_id}
                      {d.active_vehicle_id && d.active_vehicle_id !== v.id
                        ? ` (${t('vehicles.hasOtherVehicle')})`
                        : ''}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid="partner-vehicle-assign"
                    disabled={busy}
                    onClick={() => void onAssign(v.id)}
                    className="flex-1 min-h-10 rounded-xl bg-primary text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {t('vehicles.assign')}
                  </button>
                  <button
                    type="button"
                    data-testid="partner-vehicle-unassign"
                    disabled={busy || !v.assigned_driver_id}
                    onClick={() => void onUnassign(v.id)}
                    className="flex-1 min-h-10 rounded-xl border border-border text-xs font-semibold disabled:opacity-50"
                  >
                    {t('vehicles.unassign')}
                  </button>
                </div>
              </div>

              <div className="border-t border-border pt-2 space-y-2">
                <button
                  type="button"
                  data-testid="partner-vehicle-docs-toggle"
                  disabled={busy}
                  aria-expanded={docsOpenId === v.id}
                  onClick={() =>
                    setDocsOpenId((cur) => (cur === v.id ? null : v.id))
                  }
                  className="w-full min-h-10 rounded-xl border border-border text-xs font-semibold hover:bg-muted/40 disabled:opacity-50"
                >
                  {docsOpenId === v.id
                    ? t('vehicles.documents.hide')
                    : t('vehicles.documents.show')}
                </button>
                {docsOpenId === v.id ? (
                  <PartnerVehicleDocumentsPanel vehicleId={v.id} />
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        data-testid="partner-vehicles-refresh"
        disabled={busy || loading}
        onClick={() => void load()}
        className="w-full min-h-11 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold hover:bg-muted/40 disabled:opacity-50"
      >
        {t('vehicles.refresh')}
      </button>
    </div>
  )
}

function VehicleFields({
  form,
  onChange,
  fieldClass,
  t,
}: {
  form: VehicleFormState
  onChange: (next: VehicleFormState) => void
  fieldClass: string
  t: (key: string) => string
}) {
  const set = (key: keyof VehicleFormState, value: string) => onChange({ ...form, [key]: value })
  const toggleCategory = (key: DriverVehicleCategory) => {
    const active = form.service_categories.includes(key)
    const next = active
      ? form.service_categories.filter((c) => c !== key)
      : [...form.service_categories, key]
    onChange({ ...form, service_categories: next.length > 0 ? next : ['x'] })
  }
  return (
    <div className="grid gap-2">
      <input
        className={fieldClass}
        data-testid="partner-vehicle-field-plate"
        placeholder={t('vehicles.fields.plate')}
        value={form.plate}
        onChange={(e) => set('plate', e.target.value)}
      />
      <input
        className={fieldClass}
        data-testid="partner-vehicle-field-make"
        placeholder={t('vehicles.fields.make')}
        value={form.make}
        onChange={(e) => set('make', e.target.value)}
      />
      <input
        className={fieldClass}
        data-testid="partner-vehicle-field-model"
        placeholder={t('vehicles.fields.model')}
        value={form.model}
        onChange={(e) => set('model', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className={fieldClass}
          data-testid="partner-vehicle-field-year"
          placeholder={t('vehicles.fields.year')}
          inputMode="numeric"
          value={form.year}
          onChange={(e) => set('year', e.target.value)}
        />
        <input
          className={fieldClass}
          data-testid="partner-vehicle-field-color"
          placeholder={t('vehicles.fields.color')}
          value={form.color}
          onChange={(e) => set('color', e.target.value)}
        />
      </div>
      <div data-testid="partner-vehicle-field-categories">
        <p className="text-xs text-muted-foreground mb-1.5">{t('vehicles.fields.serviceCategories')}</p>
        <div className="grid grid-cols-2 gap-2">
          {DRIVER_VEHICLE_CATEGORIES.map((key) => {
            const active = form.service_categories.includes(key)
            return (
              <button
                key={key}
                type="button"
                data-testid={`partner-vehicle-category-${key}`}
                aria-pressed={active}
                onClick={() => toggleCategory(key)}
                className={`min-h-9 rounded-lg border px-2 text-xs font-semibold touch-manipulation transition-colors ${active
                  ? 'border-info bg-info/15 text-foreground'
                  : 'border-border bg-background text-foreground/80 hover:bg-muted/50'
                  }`}
              >
                {driverVehicleCategoryLabel(key)}
              </button>
            )
          })}
        </div>
      </div>
      <select
        className={fieldClass}
        data-testid="partner-vehicle-field-status"
        value={form.status}
        onChange={(e) => set('status', e.target.value)}
      >
        <option value="active">{t('vehicles.statusActive')}</option>
        <option value="inactive">{t('vehicles.statusInactive')}</option>
      </select>
    </div>
  )
}
