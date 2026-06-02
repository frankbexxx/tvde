import i18n from '../i18n'

/** Opção «Outro» no <select>; texto livre vem de campo separado. */
export const TRIP_CANCEL_SELECT_OTHER = '__other__'

/** API values stay PT for v1 compatibility. */
const DRIVER_CANCEL_VALUES = {
  none: '',
  noShow: 'Passageiro não compareceu',
  unexpected: 'Imprevisto',
  vehicle: 'Problema com o veículo',
} as const

const PASSENGER_CANCEL_VALUES = {
  none: '',
  plans: 'Alteração de planos',
  slow: 'Motorista demora demasiado',
  mistake: 'Pedido por engano',
} as const

export function driverTripCancelPresets(): { value: string; label: string }[] {
  return [
    { value: DRIVER_CANCEL_VALUES.none, label: i18n.t('trip:cancelPreset.none') },
    { value: DRIVER_CANCEL_VALUES.noShow, label: i18n.t('trip:cancelPreset.driverNoShow') },
    { value: DRIVER_CANCEL_VALUES.unexpected, label: i18n.t('trip:cancelPreset.unexpected') },
    { value: DRIVER_CANCEL_VALUES.vehicle, label: i18n.t('trip:cancelPreset.vehicleIssue') },
    { value: TRIP_CANCEL_SELECT_OTHER, label: i18n.t('trip:cancelPreset.other') },
  ]
}

export function passengerTripCancelPresets(): { value: string; label: string }[] {
  return [
    { value: PASSENGER_CANCEL_VALUES.none, label: i18n.t('trip:cancelPreset.none') },
    { value: PASSENGER_CANCEL_VALUES.plans, label: i18n.t('trip:cancelPreset.passengerPlans') },
    { value: PASSENGER_CANCEL_VALUES.slow, label: i18n.t('trip:cancelPreset.driverSlow') },
    { value: PASSENGER_CANCEL_VALUES.mistake, label: i18n.t('trip:cancelPreset.mistake') },
    { value: TRIP_CANCEL_SELECT_OTHER, label: i18n.t('trip:cancelPreset.other') },
  ]
}

/** @deprecated Use driverTripCancelPresets() */
export const DRIVER_TRIP_CANCEL_PRESETS = [
  { value: '', label: 'Não indicar motivo' },
  { value: 'Passageiro não compareceu', label: 'Passageiro não compareceu' },
  { value: 'Imprevisto', label: 'Imprevisto' },
  { value: 'Problema com o veículo', label: 'Problema com o veículo' },
  { value: TRIP_CANCEL_SELECT_OTHER, label: 'Outro…' },
]

/** @deprecated Use passengerTripCancelPresets() */
export const PASSENGER_TRIP_CANCEL_PRESETS = [
  { value: '', label: 'Não indicar motivo' },
  { value: 'Alteração de planos', label: 'Alteração de planos' },
  { value: 'Motorista demora demasiado', label: 'Motorista demora demasiado' },
  { value: 'Pedido por engano', label: 'Pedido por engano' },
  { value: TRIP_CANCEL_SELECT_OTHER, label: 'Outro…' },
]

/** Corpo `reason` para a API (máx. 280 no backend). */
export function tripCancelReasonForApi(preset: string, otherDetail: string): string | null {
  const other = otherDetail.trim()
  if (preset === TRIP_CANCEL_SELECT_OTHER) {
    return other.length > 0 ? other.slice(0, 280) : 'Outro'
  }
  if (!preset) return null
  return preset.slice(0, 280)
}
