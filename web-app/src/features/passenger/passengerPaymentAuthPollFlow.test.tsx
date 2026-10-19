import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import type { TripDetailResponse } from '../../api/trips'
import {
  mergePassengerPolledWithPending,
  tripDetailFromCreateResponse,
} from '../../constants/tripStatus'
import {
  shouldShowPassengerPaymentAuthPrompt,
  shouldShowPassengerPaymentAuthSuccess,
} from './passengerPaymentIntentAuth'
import { PassengerTripPaymentAuthPanel } from './PassengerTripPaymentAuthPanel'

function baseTrip(over: Partial<TripDetailResponse> = {}): TripDetailResponse {
  return {
    trip_id: 't1',
    status: 'ongoing',
    passenger_id: 'p1',
    origin_lat: 38.7,
    origin_lng: -9.1,
    destination_lat: 38.8,
    destination_lng: -9.2,
    estimated_price: 10,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    payment_status: 'processing',
    ...over,
  }
}

function ActiveTripAuthFromPoll({
  polled,
  pending,
}: {
  polled: TripDetailResponse | null
  pending: TripDetailResponse | null
}) {
  const activeTrip = mergePassengerPolledWithPending(polled, pending, 't1')
  const showPanel =
    Boolean(activeTrip) &&
    (shouldShowPassengerPaymentAuthPrompt(activeTrip) ||
      shouldShowPassengerPaymentAuthSuccess(activeTrip, false))
  if (!showPanel || !activeTrip) {
    return <div data-testid="no-auth-panel" />
  }
  return (
    <PassengerTripPaymentAuthPanel
      trip={activeTrip}
      stripePromise={Promise.resolve(null)}
      onPollRefresh={() => undefined}
    />
  )
}

function wrap(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

describe('poll → merge → PassengerTripPaymentAuthPanel', () => {
  const pendingBootstrap = tripDetailFromCreateResponse(
    { trip_id: 't1', status: 'ongoing', estimated_price: 10, eta: 1 },
    { lat: 1, lng: 2 },
    { lat: 3, lng: 4 }
  )

  it('1→2→3: após poll requires_action o painel e CTA aparecem no mesmo merge', () => {
    const initialPoll = baseTrip({
      payment_status: 'processing',
      payment_intent_status: undefined,
      payment_intent_client_secret: undefined,
    })
    const { rerender } = wrap(
      <ActiveTripAuthFromPoll polled={initialPoll} pending={pendingBootstrap} />
    )
    expect(screen.getByTestId('no-auth-panel')).toBeInTheDocument()

    const afterScaPoll = baseTrip({
      payment_intent_status: 'requires_action',
      payment_intent_client_secret: 'pi_test_secret',
    })
    rerender(<ActiveTripAuthFromPoll polled={afterScaPoll} pending={pendingBootstrap} />)
    expect(screen.getByTestId('passenger-payment-auth-banner')).toBeInTheDocument()
    expect(screen.getByTestId('passenger-payment-auth-cta')).toHaveTextContent(/Autenticar pagamento/i)
    expect(document.body.textContent).not.toContain('pi_test_secret')
  })

  it('pending optimista ongoing + poll accepted com PI: overlay aplica requires_action', () => {
    const pending = baseTrip({ status: 'ongoing', payment_status: 'processing' })
    const polled = baseTrip({
      status: 'accepted',
      payment_intent_status: 'requires_action',
      payment_intent_client_secret: 'pi_test_secret',
    })
    wrap(<ActiveTripAuthFromPoll polled={polled} pending={pending} />)
    expect(screen.getByTestId('passenger-payment-auth-cta')).toBeInTheDocument()
  })

  it('requires_capture: painel de sucesso, sem CTA auth', () => {
    wrap(
      <ActiveTripAuthFromPoll
        polled={baseTrip({
          payment_intent_status: 'requires_capture',
          payment_intent_client_secret: null,
        })}
        pending={null}
      />
    )
    expect(screen.getByTestId('passenger-payment-auth-success')).toBeInTheDocument()
    expect(screen.queryByTestId('passenger-payment-auth-cta')).not.toBeInTheDocument()
  })

  it('succeeded: sem painel auth', () => {
    wrap(
      <ActiveTripAuthFromPoll
        polled={baseTrip({
          payment_intent_status: 'succeeded',
          payment_intent_client_secret: null,
        })}
        pending={null}
      />
    )
    expect(screen.getByTestId('no-auth-panel')).toBeInTheDocument()
  })

  it('refresh requires_action: CTA volta após estado intermédio', () => {
    const { rerender } = wrap(
      <ActiveTripAuthFromPoll
        polled={baseTrip({
          payment_intent_status: 'requires_capture',
          payment_intent_client_secret: null,
        })}
        pending={null}
      />
    )
    expect(screen.getByTestId('passenger-payment-auth-success')).toBeInTheDocument()

    rerender(
      <ActiveTripAuthFromPoll
        polled={baseTrip({
          payment_intent_status: 'requires_action',
          payment_intent_client_secret: 'pi_test_secret',
        })}
        pending={null}
      />
    )
    expect(screen.getByTestId('passenger-payment-auth-cta')).toBeInTheDocument()
  })
})
