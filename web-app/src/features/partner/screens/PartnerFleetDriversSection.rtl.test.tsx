import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PartnerDriverRow } from '../../../api/partner'
import i18n from '../../../i18n'
import { PartnerFleetDriversSection } from './PartnerFleetDriversSection'

const onTrip: PartnerDriverRow = {
  user_id: 'drv-on',
  partner_id: 'p1',
  status: 'approved',
  is_available: false,
  user: { name: 'Em Serviço', phone: null },
  last_location: null,
  active_trip_id: 'trip-1',
  active_trip_status: 'ongoing',
  active_vehicle_id: 'veh-1',
  vehicle_plate: '12-AB-34',
  vehicle_make: 'Toyota',
  vehicle_model: 'Corolla',
}

const idle: PartnerDriverRow = {
  user_id: 'drv-idle',
  partner_id: 'p1',
  status: 'approved',
  is_available: true,
  user: { name: 'Livre', phone: null },
  last_location: null,
  active_trip_id: null,
  active_trip_status: null,
}

function renderSection(drivers: PartnerDriverRow[], filter: 'all' | 'on_trip' = 'all') {
  return render(
    <MemoryRouter>
      <PartnerFleetDriversSection
        filteredDrivers={drivers}
        driverFilter={filter}
        onDriverFilterChange={vi.fn()}
        loading={false}
      />
    </MemoryRouter>
  )
}

describe('PartnerFleetDriversSection (PARTNER-FLEET-1A / 2B / OPS-UX-1A)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
  })

  it('mostra badge Em viagem só para motorista com trip activa', () => {
    renderSection([onTrip, idle])
    const badges = screen.getAllByTestId('partner-driver-on-trip-badge')
    expect(badges).toHaveLength(1)
    expect(badges[0]).toHaveTextContent('Em viagem')
    expect(screen.getByText('Em Serviço')).toBeInTheDocument()
    expect(screen.getByText('Livre')).toBeInTheDocument()
  })

  it('mostra vehicle_plate sem quebrar badge Em viagem', () => {
    renderSection([onTrip, idle])
    const plates = screen.getAllByTestId('partner-driver-vehicle-plate')
    expect(plates).toHaveLength(1)
    expect(plates[0]).toHaveTextContent(/12-AB-34/)
    expect(plates[0]).toHaveTextContent(/Toyota Corolla/)
    expect(screen.getByTestId('partner-driver-on-trip-badge')).toHaveTextContent('Em viagem')
  })

  it('OPS-UX-1A: Ver viagem só com active_trip_id e aponta para trip detail', () => {
    renderSection([onTrip, idle])
    const links = screen.getAllByTestId('partner-driver-view-trip')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveTextContent(/ver viagem/i)
    expect(links[0]).toHaveAttribute('href', '/partner/trips/trip-1')

    const rows = screen.getAllByTestId('partner-fleet-driver-row')
    const idleRow = rows.find((row) => within(row).queryByText('Livre'))
    expect(idleRow).toBeTruthy()
    expect(within(idleRow!).queryByTestId('partner-driver-view-trip')).toBeNull()
  })

  it('OPS-UX-1A: filtro Em viagem mantém CTA e badge', () => {
    renderSection([onTrip], 'on_trip')
    expect(screen.getByTestId('partner-driver-on-trip-badge')).toHaveTextContent('Em viagem')
    expect(screen.getByTestId('partner-driver-view-trip')).toHaveAttribute(
      'href',
      '/partner/trips/trip-1'
    )
    expect(screen.getByTestId('partner-driver-vehicle-plate')).toHaveTextContent(/12-AB-34/)
  })

  it('mostra estado motorista e viagem em PT', () => {
    renderSection([onTrip, idle])
    const rows = screen.getAllByTestId('partner-fleet-driver-row')
    const onTripRow = rows.find((row) => within(row).queryByText('Em Serviço'))
    expect(onTripRow).toBeTruthy()
    expect(within(onTripRow!).getByText(/Estado:\s*Aprovado/)).toBeInTheDocument()
    expect(within(onTripRow!).getByText(/Em curso/)).toBeInTheDocument()
  })

  it('empty filter mostra hint', () => {
    renderSection([], 'on_trip')
    expect(screen.getByTestId('partner-fleet-drivers-empty')).toHaveTextContent(
      /sem motoristas neste filtro/i
    )
    expect(screen.getByTestId('partner-fleet-drivers-empty')).toHaveTextContent(
      /ajusta o filtro/i
    )
  })
})

