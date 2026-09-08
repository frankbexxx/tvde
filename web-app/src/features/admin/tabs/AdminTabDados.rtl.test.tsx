import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminTabDados, type AdminTabDadosProps } from './AdminTabDados'
import { driverStatusActionVisibility } from '../adminDashboardHelpers'

function baseProps(over: Partial<AdminTabDadosProps> = {}): AdminTabDadosProps {
  return {
    copy: vi.fn(),
    dataLoading: false,
    dataSearch: '',
    driverStatusFeedback: null,
    driverStatusLoading: null,
    driversList: [
      { user_id: 'drv-pending', partner_id: 'p1', status: 'pending' },
      { user_id: 'drv-approved', partner_id: 'p1', status: 'approved' },
      { user_id: 'drv-rejected', partner_id: 'p2', status: 'rejected' },
    ],
    fetchDataVisibility: vi.fn(),
    handleApproveDriver: vi.fn(),
    handleRejectDriver: vi.fn(),
    partners: [],
    setDataSearch: vi.fn(),
    users: [],
    ...over,
  }
}

describe('driverStatusActionVisibility', () => {
  it('pending: approve + reject', () => {
    expect(driverStatusActionVisibility('pending')).toEqual({
      canApprove: true,
      canReject: true,
    })
  })

  it('approved: só reject', () => {
    expect(driverStatusActionVisibility('approved')).toEqual({
      canApprove: false,
      canReject: true,
    })
  })

  it('rejected: só approve', () => {
    expect(driverStatusActionVisibility('rejected')).toEqual({
      canApprove: true,
      canReject: false,
    })
  })
})

describe('AdminTabDados driver approve/reject (RTL)', () => {
  it('pending mostra Aprovar e Rejeitar', () => {
    render(<AdminTabDados {...baseProps()} />)
    expect(screen.getByTestId('admin-driver-approve-drv-pending')).toBeInTheDocument()
    expect(screen.getByTestId('admin-driver-reject-drv-pending')).toBeInTheDocument()
  })

  it('approved não mostra Aprovar; mostra Rejeitar', () => {
    render(<AdminTabDados {...baseProps()} />)
    expect(screen.queryByTestId('admin-driver-approve-drv-approved')).not.toBeInTheDocument()
    expect(screen.getByTestId('admin-driver-reject-drv-approved')).toBeInTheDocument()
  })

  it('rejected não mostra Rejeitar; mostra Aprovar', () => {
    render(<AdminTabDados {...baseProps()} />)
    expect(screen.getByTestId('admin-driver-approve-drv-rejected')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-driver-reject-drv-rejected')).not.toBeInTheDocument()
  })

  it('Aprovar chama handler com driver id', async () => {
    const handleApproveDriver = vi.fn()
    render(<AdminTabDados {...baseProps({ handleApproveDriver })} />)
    fireEvent.click(screen.getByTestId('admin-driver-approve-drv-pending'))
    await waitFor(() => {
      expect(handleApproveDriver).toHaveBeenCalledWith('drv-pending')
    })
  })

  it('Rejeitar chama handler com driver id', async () => {
    const handleRejectDriver = vi.fn()
    render(<AdminTabDados {...baseProps({ handleRejectDriver })} />)
    fireEvent.click(screen.getByTestId('admin-driver-reject-drv-pending'))
    await waitFor(() => {
      expect(handleRejectDriver).toHaveBeenCalledWith('drv-pending')
    })
  })

  it('loading desactiva botões e mostra texto', () => {
    render(
      <AdminTabDados
        {...baseProps({
          driverStatusLoading: 'drv-pending',
        })}
      />
    )
    const approve = screen.getByTestId('admin-driver-approve-drv-pending')
    const reject = screen.getByTestId('admin-driver-reject-drv-pending')
    expect(approve).toBeDisabled()
    expect(reject).toBeDisabled()
    expect(approve).toHaveTextContent('A aprovar…')
    expect(screen.getByTestId('admin-driver-reject-drv-approved')).toBeDisabled()
  })

  it('sucesso mostra feedback e estado actualizado na lista', () => {
    render(
      <AdminTabDados
        {...baseProps({
          driverStatusFeedback: 'Motorista aprovado (approved).',
          driversList: [
            { user_id: 'drv-pending', partner_id: 'p1', status: 'approved' },
          ],
        })}
      />
    )
    expect(screen.getByTestId('admin-driver-status-ok')).toHaveTextContent(
      'Motorista aprovado (approved).'
    )
    expect(screen.getByTestId('admin-driver-status-drv-pending')).toHaveTextContent(
      'status: approved'
    )
    expect(screen.queryByTestId('admin-driver-approve-drv-pending')).not.toBeInTheDocument()
    expect(screen.getByTestId('admin-driver-reject-drv-pending')).toBeInTheDocument()
  })
})
