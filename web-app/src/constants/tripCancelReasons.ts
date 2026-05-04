/** Opção «Outro» no <select>; texto livre vem de campo separado. */
export const TRIP_CANCEL_SELECT_OTHER = '__other__'

export const DRIVER_TRIP_CANCEL_PRESETS: { value: string; label: string }[] = [
  { value: '', label: 'Não indicar motivo' },
  { value: 'Passageiro não compareceu', label: 'Passageiro não compareceu' },
  { value: 'Imprevisto', label: 'Imprevisto' },
  { value: 'Problema com o veículo', label: 'Problema com o veículo' },
  { value: TRIP_CANCEL_SELECT_OTHER, label: 'Outro…' },
]

export const PASSENGER_TRIP_CANCEL_PRESETS: { value: string; label: string }[] = [
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
