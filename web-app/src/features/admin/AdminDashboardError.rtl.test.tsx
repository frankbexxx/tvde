import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ErrorBanner } from '../../components/feedback/ErrorBanner'

describe('NAV-3D.2 Admin ErrorBanner (RTL)', () => {
  it('mostra mensagem, testId e botão de retry', () => {
    const onRetry = vi.fn()
    render(
      <ErrorBanner
        message="Erro ao carregar dados"
        role="alert"
        testId="admin-dashboard-error"
        action={
          <button type="button" data-testid="admin-dashboard-error-retry" onClick={onRetry}>
            Tentar novamente
          </button>
        }
      />
    )

    const banner = screen.getByTestId('admin-dashboard-error')
    expect(banner).toHaveAttribute('role', 'alert')
    expect(banner).toHaveTextContent('Erro ao carregar dados')

    const retry = screen.getByTestId('admin-dashboard-error-retry')
    expect(retry).toHaveTextContent('Tentar novamente')
    fireEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
