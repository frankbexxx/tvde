import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../../i18n'
import { RequestCard } from './RequestCard'

describe('RequestCard (RTL)', () => {
  it('mostra recolha, destino e ACEITAR; clique chama onAccept', () => {
    const onAccept = vi.fn()
    render(
      <RequestCard
        pickup="Rua A, Lisboa"
        destination="Rua B, Porto"
        statusLabel="Pedido disponível"
        estimatedPrice={12.5}
        onAccept={onAccept}
      />
    )
    expect(screen.getByText('Rua A, Lisboa')).toBeInTheDocument()
    expect(screen.getByText('Rua B, Porto')).toBeInTheDocument()
    const accept = screen.getByRole('button', { name: /aceitar/i })
    expect(accept).toBeInTheDocument()
    fireEvent.click(accept)
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('com offer_id em modo botão mostra Recusar e chama onReject', () => {
    const onAccept = vi.fn()
    const onReject = vi.fn()
    render(
      <RequestCard
        pickup="Rua A"
        estimatedPrice={10}
        offerId="off-1"
        onAccept={onAccept}
        onReject={onReject}
        acceptVariant="button"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /recusar/i }))
    expect(onReject).toHaveBeenCalledTimes(1)
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('modo slide mostra Recusar quando há onReject + offerId', () => {
    const onReject = vi.fn()
    render(
      <RequestCard
        pickup="Rua A"
        estimatedPrice={10}
        offerId="off-1"
        onAccept={() => { }}
        onReject={onReject}
        acceptVariant="slide"
        acceptButtonTestId="driver-accept-test"
        rejectButtonTestId="driver-reject-test"
      />
    )
    const reject = screen.getByRole('button', { name: /recusar/i })
    expect(reject).toBeInTheDocument()
    expect(screen.getByTestId('driver-reject-test')).toBeInTheDocument()
    fireEvent.click(reject)
    expect(onReject).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /aceitar com um toque/i })).not.toBeInTheDocument()
    const track = screen.getByTestId('driver-accept-test-track')
    expect(track).toBeInTheDocument()
    const pickup = screen.getByText('Rua A')
    expect(
      track.compareDocumentPosition(pickup) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('rejectLoading desactiva Recusar e Aceitar', () => {
    render(
      <RequestCard
        pickup="Rua A"
        estimatedPrice={10}
        offerId="off-1"
        onAccept={() => { }}
        onReject={() => { }}
        rejectLoading
        acceptVariant="button"
      />
    )
    expect(screen.getByRole('button', { name: /a processar/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /aceitar/i })).toBeDisabled()
  })

  it('Silenciar chama onDismiss e não chama onReject', () => {
    const onDismiss = vi.fn()
    const onReject = vi.fn()
    render(
      <RequestCard
        pickup="Rua A"
        estimatedPrice={10}
        offerId="off-1"
        onAccept={() => { }}
        onReject={onReject}
        onDismiss={onDismiss}
        dismissPlacement="bottom-right-silence"
        acceptVariant="slide"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /silenciar oferta/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onReject).not.toHaveBeenCalled()
  })

  it('sem onReject não mostra Recusar mesmo com offerId', () => {
    render(
      <RequestCard
        pickup="Rua A"
        estimatedPrice={10}
        offerId="off-1"
        onAccept={() => { }}
        acceptVariant="slide"
      />
    )
    expect(screen.queryByRole('button', { name: /recusar/i })).not.toBeInTheDocument()
  })
})
