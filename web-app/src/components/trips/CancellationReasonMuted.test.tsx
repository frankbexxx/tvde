import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CancellationReasonMuted } from './CancellationReasonMuted'

describe('CancellationReasonMuted', () => {
  it('renders nothing when reason is empty', () => {
    const { container } = render(<CancellationReasonMuted reason="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders trimmed reason', () => {
    render(<CancellationReasonMuted reason="  Alteração de planos  " />)
    expect(screen.getByTestId('trip-cancellation-reason')).toHaveTextContent('Alteração de planos')
  })
})
