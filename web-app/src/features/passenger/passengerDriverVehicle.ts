const IDENTITY_STATUSES = new Set(['assigned', 'accepted', 'arriving', 'ongoing', 'completed'])

function clean(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null
  return trimmed
}

export type PassengerDriverVehicleInput = {
  status: string
  driverName?: string | null
  vehiclePlate?: string | null
  vehicleMake?: string | null
  vehicleModel?: string | null
  vehicleColor?: string | null
  assignedFallback: string
}

/** Labels only. Does not read driver_id or invent missing vehicle fields. */
export function passengerDriverVehicleCopy(input: PassengerDriverVehicleInput): {
  driverName: string | null
  vehicleLabel: string | null
} {
  if (!IDENTITY_STATUSES.has(input.status)) {
    return { driverName: null, vehicleLabel: null }
  }
  const name = clean(input.driverName)
  const makeModel = [clean(input.vehicleMake), clean(input.vehicleModel)].filter(Boolean).join(' ')
  const vehicleLabel =
    [makeModel, clean(input.vehicleColor), clean(input.vehiclePlate)].filter(Boolean).join(' · ') ||
    null
  if (!name && !vehicleLabel && input.status === 'assigned') {
    return { driverName: null, vehicleLabel: null }
  }
  return {
    driverName: name ?? input.assignedFallback,
    vehicleLabel,
  }
}
