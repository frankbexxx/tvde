/** Copy only. Does not decide whether cancel is allowed. */
const NO_FEE = new Set(['requested', 'assigned'])
const RECORDED_NOT_CHARGED = new Set(['accepted', 'arriving', 'ongoing'])

export function passengerCancelNoticeKey(
  status: string | null | undefined,
): 'cancelFlow.noFee' | 'cancelFlow.pilotFee' | null {
  if (status && NO_FEE.has(status)) return 'cancelFlow.noFee'
  if (status && RECORDED_NOT_CHARGED.has(status)) return 'cancelFlow.pilotFee'
  return null
}
