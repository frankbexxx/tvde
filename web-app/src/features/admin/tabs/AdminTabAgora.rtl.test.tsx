import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminTabAgora } from './AdminTabAgora'

const baseProps = {
  activeTrips: [],
  adminAlerts: null,
  countHealthSignalRows: () => 0,
  health: null,
  metrics: null,
  pending: [],
  syncAdminUrl: vi.fn(),
}

describe('AdminTabAgora refresh feedback (RTL)', () => {
  it('mostra A atualizar… e depois Dados atualizados.', async () => {
    let resolve!: (v: 'ok' | 'error') => void
    const onRefresh = vi.fn(
      () =>
        new Promise<'ok' | 'error'>((r) => {
          resolve = r
        })
    )
    render(<AdminTabAgora {...baseProps} onRefresh={onRefresh} />)

    fireEvent.click(screen.getByTestId('admin-agora-refresh'))
    expect(screen.getByRole('button', { name: /a atualizar/i })).toBeDisabled()

    resolve('ok')
    await waitFor(() => {
      expect(screen.getByTestId('admin-agora-refresh-ok')).toHaveTextContent('Dados atualizados.')
    })
    expect(screen.getByTestId('admin-agora-refresh')).toBeEnabled()
  })

  it('mostra erro quando onRefresh devolve error', async () => {
    const onRefresh = vi.fn(async () => 'error' as const)
    render(<AdminTabAgora {...baseProps} onRefresh={onRefresh} />)

    fireEvent.click(screen.getByTestId('admin-agora-refresh'))
    await waitFor(() => {
      expect(screen.getByTestId('admin-agora-refresh-error')).toHaveTextContent(
        'Não foi possível atualizar.'
      )
    })
  })
})
