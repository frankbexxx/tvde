/** PF3D-3B — map vehicle compliance gate HTTP `detail` codes to user-facing copy. */

export const VEHICLE_COMPLIANCE_BLOCKED_CODES = [
  'no_active_vehicle',
  'vehicle_documents_blocked',
  'unknown_vehicle_compliance',
] as const

export type VehicleComplianceBlockedCode =
  (typeof VEHICLE_COMPLIANCE_BLOCKED_CODES)[number]

/** Soft / informational codes (not 409 blockers when gates ON). */
export const VEHICLE_COMPLIANCE_SOFT_CODES = [
  'vehicle_compliance_warning',
  'vehicle_compliance_ok',
  'vehicle_compliance_gates_disabled',
] as const

export function isVehicleComplianceBlockedCode(
  detail: string | null | undefined
): detail is VehicleComplianceBlockedCode {
  return (
    typeof detail === 'string' &&
    (VEHICLE_COMPLIANCE_BLOCKED_CODES as readonly string[]).includes(detail)
  )
}

export function isVehicleComplianceSoftCode(detail: string | null | undefined): boolean {
  return (
    typeof detail === 'string' &&
    (VEHICLE_COMPLIANCE_SOFT_CODES as readonly string[]).includes(detail)
  )
}

const DRIVER_I18N_KEYS: Record<VehicleComplianceBlockedCode, string> = {
  no_active_vehicle: 'availability.noActiveVehicle',
  vehicle_documents_blocked: 'availability.vehicleDocumentsBlocked',
  unknown_vehicle_compliance: 'availability.unknownVehicleCompliance',
}

const PARTNER_I18N_KEYS: Record<VehicleComplianceBlockedCode, string> = {
  no_active_vehicle: 'driverDetail.cannotOnlineNoActiveVehicle',
  vehicle_documents_blocked: 'driverDetail.cannotOnlineVehicleDocumentsBlocked',
  unknown_vehicle_compliance: 'driverDetail.cannotOnlineUnknownVehicleCompliance',
}

const ACCEPT_I18N_KEYS: Record<VehicleComplianceBlockedCode, string> = {
  no_active_vehicle: 'actions.acceptBlockedNoActiveVehicle',
  vehicle_documents_blocked: 'actions.acceptBlockedVehicleDocuments',
  unknown_vehicle_compliance: 'actions.acceptBlockedUnknownVehicleCompliance',
}

/** Returns i18n key under `driver` ns, or null if not a mapped blocked code. */
export function driverAvailabilityComplianceI18nKey(
  detail: string | null | undefined
): string | null {
  if (!isVehicleComplianceBlockedCode(detail)) return null
  return DRIVER_I18N_KEYS[detail]
}

export function partnerForceOnlineComplianceI18nKey(
  detail: string | null | undefined
): string | null {
  if (!isVehicleComplianceBlockedCode(detail)) return null
  return PARTNER_I18N_KEYS[detail]
}

export function driverAcceptComplianceI18nKey(
  detail: string | null | undefined
): string | null {
  if (!isVehicleComplianceBlockedCode(detail)) return null
  return ACCEPT_I18N_KEYS[detail]
}
