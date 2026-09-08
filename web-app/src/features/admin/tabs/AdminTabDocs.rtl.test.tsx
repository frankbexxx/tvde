import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminTabDocs } from './AdminTabDocs'
import type { AdminKycSupervisionResponse } from '../../../api/admin'

const snap: AdminKycSupervisionResponse = {
  subject: 'kyc_supervision',
  alerts: {
    drivers_with_expired_docs: 1,
    drivers_with_pending_or_rejected_docs: 1,
    vehicles_with_expired_docs: 0,
    vehicles_with_expiring_soon_docs: 1,
    vehicles_inactive: 1,
  },
  partners: [{ id: 'p1', name: 'Frota A' }],
  drivers: [
    {
      user_id: 'drv-1',
      driver_name: 'Ana Motorista',
      driver_phone: '+351900000001',
      partner_id: 'p1',
      partner_name: 'Frota A',
      driver_status: 'approved',
      documents: [
        {
          doc_key: 'carta_tvde',
          stored_status: 'approved',
          expires_at: '2020-01-01T00:00:00Z',
          computed_status: 'expired',
          is_expired: true,
          is_expiring_soon: false,
          has_file: true,
        },
        {
          doc_key: 'registo_criminal',
          stored_status: 'pending_review',
          expires_at: null,
          computed_status: 'pending_review',
          is_expired: false,
          is_expiring_soon: false,
          has_file: false,
        },
      ],
    },
  ],
  vehicles: [
    {
      vehicle_id: 'veh-1',
      plate: 'AA-11-BB',
      partner_id: 'p1',
      partner_name: 'Frota A',
      status: 'inactive',
      assigned_driver_user_id: 'drv-1',
      assigned_driver_name: 'Ana Motorista',
      worst_document_status: 'expiring_soon',
      documents: [
        {
          doc_key: 'vehicle_insurance',
          stored_status: 'approved',
          expires_at: '2026-09-15T00:00:00Z',
          computed_status: 'expiring_soon',
          is_expired: false,
          is_expiring_soon: true,
          has_file: true,
        },
      ],
    },
  ],
}

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ token: 'tok-admin' }),
}))

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()
  return {
    ...actual,
    useTranslation: () => ({ t: (k: string) => k }),
  }
})

const getAdminKycSupervision = vi.fn()

vi.mock('../../../api/admin', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin')>('../../../api/admin')
  return {
    ...actual,
    getAdminKycSupervision: (...args: unknown[]) => getAdminKycSupervision(...args),
  }
})

describe('AdminTabDocs KYC supervision (RTL)', () => {
  beforeEach(() => {
    getAdminKycSupervision.mockReset()
    getAdminKycSupervision.mockResolvedValue(snap)
  })

  it('render Drivers e Vehicles + alertas', async () => {
    render(<AdminTabDocs />)
    await waitFor(() => {
      expect(screen.getByTestId('admin-kyc-drivers-list')).toBeInTheDocument()
    })
    expect(screen.getByTestId('admin-kyc-driver-drv-1')).toHaveTextContent('Ana Motorista')
    expect(screen.getByTestId('admin-kyc-vehicle-veh-1')).toHaveTextContent('AA-11-BB')
    expect(screen.getByTestId('admin-kyc-alerts')).toBeInTheDocument()
    expect(getAdminKycSupervision).toHaveBeenCalledWith('tok-admin')
  })

  it('mostra expired e expiring soon e pending', async () => {
    render(<AdminTabDocs />)
    await waitFor(() => {
      expect(screen.getByText('expirado')).toBeInTheDocument()
    })
    expect(screen.getByText('a expirar')).toBeInTheDocument()
    expect(screen.getByText(/pending_review/)).toBeInTheDocument()
  })

  it('filtro só Vehicles esconde Drivers', async () => {
    render(<AdminTabDocs />)
    await waitFor(() => screen.getByTestId('admin-kyc-drivers-list'))
    fireEvent.change(screen.getByTestId('admin-kyc-filter-subject'), {
      target: { value: 'vehicle' },
    })
    expect(screen.queryByTestId('admin-kyc-drivers-list')).not.toBeInTheDocument()
    expect(screen.getByTestId('admin-kyc-vehicles-list')).toBeInTheDocument()
  })

  it('pesquisa por matrícula', async () => {
    render(<AdminTabDocs />)
    await waitFor(() => screen.getByTestId('admin-kyc-vehicle-veh-1'))
    fireEvent.change(screen.getByTestId('admin-kyc-search'), {
      target: { value: 'AA-11' },
    })
    expect(screen.getByTestId('admin-kyc-vehicle-veh-1')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('admin-kyc-search'), {
      target: { value: 'ZZZ-NOPE' },
    })
    expect(screen.queryByTestId('admin-kyc-vehicle-veh-1')).not.toBeInTheDocument()
  })

  it('filtro expired mostra driver com doc expirado', async () => {
    render(<AdminTabDocs />)
    await waitFor(() => screen.getByTestId('admin-kyc-driver-drv-1'))
    fireEvent.change(screen.getByTestId('admin-kyc-filter-doc-state'), {
      target: { value: 'expired' },
    })
    expect(screen.getByTestId('admin-kyc-driver-drv-1')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-kyc-vehicle-veh-1')).not.toBeInTheDocument()
  })

  it('sem botões approve/reject/upload', async () => {
    render(<AdminTabDocs />)
    await waitFor(() => screen.getByTestId('admin-kyc-supervision'))
    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /rejeitar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/módulo em implementação/i)).not.toBeInTheDocument()
  })

  it('erro é tratado', async () => {
    getAdminKycSupervision.mockRejectedValueOnce({ status: 500, detail: 'boom' })
    render(<AdminTabDocs />)
    await waitFor(() => {
      expect(screen.getByTestId('admin-kyc-error')).toBeInTheDocument()
    })
  })
})
