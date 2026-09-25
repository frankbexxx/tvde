import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../../i18n'
import { AppErrorBoundary } from './AppErrorBoundary'

const { captureException } = vi.hoisted(() => ({
  captureException: vi.fn(),
}))

vi.mock('@sentry/react', async () => {
  const React = await import('react')

  class ErrorBoundary extends React.Component<{
    children: ReactNode
    fallback: (props: { resetError: () => void }) => ReactNode
  }> {
    state = { error: null as Error | null }

    static getDerivedStateFromError(error: Error) {
      return { error }
    }

    componentDidCatch(error: Error) {
      captureException(error)
    }

    render() {
      if (this.state.error) {
        return this.props.fallback({
          resetError: () => this.setState({ error: null }),
        })
      }
      return this.props.children
    }
  }

  return {
    init: vi.fn(),
    captureException,
    ErrorBoundary,
  }
})

function Boom(): ReactNode {
  throw new Error('render boom phone +351900000000')
}

describe('AppErrorBoundary', () => {
  it('shows a generic fallback and sends the render error once', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    )
    expect(screen.getByTestId('app-error-boundary')).toHaveTextContent('Ocorreu um erro inesperado.')
    expect(screen.getByTestId('app-error-retry')).toBeInTheDocument()
    expect(screen.getByTestId('app-error-reload')).toBeInTheDocument()
    expect(screen.queryByText(/351900000000/)).toBeNull()
    expect(captureException).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
