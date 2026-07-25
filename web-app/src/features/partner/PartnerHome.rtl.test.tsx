import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PartnerMetrics, PartnerVehicleRow } from '../../api/partner'
import i18n from '../../i18n'
import { PartnerHome } from './PartnerHome'
import { PartnerShellProvider } from './partnerShellContext'

const openMenu = vi.fn()

vi.mock('./partnerShellContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./partnerShellContext')>()
  return {
    ...actual,
    usePartnerShell: () => ({
      shellTab: 'home' as const,
      setShellTab: vi.fn(),
      menuOpen: false,
      setMenuOpen: vi.fn(),
      menuScreen: 'root' as const,
      setMenuScreen: vi.fn(),
      navigateMenu: vi.fn(),
      goBackMenu: vi.fn(),
      openMenu,
      closeMenu: vi.fn(),
      inboxUnreadCount: 0,
      setInboxUnreadCount: vi.fn(),
      menuRootHighlight: null,
    }),
  }
})

function vehicle(id: string, worst: string): PartnerVehicleRow {
  return {
    id,
    partner_id: 'p1',
    plate: id,
    plate_normalized: id,
    make: 'VW',
    model: 'Polo',
    year: 2021,
    color: null,
    service_categories: ['x'],
    status: 'active',
    created_at: '2026-07-24T00:00:00Z',
    updated_at: '2026-07-24T00:00:00Z',
    assigned_driver_id: null,
    assigned_driver_name: null,
    document_summary: {
      total_required: 4,
      present_count: worst === 'valid' ? 4 : 0,
      missing_count: worst === 'missing' ? 4 : 0,
      expired_count: worst === 'expired' ? 1 : 0,
      expiring_soon_count: 0,
      pending_review_count: 0,
      rejected_count: worst === 'rejected' ? 1 : 0,
      valid_count: worst === 'valid' ? 4 : 0,
      worst_status: worst,
    },
    vehicle_compliance: {
      compliance_status: worst === 'valid' ? 'compliant' : 'blocked',
      blocking_reasons: worst === 'valid' ? [] : ['missing_documents'],
      warning_reasons: [],
      worst_status: worst,
    },
  }
}

const workspace = vi.hoisted(() => {
  const metrics: PartnerMetrics = {
    trips_today: 1,
    trips_total: 10,
    active_drivers: 1,
    trips_completed: 8,
    trips_cancelled: 0,
    total_drivers: 2,
    trips_completed_today: 1,
    revenue_completed_today: 5,
  }
  return {
    metrics,
    trips: [] as [],
    drivers: [] as [],
    vehicles: [] as PartnerVehicleRow[],
    loading: false,
    error: null as string | null,
    load: vi.fn(),
    operationalAlertsSource: {
      drivers: [] as [],
      trips: [] as [],
      vehicles: [] as PartnerVehicleRow[],
    },
  }
})

vi.mock('./partnerWorkspace', () => ({
  usePartnerWorkspace: () => ({
    metrics: workspace.metrics,
    trips: workspace.trips,
    drivers: workspace.drivers,
    vehicles: workspace.vehicles,
    loading: workspace.loading,
    error: workspace.error,
    load: workspace.load,
    operationalAlertsSource: workspace.operationalAlertsSource,
  }),
}))

function renderHome() {
  return render(
    <MemoryRouter>
      <PartnerShellProvider>
        <PartnerHome />
      </PartnerShellProvider>
    </MemoryRouter>
  )
}

describe('PartnerHome document alerts (PF3C-3)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('pt')
    workspace.vehicles = []
    workspace.operationalAlertsSource = { drivers: [], trips: [], vehicles: [] }
    workspace.error = null
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('sem vehicles problemáticas → sem alerta documental; KPIs e empty trip OK', () => {
    workspace.vehicles = [vehicle('ok', 'valid')]
    workspace.operationalAlertsSource.vehicles = workspace.vehicles
    renderHome()
    expect(screen.queryByTestId('partner-alert-vehicle-documents')).toBeNull()
    expect(screen.getByTestId('partner-home-active-trip-empty')).toBeInTheDocument()
    expect(screen.getByTestId('partner-kpi-completed-today')).toBeInTheDocument()
  })

  it('vehicles vazio → Home não rebenta; sem alerta documental', () => {
    workspace.vehicles = []
    workspace.operationalAlertsSource.vehicles = []
    renderHome()
    expect(screen.getByText(/início/i)).toBeInTheDocument()
    expect(screen.queryByTestId('partner-alert-vehicle-documents')).toBeNull()
  })

  it('missing → alerta + CTA abre fleet_vehicles', () => {
    workspace.vehicles = [vehicle('m1', 'missing'), vehicle('m2', 'missing')]
    workspace.operationalAlertsSource.vehicles = workspace.vehicles
    renderHome()
    expect(screen.getByTestId('partner-alert-vehicle-documents')).toHaveTextContent(
      /2 viaturas com documentos em falta/i
    )
    expect(screen.getByTestId('partner-alert-cta-vehicle-documents')).toHaveTextContent(
      /ver viaturas/i
    )
    fireEvent.click(screen.getByTestId('partner-alert-cta-vehicle-documents'))
    expect(openMenu).toHaveBeenCalledWith('fleet_vehicles', 'fleet')
  })

  it('rejected domina missing no alerta agregado', () => {
    workspace.vehicles = [vehicle('r', 'rejected'), vehicle('m', 'missing')]
    workspace.operationalAlertsSource.vehicles = workspace.vehicles
    renderHome()
    expect(screen.getByTestId('partner-alert-vehicle-documents')).toHaveTextContent(
      /1 viatura com documentos rejeitados/i
    )
  })
})
