import { describe, expect, it } from 'vitest'
import {
  driverAcceptComplianceI18nKey,
  driverAvailabilityComplianceI18nKey,
  isVehicleComplianceBlockedCode,
  isVehicleComplianceSoftCode,
  partnerForceOnlineComplianceI18nKey,
} from './vehicleComplianceGateMessages'

describe('vehicleComplianceGateMessages', () => {
  it('recognises blocked PF3D codes', () => {
    expect(isVehicleComplianceBlockedCode('no_active_vehicle')).toBe(true)
    expect(isVehicleComplianceBlockedCode('vehicle_documents_blocked')).toBe(true)
    expect(isVehicleComplianceBlockedCode('unknown_vehicle_compliance')).toBe(true)
    expect(isVehicleComplianceBlockedCode('driver_has_active_trip')).toBe(false)
    expect(isVehicleComplianceBlockedCode(undefined)).toBe(false)
  })

  it('recognises soft codes without treating as blocked', () => {
    expect(isVehicleComplianceSoftCode('vehicle_compliance_warning')).toBe(true)
    expect(isVehicleComplianceSoftCode('vehicle_compliance_ok')).toBe(true)
    expect(isVehicleComplianceSoftCode('vehicle_compliance_gates_disabled')).toBe(true)
    expect(isVehicleComplianceBlockedCode('vehicle_compliance_warning')).toBe(false)
  })

  it('maps driver availability i18n keys', () => {
    expect(driverAvailabilityComplianceI18nKey('no_active_vehicle')).toBe(
      'availability.noActiveVehicle'
    )
    expect(driverAvailabilityComplianceI18nKey('vehicle_documents_blocked')).toBe(
      'availability.vehicleDocumentsBlocked'
    )
    expect(driverAvailabilityComplianceI18nKey('unknown_vehicle_compliance')).toBe(
      'availability.unknownVehicleCompliance'
    )
    expect(driverAvailabilityComplianceI18nKey('internal_error')).toBeNull()
  })

  it('maps partner force-online i18n keys', () => {
    expect(partnerForceOnlineComplianceI18nKey('no_active_vehicle')).toBe(
      'driverDetail.cannotOnlineNoActiveVehicle'
    )
    expect(partnerForceOnlineComplianceI18nKey('vehicle_documents_blocked')).toBe(
      'driverDetail.cannotOnlineVehicleDocumentsBlocked'
    )
    expect(partnerForceOnlineComplianceI18nKey(undefined)).toBeNull()
  })

  it('maps accept i18n keys', () => {
    expect(driverAcceptComplianceI18nKey('no_active_vehicle')).toBe(
      'actions.acceptBlockedNoActiveVehicle'
    )
    expect(driverAcceptComplianceI18nKey('offer_already_taken')).toBeNull()
  })
})
