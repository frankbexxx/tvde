import type { ReactNode } from 'react'
import { Button } from '../ui/button'
import type { PaymentStatus } from '../../api/trips'
import { paymentStatusLabel } from '../../constants/tripStatusLabels'

export interface TripCompletedOverlayProps {
  paymentStatus?: PaymentStatus | null
  onContinue: () => void
  continueTestId?: string
  children?: ReactNode
}

/** G27 — overlay viagem concluída (motorista): pagamento + Continuar. */
export function TripCompletedOverlay({
  paymentStatus,
  onContinue,
  continueTestId = 'driver-trip-completed-continue',
  children,
}: TripCompletedOverlayProps) {
  const payLabel =
    paymentStatus && paymentStatus !== 'failed' ? paymentStatusLabel(paymentStatus) : null

  return (
    <div className="space-y-2" data-testid="trip-completed-overlay">
      {children}
      {paymentStatus === 'failed' ? (
        <p className="text-sm text-destructive text-center px-2">
          Pagamento do passageiro recusado. Segue as instruções da plataforma ou do suporte.
        </p>
      ) : null}
      {payLabel ? (
        <p className="text-sm text-foreground/80 text-center px-2">Pagamento do passageiro: {payLabel}</p>
      ) : null}
      {paymentStatus === 'processing' ? (
        <p className="text-xs text-foreground/70 text-center px-2 leading-snug">
          O pagamento pode ficar «a processar» uns instantes — aguarda a sincronização.
        </p>
      ) : null}
      <div className="flex justify-center pt-2">
        <Button type="button" className="min-h-11 px-6" data-testid={continueTestId} onClick={onContinue}>
          Continuar
        </Button>
      </div>
    </div>
  )
}
