import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
})
