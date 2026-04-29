/**
 * Preferências locais de categorias de veículo ativas para o motorista.
 * Fase 1: persistência local + toggles no menu (sem regras de backend).
 */
export const DRIVER_VEHICLE_CATEGORIES = [
  'x',
  'xl',
  'pet',
  'comfort',
  'black',
  'electric',
  'van',
] as const

export type DriverVehicleCategory = (typeof DRIVER_VEHICLE_CATEGORIES)[number]

const STORAGE_KEY = 'tvde_driver_vehicle_categories'

const DEFAULT_CATEGORIES: DriverVehicleCategory[] = ['x']

function isDriverVehicleCategory(v: string): v is DriverVehicleCategory {
  return (DRIVER_VEHICLE_CATEGORIES as readonly string[]).includes(v)
}

export function normalizeDriverVehicleCategory(raw: string | null | undefined): DriverVehicleCategory | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (isDriverVehicleCategory(v)) return v
  if (v === 'standard') return 'x'
  return null
}

export function driverVehicleCategoryLabel(category: DriverVehicleCategory): string {
  switch (category) {
    case 'x':
      return 'X'
    case 'xl':
      return 'XL'
    case 'pet':
      return 'Pet'
    case 'comfort':
      return 'Comfort'
    case 'black':
      return 'Black'
    case 'electric':
      return 'Eletrico'
    case 'van':
      return 'Van'
  }
}

export function getDriverVehicleCategories(): DriverVehicleCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_CATEGORIES]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...DEFAULT_CATEGORIES]
    const valid = parsed
      .map((v) => (typeof v === 'string' ? normalizeDriverVehicleCategory(v) : null))
      .filter((v): v is DriverVehicleCategory => v != null)
    return valid.length > 0 ? Array.from(new Set(valid)) : [...DEFAULT_CATEGORIES]
  } catch {
    return [...DEFAULT_CATEGORIES]
  }
}

export function setDriverVehicleCategories(categories: DriverVehicleCategory[]): void {
  const next = Array.from(new Set(categories.filter(isDriverVehicleCategory)))
  const safe = next.length > 0 ? next : [...DEFAULT_CATEGORIES]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
  } catch {
    /* ignore */
  }
}

