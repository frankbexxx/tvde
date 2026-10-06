import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { TripPlannerPanel } from './TripPlannerPanel'
import { PassengerPaymentStatusNotice } from './PassengerPaymentStatusNotice'
import { stripeElementsLocale } from './stripeLocale'

const api = vi.hoisted(() => ({
  listPaymentMethods: vi.fn(),
  createPaymentSetupIntent: vi.fn(),
}))

vi.mock('../../api/payments', async (orig) => {
  const actual = await orig<typeof import('../../api/payments')>()
  return {
    ...actual,
    listPaymentMethods: api.listPaymentMethods,
    createPaymentSetupIntent: api.createPaymentSetupIntent,
  }
})

import { PassengerPaymentMethodsPanel } from './PassengerPaymentMethodsPanel'

function wrap(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

beforeEach(async () => {
  await i18n.changeLanguage('pt')
  api.listPaymentMethods.mockReset()
  api.createPaymentSetupIntent.mockReset()
})

describe('PassengerPaymentStatusNotice', () => {
  it('shows "Sem método de pagamento" with add-card CTA when no default', () => {
    const onAdd = vi.fn()
    wrap(<PassengerPaymentStatusNotice status="ready" hasDefault={false} onAddCard={onAdd} onRetry={vi.fn()} />)
    expect(screen.getByTestId('passenger-payment-status-notice')).toHaveTextContent('Sem método de pagamento')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar cartão' }))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('shows a visible error with retry when the check fails', () => {
    const onRetry = vi.fn()
    wrap(<PassengerPaymentStatusNotice status="error" hasDefault={false} onAddCard={vi.fn()} onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível verificar o método de pagamento.')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders nothing when a default card exists or while checking', () => {
    const { container, rerender } = wrap(
      <PassengerPaymentStatusNotice status="ready" hasDefault onAddCard={vi.fn()} onRetry={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
    rerender(
      <I18nextProvider i18n={i18n}>
        <PassengerPaymentStatusNotice status="loading" hasDefault={false} onAddCard={vi.fn()} onRetry={vi.fn()} />
      </I18nextProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('TripPlannerPanel confirming without card', () => {
  it('shows no-card state, add CTA, and the block reason inside the sticky CTA row', () => {
    wrap(
      <TripPlannerPanel
        uiState="confirming"
        hasPickup
        hasDropoff
        pickupAddress="Origem"
        dropoffAddress="Destino"
        pickupAddressLoading={false}
        dropoffAddressLoading={false}
        routeMeta={{ durationSec: 600, distanceM: 3200 }}
        routeMetaLoading={false}
        activeTrip={null}
        onChooseMap={() => undefined}
        onSetDestinationHint={() => undefined}
        onReset={() => undefined}
        onConfirmTrip={() => undefined}
        onPaymentMethods={() => undefined}
        paymentMethodLabel={null}
        confirmBlockedReason={i18n.t('passenger:payments.missingBlocked')}
      />,
    )
    expect(screen.getByTestId('passenger-confirm-payment-label')).toHaveTextContent('Sem método de pagamento')
    expect(screen.getByTestId('passenger-confirm-payment-label').className).not.toMatch(/truncate/)
    expect(screen.getByTestId('passenger-confirm-payment-action')).toHaveTextContent('Adicionar cartão')
    const row = screen.getByTestId('passenger-confirm-cta-row')
    expect(row).toContainElement(screen.getByTestId('passenger-confirm-blocked-hint'))
    expect(screen.getByTestId('passenger-confirm-trip-cta')).toBeDisabled()
  })

  it('shows the default card label with change CTA', () => {
    wrap(
      <TripPlannerPanel
        uiState="confirming"
        hasPickup
        hasDropoff
        pickupAddress="Origem"
        dropoffAddress="Destino"
        pickupAddressLoading={false}
        dropoffAddressLoading={false}
        routeMeta={{ durationSec: 600, distanceM: 3200 }}
        routeMetaLoading={false}
        activeTrip={null}
        onChooseMap={() => undefined}
        onSetDestinationHint={() => undefined}
        onReset={() => undefined}
        onConfirmTrip={() => undefined}
        onPaymentMethods={() => undefined}
        paymentMethodLabel="Visa •••• 4242"
      />,
    )
    expect(screen.getByTestId('passenger-confirm-payment-label')).toHaveTextContent('Visa •••• 4242')
    expect(screen.getByTestId('passenger-confirm-payment-action')).toHaveTextContent('Alterar')
    expect(screen.queryByTestId('passenger-confirm-blocked-hint')).toBeNull()
  })
})

describe('PassengerPaymentMethodsPanel', () => {
  it('shows loading immediately on "Adicionar cartão" and blocks repeat clicks', async () => {
    api.listPaymentMethods.mockResolvedValue([])
    api.createPaymentSetupIntent.mockReturnValue(new Promise(() => undefined))
    wrap(<PassengerPaymentMethodsPanel token="t" />)
    const add = await screen.findByRole('button', { name: 'Adicionar cartão' })
    fireEvent.click(add)
    const busy = await screen.findByTestId('passenger-payments-add')
    expect(busy).toHaveTextContent('A abrir formulário seguro…')
    expect(busy).toBeDisabled()
    fireEvent.click(busy)
    expect(api.createPaymentSetupIntent).toHaveBeenCalledTimes(1)
  })

  it('shows a visible error when the SetupIntent fails', async () => {
    api.listPaymentMethods.mockResolvedValue([])
    api.createPaymentSetupIntent.mockRejectedValue({ status: 502 })
    wrap(<PassengerPaymentMethodsPanel token="t" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar cartão' }))
    await waitFor(() =>
      expect(screen.getByTestId('passenger-payments-error')).toHaveTextContent(
        'Não foi possível adicionar o cartão.',
      ),
    )
  })

  it('shows load failure with retry instead of the empty state', async () => {
    api.listPaymentMethods.mockRejectedValue({ status: 500 })
    wrap(<PassengerPaymentMethodsPanel token="t" />)
    expect(await screen.findByTestId('passenger-payments-load-error')).toHaveTextContent(
      'Não foi possível carregar os métodos de pagamento.',
    )
    expect(screen.queryByText('Ainda sem cartão guardado.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})

describe('stripeElementsLocale', () => {
  it('maps app language to Stripe Elements locale', () => {
    expect(stripeElementsLocale('pt')).toBe('pt')
    expect(stripeElementsLocale('pt-PT')).toBe('pt')
    expect(stripeElementsLocale('en')).toBe('en')
    expect(stripeElementsLocale(undefined)).toBe('pt')
  })
})
